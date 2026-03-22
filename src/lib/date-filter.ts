type DateRange = "1M" | "3M" | "6M" | "1Y" | "ALL";

function getDateRangeStart(range: DateRange): string | null {
  if (range === "ALL") return null;
  const now = new Date();
  const months = { "1M": 1, "3M": 3, "6M": 6, "1Y": 12 }[range];
  now.setMonth(now.getMonth() - months);
  return now.toISOString().substring(0, 10);
}

export function filterByDateRange<T extends { date: string }>(
  data: T[],
  range: DateRange
): T[] {
  const start = getDateRangeStart(range);
  if (!start) return data;
  return data.filter((d) => d.date >= start);
}

export type { DateRange };
