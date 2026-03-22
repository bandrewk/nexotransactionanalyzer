import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { filterByDateRange } from "./date-filter";

const testData = [
  { date: "2025-01-15", value: 100 },
  { date: "2025-06-15", value: 200 },
  { date: "2025-09-15", value: 300 },
  { date: "2025-12-15", value: 400 },
  { date: "2026-01-15", value: 500 },
  { date: "2026-02-15", value: 600 },
  { date: "2026-03-15", value: 700 },
];

describe("filterByDateRange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-22"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns all data for ALL range", () => {
    expect(filterByDateRange(testData, "ALL")).toHaveLength(7);
  });

  it("filters to last 1 month", () => {
    const result = filterByDateRange(testData, "1M");
    expect(result.every((d) => d.date >= "2026-02-22")).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThan(7);
  });

  it("filters to last 3 months", () => {
    const result = filterByDateRange(testData, "3M");
    expect(result.every((d) => d.date >= "2025-12-22")).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(3);
  });

  it("filters to last 6 months", () => {
    const result = filterByDateRange(testData, "6M");
    expect(result.every((d) => d.date >= "2025-09-22")).toBe(true);
  });

  it("filters to last 1 year", () => {
    const result = filterByDateRange(testData, "1Y");
    expect(result.every((d) => d.date >= "2025-03-22")).toBe(true);
  });

  it("returns empty array when no data matches range", () => {
    const oldData = [{ date: "2020-01-01", value: 1 }];
    const result = filterByDateRange(oldData, "1M");
    expect(result).toHaveLength(0);
  });

  it("works with empty data", () => {
    expect(filterByDateRange([], "3M")).toHaveLength(0);
  });
});
