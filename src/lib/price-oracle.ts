import type { DateValueArray } from "../types";

/**
 * DefiLlama caps a request at 500 data points, counted as numCoins × span.
 * Requesting one coin per request therefore allows a span of 500.
 */
export const DEFILLAMA_MAX_POINTS = 500;

const CHART_BASE = "https://coins.llama.fi/chart";
const CURRENT_BASE = "https://coins.llama.fi/prices/current";
const FRANKFURTER_BASE = "https://api.frankfurter.dev/v1";
const DAY_SECONDS = 86400;
const DUST_THRESHOLD = 0.001;

/** Max number of in-flight DefiLlama requests at once. */
const REQUEST_CONCURRENCY = 5;

/**
 * How long a price may be carried forward before a day is treated as unpriced.
 * Frankfurter publishes business days only, so weekend + holiday runs of up to
 * 4 days are normal and must survive; beyond a week means real missing coverage.
 */
const MAX_CARRY_FORWARD_DAYS = 7;

/** symbol -> (YYYY-MM-DD -> USD price) */
export type PriceMap = Map<string, Map<string, number>>;

export type HistoricPriceResult = {
  prices: PriceMap;
  /** Symbols the app holds but could not price. Never silently valued at 0. */
  unpricedSymbols: string[];
};

type OracleCoin = { symbol: string; coingeckoId: string };

/** Floor a unix timestamp (seconds) to its UTC calendar date. */
export function toDateKey(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().substring(0, 10);
}

export function buildChartUrl(coinKeys: string[], startUnix: number, span: number): string {
  const capped = Math.min(span, DEFILLAMA_MAX_POINTS);
  return `${CHART_BASE}/${coinKeys.join(",")}?start=${startUnix}&span=${capped}&period=1d`;
}

/**
 * Split a date range into consecutive windows that each fit under the point
 * budget for a SINGLE coin (span × 1 coin ≤ DEFILLAMA_MAX_POINTS).
 */
export function planChunks(
  startDate: string,
  endDate: string
): { startUnix: number; span: number }[] {
  const startUnix = Math.floor(Date.parse(`${startDate}T00:00:00Z`) / 1000);
  const endUnix = Math.floor(Date.parse(`${endDate}T00:00:00Z`) / 1000);
  const totalDays = Math.max(1, Math.round((endUnix - startUnix) / DAY_SECONDS) + 1);

  const chunks: { startUnix: number; span: number }[] = [];
  let cursor = startUnix;
  let remaining = totalDays;
  while (remaining > 0) {
    const span = Math.min(remaining, DEFILLAMA_MAX_POINTS);
    chunks.push({ startUnix: cursor, span });
    cursor += span * DAY_SECONDS;
    remaining -= span;
  }
  return chunks;
}

/**
 * Fetch daily USD closes for the given coins from DefiLlama.
 * Coins are addressed as `coingecko:<id>`, which is exactly what currencies.ts stores.
 * Symbols that cannot be priced are reported, never defaulted to zero.
 *
 * DefiLlama's 500-point budget is numCoins × span, not span alone, so each
 * request names exactly one coin; time chunks come from planChunks. Requests
 * run with bounded concurrency rather than one at a time or all at once.
 */
export async function fetchHistoricPrices(
  coins: OracleCoin[],
  startDate: string,
  endDate: string
): Promise<HistoricPriceResult> {
  const prices: PriceMap = new Map();

  const priceable = coins.filter((c) => c.coingeckoId);
  const unpriceable = coins.filter((c) => !c.coingeckoId).map((c) => c.symbol);
  if (priceable.length === 0) {
    return { prices, unpricedSymbols: [...unpriceable].sort() };
  }

  // DefiLlama keys the response by the id we asked for, so keep a reverse index.
  const keyToSymbol = new Map<string, string>();
  for (const c of priceable) keyToSymbol.set(`coingecko:${c.coingeckoId}`, c.symbol);

  const chunks = planChunks(startDate, endDate);
  const requests: { coinKey: string; startUnix: number; span: number }[] = [];
  for (const c of priceable) {
    const coinKey = `coingecko:${c.coingeckoId}`;
    for (const chunk of chunks) {
      requests.push({ coinKey, startUnix: chunk.startUnix, span: chunk.span });
    }
  }

  for (let i = 0; i < requests.length; i += REQUEST_CONCURRENCY) {
    const slice = requests.slice(i, i + REQUEST_CONCURRENCY);
    await Promise.all(
      slice.map(async (req) => {
        try {
          const res = await fetch(buildChartUrl([req.coinKey], req.startUnix, req.span));
          if (!res.ok) return;
          const data = await res.json();
          const coinsPayload = data?.coins;
          if (!coinsPayload) return;

          for (const [key, entry] of Object.entries(coinsPayload)) {
            const symbol = keyToSymbol.get(key);
            if (!symbol) continue;
            const points = (entry as { prices?: { timestamp: number; price: number }[] }).prices ?? [];
            let byDate = prices.get(symbol);
            if (!byDate) {
              byDate = new Map<string, number>();
              prices.set(symbol, byDate);
            }
            for (const p of points) byDate.set(toDateKey(p.timestamp), p.price);
          }
        } catch {
          // A failed request leaves a gap; buildPortfolioSeries caps carry-forward
          // staleness. Total failure surfaces below as unpricedSymbols.
        }
      })
    );
  }

  const unpricedSymbols = [
    ...unpriceable,
    ...priceable.filter((c) => !prices.has(c.symbol) || prices.get(c.symbol)!.size === 0).map((c) => c.symbol),
  ].sort();

  for (const symbol of unpricedSymbols) prices.delete(symbol);

  return { prices, unpricedSymbols };
}

/**
 * Fetch historic USD rates for fiat holdings from Frankfurter.
 * Fiat entries in currencies.ts carry no coingecko id, so they cannot go through
 * DefiLlama; routing them there would wrongly report them as unpriced.
 * Frankfurter returns business days only — buildPortfolioSeries carries the last
 * known rate across weekends and holidays.
 */
export async function fetchHistoricFiatRates(
  symbols: string[],
  startDate: string,
  endDate: string
): Promise<HistoricPriceResult> {
  const prices: PriceMap = new Map();
  const unpricedSymbols: string[] = [];

  for (const symbol of symbols) {
    if (symbol === "USD") {
      // USD is the unit of account; no lookup needed.
      const usd = new Map<string, number>();
      let cursor = Date.parse(`${startDate}T00:00:00Z`);
      const end = Date.parse(`${endDate}T00:00:00Z`);
      while (cursor <= end) {
        usd.set(new Date(cursor).toISOString().substring(0, 10), 1);
        cursor += DAY_SECONDS * 1000;
      }
      prices.set("USD", usd);
      continue;
    }

    try {
      const res = await fetch(
        `${FRANKFURTER_BASE}/${startDate}..${endDate}?from=${symbol}&to=USD`
      );
      if (!res.ok) throw new Error(`Frankfurter: ${res.status}`);
      const data = await res.json();
      const byDate = new Map<string, number>();
      for (const [date, rates] of Object.entries(data?.rates ?? {})) {
        const usd = (rates as Record<string, number>).USD;
        if (typeof usd === "number") byDate.set(date, usd);
      }
      if (byDate.size === 0) throw new Error("Frankfurter: no rates");
      prices.set(symbol, byDate);
    } catch {
      unpricedSymbols.push(symbol);
    }
  }

  return { prices, unpricedSymbols: unpricedSymbols.sort() };
}

/** Fetch current USD prices keyed by coingecko id. Used as a fallback for the live feed. */
export async function fetchCurrentPrices(
  coingeckoIds: string[]
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const ids = coingeckoIds.filter(Boolean);
  if (ids.length === 0) return out;

  const keys = ids.map((id) => `coingecko:${id}`);
  const res = await fetch(`${CURRENT_BASE}/${keys.join(",")}`);
  if (!res.ok) throw new Error(`DefiLlama: ${res.status}`);
  const data = await res.json();

  for (const [key, entry] of Object.entries(data?.coins ?? {})) {
    const id = key.replace(/^coingecko:/, "");
    const price = (entry as { price?: number }).price;
    if (typeof price === "number") out.set(id, price);
  }
  return out;
}

/**
 * Value each day's holdings. A date is omitted entirely when a non-dust holding
 * has no price — a partial total is worse than an absent point, because it
 * renders as a real, believable line.
 */
export function buildPortfolioSeries(
  dates: string[],
  snapshots: Map<string, Map<string, number>>,
  prices: PriceMap,
  maxPoints = 500
): DateValueArray[] {
  const series: DateValueArray[] = [];
  const sampleInterval = Math.max(1, Math.ceil(dates.length / maxPoints));
  let lastBalances = new Map<string, number>();

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const snapshot = snapshots.get(date);
    if (snapshot) lastBalances = snapshot;

    const isLast = i === dates.length - 1;
    if (i % sampleInterval !== 0 && !isLast) continue;

    let total = 0;
    let complete = true;

    lastBalances.forEach((amount, symbol) => {
      if (Math.abs(amount) < DUST_THRESHOLD) return;
      const byDate = prices.get(symbol);
      if (!byDate) {
        complete = false;
        return;
      }
      let price = byDate.get(date);
      if (price === undefined) {
        // Carry the most recent earlier close forward.
        let best: string | undefined;
        for (const d of byDate.keys()) {
          if (d <= date && (best === undefined || d > best)) best = d;
        }
        if (best !== undefined) {
          const staleDays =
            (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${best}T00:00:00Z`)) / (DAY_SECONDS * 1000);
          if (staleDays > MAX_CARRY_FORWARD_DAYS) best = undefined;
        }
        price = best === undefined ? undefined : byDate.get(best);
      }
      if (price === undefined) {
        complete = false;
        return;
      }
      total += amount * price;
    });

    if (!complete) continue;
    series.push({ date, value: parseFloat(total.toFixed(2)) });
  }

  return series;
}
