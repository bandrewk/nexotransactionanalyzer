import type { InterestPoint } from "../types";

/**
 * Roll daily interest buckets up into calendar months.
 *
 * Term-deposit maturities pay months of accrual on a single day, which makes a
 * daily view unreadable. Monthly buckets absorb those payouts into the period
 * they belong to without inventing a distribution across it.
 */
export function aggregateMonthly(points: InterestPoint[]): InterestPoint[] {
  const byMonth = new Map<string, InterestPoint>();

  for (const point of points) {
    const month = point.date.substring(0, 7);
    const bucket = byMonth.get(month);
    if (bucket) {
      bucket.regular += point.regular;
      bucket.fixedTerm += point.fixedTerm;
    } else {
      byMonth.set(month, { date: month, regular: point.regular, fixedTerm: point.fixedTerm });
    }
  }

  return [...byMonth.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Total interest across both series. */
export function totalInterest(points: InterestPoint[]): number {
  return points.reduce((sum, p) => sum + p.regular + p.fixedTerm, 0);
}
