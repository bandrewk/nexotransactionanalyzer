import { describe, it, expect } from "vitest";
import { computeWeekPerformance } from "./performance";
import type { DateValueArray } from "../types";

const p = (date: string, value: number): DateValueArray => ({ date, value });

describe("computeWeekPerformance", () => {
  const today = "2024-03-15";

  it("computes change against the point nearest one week back", () => {
    const data = [p("2024-03-01", 100), p("2024-03-08", 200), p("2024-03-15", 250)];
    expect(computeWeekPerformance(data, today)).toEqual({ change: 50, pct: 25 });
  });

  it("returns null when the series ends well before today", () => {
    // Last point is months old: a "1W change" cannot be derived from it, and
    // the week-ago lookup would resolve to that same final point, yielding a
    // confident +0.00% that means nothing.
    const data = [p("2023-11-01", 100), p("2023-12-01", 200)];
    expect(computeWeekPerformance(data, today)).toBeNull();
  });

  it("returns null when the week-ago lookup lands on the final point", () => {
    const data = [p("2024-03-01", 100), p("2024-03-14", 200)];
    // 2024-03-08 is the target; the newest point at or before it is 03-01,
    // which is fine — but if the only candidate were the final point itself
    // the change would be a meaningless zero.
    const collapsed = [p("2024-03-14", 200)];
    expect(computeWeekPerformance(collapsed, today)).toBeNull();
    expect(computeWeekPerformance(data, today)).not.toBeNull();
  });

  it("returns null when no point is old enough to compare against", () => {
    const data = [p("2024-03-13", 100), p("2024-03-14", 150), p("2024-03-15", 200)];
    expect(computeWeekPerformance(data, today)).toBeNull();
  });

  it("returns null for a zero baseline rather than dividing by it", () => {
    const data = [p("2024-03-01", 0), p("2024-03-15", 100)];
    expect(computeWeekPerformance(data, today)).toBeNull();
  });

  it("returns null for fewer than two points", () => {
    expect(computeWeekPerformance([], today)).toBeNull();
    expect(computeWeekPerformance([p("2024-03-15", 100)], today)).toBeNull();
  });

  it("reports a loss with a negative change and percentage", () => {
    const data = [p("2024-03-05", 200), p("2024-03-15", 150)];
    expect(computeWeekPerformance(data, today)).toEqual({ change: -50, pct: -25 });
  });

  it("tolerates a last point a couple of days stale", () => {
    // Interest accrues daily for most users, but a weekend gap should not
    // blank the tile.
    const data = [p("2024-03-05", 100), p("2024-03-13", 110)];
    expect(computeWeekPerformance(data, today)).not.toBeNull();
  });
});
