import { describe, it, expect } from "vitest";
import { getExportCoverage, STALE_EXPORT_DAYS } from "./export-coverage";
import type { Transaction } from "../types";

const tx = (dateTime: string): Transaction => ({
  id: "NXT1",
  type: "Interest",
  inputCurrency: "BTC",
  inputAmount: 1,
  outputCurrency: "BTC",
  outputAmount: 1,
  usdEquivalent: 1,
  fee: "-",
  feeCurrency: "-",
  details: "approved / BTC Interest Earned",
  dateTime,
});

describe("getExportCoverage", () => {
  const today = "2026-09-07";

  it("reports the full span and row count", () => {
    const data = [
      tx("2021-04-23 00:00:00"),
      tx("2024-01-15 12:30:00"),
      tx("2026-09-07 08:00:00"),
    ];
    expect(getExportCoverage(data, today)).toEqual({
      firstDate: "2021-04-23",
      lastDate: "2026-09-07",
      count: 3,
      staleDays: 0,
      isStale: false,
    });
  });

  it("does not depend on the file being sorted", () => {
    const sorted = [tx("2021-04-23 00:00:00"), tx("2026-09-07 00:00:00")];
    const shuffled = [tx("2026-09-07 00:00:00"), tx("2021-04-23 00:00:00")];
    expect(getExportCoverage(shuffled, today)).toEqual(getExportCoverage(sorted, today));
  });

  it("returns null for an empty file", () => {
    expect(getExportCoverage([], today)).toBeNull();
  });

  it("returns null when no row carries a usable date", () => {
    expect(getExportCoverage([tx(""), tx("not-a-date")], today)).toBeNull();
  });

  it("ignores unusable dates rather than letting them widen the range", () => {
    const data = [tx("2026-09-01 00:00:00"), tx("garbage"), tx("2026-09-05 00:00:00")];
    const result = getExportCoverage(data, today);
    expect(result).toMatchObject({ firstDate: "2026-09-01", lastDate: "2026-09-05", count: 2 });
  });

  // The case this whole module exists for: an export bounded to an earlier
  // date still produces confident balances, priced at today's prices, for
  // holdings that were disposed of after the cut-off.
  it("flags an export that stops well before today", () => {
    const result = getExportCoverage([tx("2021-04-23 00:00:00"), tx("2023-05-09 00:00:00")], today);
    expect(result?.isStale).toBe(true);
    expect(result?.staleDays).toBeGreaterThan(1000);
  });

  it("does not flag a file that merely ends a few days ago", () => {
    expect(getExportCoverage([tx("2026-09-04 00:00:00")], today)?.isStale).toBe(false);
  });

  it("treats the threshold as exclusive on both sides", () => {
    const atThreshold = getExportCoverage([tx("2026-08-08 00:00:00")], today);
    expect(atThreshold?.staleDays).toBe(STALE_EXPORT_DAYS);
    expect(atThreshold?.isStale).toBe(false);

    const past = getExportCoverage([tx("2026-08-07 00:00:00")], today);
    expect(past?.staleDays).toBe(STALE_EXPORT_DAYS + 1);
    expect(past?.isStale).toBe(true);
  });
});
