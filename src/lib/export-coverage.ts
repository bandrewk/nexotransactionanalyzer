import type { Transaction } from "../types";

/**
 * How stale the newest transaction may be before the export is treated as
 * suspect. Most Nexo accounts accrue interest daily, so a file that stops
 * more than a month ago is far more likely to be a date-bounded export than
 * a genuinely dormant account.
 */
export const STALE_EXPORT_DAYS = 30;

const DAY_MS = 86400000;

export type ExportCoverage = {
  /** `YYYY-MM-DD` of the oldest transaction. */
  firstDate: string;
  /** `YYYY-MM-DD` of the newest transaction. */
  lastDate: string;
  count: number;
  /** Whole days between `lastDate` and today. */
  staleDays: number;
  /** The file stops long enough ago to suspect a bounded export. */
  isStale: boolean;
};

/**
 * Describe the span of history an export actually covers.
 *
 * Every balance in this app is a running sum over the whole file, which
 * silently assumes the file starts at account opening and ends today. A
 * date-bounded export breaks that assumption without breaking anything
 * visible: balances are then correct as of the cut-off and are priced at
 * today's prices, so assets sold after the cut-off still appear as holdings
 * and the total reads high. Nothing in the numbers reveals this, which is
 * why the covered range has to be stated outright.
 *
 * Returns `null` for an empty file, so the caller renders nothing rather
 * than an empty range.
 *
 * @param today `YYYY-MM-DD`, injected so this stays deterministic under test
 */
export function getExportCoverage(
  transactions: Transaction[],
  today: string
): ExportCoverage | null {
  let firstDate: string | undefined;
  let lastDate: string | undefined;
  let count = 0;

  for (const t of transactions) {
    const date = t.dateTime?.substring(0, 10);
    // A row with no usable date cannot narrow the range; counting it would
    // claim coverage the file does not have.
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    count++;
    if (firstDate === undefined || date < firstDate) firstDate = date;
    if (lastDate === undefined || date > lastDate) lastDate = date;
  }

  if (firstDate === undefined || lastDate === undefined) return null;

  const staleDays = Math.floor(
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${lastDate}T00:00:00Z`)) / DAY_MS
  );

  return {
    firstDate,
    lastDate,
    count,
    staleDays,
    isStale: staleDays > STALE_EXPORT_DAYS,
  };
}
