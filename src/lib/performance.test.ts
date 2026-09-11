import { describe, it, expect } from "vitest";
import { computeWeekPerformance, MAX_LAST_POINT_AGE_DAYS } from "./performance";
import type { DateValueArray } from "../types";

const p = (date: string, value: number): DateValueArray => ({ date, value });

describe("computeWeekPerformance", () => {
  const today = "2024-03-15";

  it("computes change against the point nearest one week back", () => {
    const data = [p("2024-03-01", 100), p("2024-03-08", 200), p("2024-03-15", 250)];
    expect(computeWeekPerformance(data, today)).toEqual({
      available: true,
      change: 50,
      pct: 25,
    });
  });

  it("reports `stale` when the series ends well before today", () => {
    // Last point is months old: a "1W change" cannot be derived from it, and
    // the week-ago lookup would resolve to that same final point, yielding a
    // confident +0.00% that means nothing.
    const data = [p("2023-11-01", 100), p("2023-12-01", 200)];
    expect(computeWeekPerformance(data, today)).toEqual({
      available: false,
      reason: "stale",
    });
  });

  it("reports `no-baseline` when the week-ago lookup lands on the final point", () => {
    const data = [p("2024-03-01", 100), p("2024-03-14", 200)];
    // 2024-03-08 is the target; the newest point at or before it is 03-01,
    // which is fine — but if the only candidate were the final point itself
    // the change would be a meaningless zero.
    const collapsed = [p("2024-03-14", 200)];
    expect(computeWeekPerformance(collapsed, today).available).toBe(false);
    expect(computeWeekPerformance(data, today).available).toBe(true);
  });

  it("reports `no-baseline` when no point is old enough to compare against", () => {
    const data = [p("2024-03-13", 100), p("2024-03-14", 150), p("2024-03-15", 200)];
    expect(computeWeekPerformance(data, today)).toEqual({
      available: false,
      reason: "no-baseline",
    });
  });

  it("reports `zero-baseline` rather than dividing by it", () => {
    const data = [p("2024-03-01", 0), p("2024-03-15", 100)];
    expect(computeWeekPerformance(data, today)).toEqual({
      available: false,
      reason: "zero-baseline",
    });
  });

  it("reports `no-history` for fewer than two points", () => {
    expect(computeWeekPerformance([], today)).toEqual({
      available: false,
      reason: "no-history",
    });
    expect(computeWeekPerformance([p("2024-03-15", 100)], today)).toEqual({
      available: false,
      reason: "no-history",
    });
  });

  it("reports a loss with a negative change and percentage", () => {
    const data = [p("2024-03-05", 200), p("2024-03-15", 150)];
    expect(computeWeekPerformance(data, today)).toEqual({
      available: true,
      change: -50,
      pct: -25,
    });
  });

  it("tolerates a last point a couple of days stale", () => {
    // Interest accrues daily for most users, but a weekend gap should not
    // blank the tile.
    const data = [p("2024-03-05", 100), p("2024-03-13", 110)];
    expect(computeWeekPerformance(data, today).available).toBe(true);
  });

  it("turns stale exactly one day past the freshness window", () => {
    const data = [p("2024-03-01", 100), p("2024-03-11", 110)];
    const fresh = "2024-03-14";
    const stale = "2024-03-15";
    expect(computeWeekPerformance(data, fresh).available).toBe(true);
    expect(computeWeekPerformance(data, stale)).toEqual({
      available: false,
      reason: "stale",
    });
    expect(MAX_LAST_POINT_AGE_DAYS).toBe(3);
  });
});
