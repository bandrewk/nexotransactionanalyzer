import type { DateValueArray } from "../types";

/**
 * How stale the newest point may be and still stand in for "now".
 * Most accounts accrue interest daily, so a short gap is normal; beyond this
 * the series no longer describes the present and no week-over-week change can
 * honestly be derived from it.
 */
export const MAX_LAST_POINT_AGE_DAYS = 3;

const WEEK_DAYS = 7;
const DAY_MS = 86400000;

export type WeekPerformance = {
  change: number;
  pct: number;
};

/** Why a week-over-week change cannot be derived from the series. */
export type WeekUnavailableReason =
  | "no-history"
  | "stale"
  | "no-baseline"
  | "zero-baseline";

export type WeekPerformanceResult =
  | ({ available: true } & WeekPerformance)
  | { available: false; reason: WeekUnavailableReason };

function daysBetween(fromDate: string, toDate: string): number {
  return (
    (Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / DAY_MS
  );
}

/**
 * Week-over-week change of the portfolio series.
 *
 * Reports why the comparison is unavailable rather than only that it is, so the
 * caller can say which of the four cases it hit. This matters more than it looks:
 * the series is keyed by transaction dates, so for anyone who has not
 * transacted recently the week-ago lookup collapses onto the final point and
 * produces a confident "+0.00%" that actually means "we don't know".
 *
 * @param today `YYYY-MM-DD`, injected so this stays deterministic under test
 */
export function computeWeekPerformance(
  data: DateValueArray[],
  today: string
): WeekPerformanceResult {
  if (data.length < 2) return { available: false, reason: "no-history" };

  const last = data[data.length - 1];
  if (daysBetween(last.date, today) > MAX_LAST_POINT_AGE_DAYS) {
    return { available: false, reason: "stale" };
  }

  const targetMs = Date.parse(`${today}T00:00:00Z`) - WEEK_DAYS * DAY_MS;
  const target = new Date(targetMs).toISOString().substring(0, 10);

  let baseline: DateValueArray | null = null;
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].date <= target) {
      baseline = data[i];
      break;
    }
  }

  // No point old enough, or the only candidate is the point we are comparing
  // against itself — either way there is no week of separation to report.
  if (baseline === null || baseline === last) {
    return { available: false, reason: "no-baseline" };
  }
  if (baseline.value === 0) return { available: false, reason: "zero-baseline" };

  const change = last.value - baseline.value;
  return { available: true, change, pct: (change / baseline.value) * 100 };
}
