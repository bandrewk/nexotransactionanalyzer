import { describe, it, expect } from "vitest";
import { aggregateMonthly, totalInterest } from "./interest-series";
import type { InterestPoint } from "../types";

const p = (date: string, regular: number, fixedTerm: number): InterestPoint => ({
  date,
  regular,
  fixedTerm,
});

describe("aggregateMonthly", () => {
  it("groups daily points into calendar months", () => {
    const points = [
      p("2024-01-05", 1, 0),
      p("2024-01-20", 2, 0),
      p("2024-02-03", 4, 0),
    ];
    expect(aggregateMonthly(points)).toEqual([
      { date: "2024-01", regular: 3, fixedTerm: 0 },
      { date: "2024-02", regular: 4, fixedTerm: 0 },
    ]);
  });

  it("keeps the two series separate while aggregating", () => {
    const points = [
      p("2024-01-05", 1, 0),
      p("2024-01-13", 0, 400),
      p("2024-01-20", 2, 0),
    ];
    expect(aggregateMonthly(points)).toEqual([
      { date: "2024-01", regular: 3, fixedTerm: 400 },
    ]);
  });

  it("returns months in chronological order regardless of input order", () => {
    const points = [p("2024-03-01", 1, 0), p("2024-01-01", 2, 0), p("2024-02-01", 3, 0)];
    expect(aggregateMonthly(points).map((x) => x.date)).toEqual([
      "2024-01",
      "2024-02",
      "2024-03",
    ]);
  });

  it("handles an empty series", () => {
    expect(aggregateMonthly([])).toEqual([]);
  });

  it("does not lose value when aggregating", () => {
    const points = [
      p("2024-01-05", 1.11, 0),
      p("2024-01-13", 0, 400.5),
      p("2024-02-20", 2.22, 33.3),
    ];
    const before = totalInterest(points);
    const after = totalInterest(aggregateMonthly(points));
    expect(after).toBeCloseTo(before, 10);
  });
});

describe("totalInterest", () => {
  it("sums both series", () => {
    expect(totalInterest([p("2024-01-01", 10, 5), p("2024-01-02", 1, 0)])).toBe(16);
  });

  it("is zero for an empty series", () => {
    expect(totalInterest([])).toBe(0);
  });
});
