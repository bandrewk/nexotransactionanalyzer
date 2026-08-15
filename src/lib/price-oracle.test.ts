import { describe, it, expect, vi, afterEach } from "vitest";
import {
  toDateKey,
  buildChartUrl,
  planChunks,
  fetchHistoricPrices,
  fetchHistoricFiatRates,
  buildPortfolioSeries,
  DEFILLAMA_MAX_SPAN,
} from "./price-oracle";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("toDateKey", () => {
  it("floors a unix timestamp to a UTC date key", () => {
    // 2021-04-23T02:43:39Z
    expect(toDateKey(1619145819)).toBe("2021-04-23");
  });

  it("keeps late-evening UTC timestamps on the same day", () => {
    // 2021-04-23T23:59:59Z
    expect(toDateKey(1619222399)).toBe("2021-04-23");
  });
});

describe("buildChartUrl", () => {
  it("prefixes ids, joins them, and never exceeds the span cap", () => {
    const url = buildChartUrl(["coingecko:bitcoin", "coingecko:nexo"], 1619136000, 500);
    expect(url).toContain("https://coins.llama.fi/chart/coingecko:bitcoin,coingecko:nexo");
    expect(url).toContain("start=1619136000");
    expect(url).toContain("span=500");
    expect(url).toContain("period=1d");
  });
});

describe("planChunks", () => {
  it("returns one chunk when the range fits in the span cap", () => {
    const chunks = planChunks("2024-01-01", "2024-03-01"); // 60 days
    expect(chunks).toHaveLength(1);
    expect(chunks[0].span).toBeLessThanOrEqual(DEFILLAMA_MAX_SPAN);
  });

  it("splits a multi-year range into contiguous chunks under the cap", () => {
    const chunks = planChunks("2021-01-01", "2026-01-01"); // ~1826 days
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.span).toBeGreaterThan(0);
      expect(c.span).toBeLessThanOrEqual(DEFILLAMA_MAX_SPAN);
    }
    // chunks must be ordered and non-overlapping
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].startUnix).toBeGreaterThan(chunks[i - 1].startUnix);
    }
    // first chunk starts at the range start
    expect(chunks[0].startUnix).toBe(Date.parse("2021-01-01T00:00:00Z") / 1000);
  });
});

describe("fetchHistoricPrices", () => {
  it("maps DefiLlama ids back to app symbols and floors timestamps to dates", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          coins: {
            "coingecko:bitcoin": {
              symbol: "BTC",
              confidence: 0.99,
              prices: [
                { timestamp: 1619145819, price: 51000 },
                { timestamp: 1619232219, price: 52000 },
              ],
            },
          },
        }),
      })
    );

    const result = await fetchHistoricPrices(
      [{ symbol: "BTC", coingeckoId: "bitcoin" }],
      "2021-04-23",
      "2021-04-24"
    );

    expect(result.prices.get("BTC")?.get("2021-04-23")).toBe(51000);
    expect(result.prices.get("BTC")?.get("2021-04-24")).toBe(52000);
    expect(result.unpricedSymbols).toEqual([]);
  });

  it("reports symbols the API omitted as unpriced rather than pricing them at zero", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          coins: {
            "coingecko:bitcoin": {
              symbol: "BTC",
              prices: [{ timestamp: 1619145819, price: 51000 }],
            },
            // "coingecko:madeupcoin" deliberately absent
          },
        }),
      })
    );

    const result = await fetchHistoricPrices(
      [
        { symbol: "BTC", coingeckoId: "bitcoin" },
        { symbol: "MADEUP", coingeckoId: "madeupcoin" },
      ],
      "2021-04-23",
      "2021-04-23"
    );

    expect(result.prices.has("BTC")).toBe(true);
    expect(result.unpricedSymbols).toEqual(["MADEUP"]);
  });

  it("reports every symbol as unpriced when the network fails outright", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const result = await fetchHistoricPrices(
      [{ symbol: "BTC", coingeckoId: "bitcoin" }],
      "2021-04-23",
      "2021-04-23"
    );

    expect(result.prices.size).toBe(0);
    expect(result.unpricedSymbols).toEqual(["BTC"]);
  });

  it("skips coins that have no coingecko id instead of requesting them", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ coins: {} }) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchHistoricPrices(
      [{ symbol: "WEIRD", coingeckoId: "" }],
      "2021-04-23",
      "2021-04-23"
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.unpricedSymbols).toEqual(["WEIRD"]);
  });
});

describe("buildPortfolioSeries", () => {
  const snapshots = new Map<string, Map<string, number>>([
    ["2024-01-01", new Map([["BTC", 2]])],
    ["2024-01-03", new Map([["BTC", 3]])],
  ]);

  it("values holdings at that day's price", () => {
    const prices: Map<string, Map<string, number>> = new Map([
      ["BTC", new Map([["2024-01-01", 100], ["2024-01-03", 200]])],
    ]);
    const series = buildPortfolioSeries(["2024-01-01", "2024-01-03"], snapshots, prices);
    expect(series).toEqual([
      { date: "2024-01-01", value: 200 },
      { date: "2024-01-03", value: 600 },
    ]);
  });

  it("carries the last known price forward across a gap", () => {
    const prices: Map<string, Map<string, number>> = new Map([
      ["BTC", new Map([["2024-01-01", 100]])], // no price on the 3rd
    ]);
    const series = buildPortfolioSeries(["2024-01-01", "2024-01-03"], snapshots, prices);
    expect(series[1]).toEqual({ date: "2024-01-03", value: 300 });
  });

  it("omits a day entirely when a held asset has no price at all", () => {
    // BTC is held but completely unpriced -> the day's total would be misleading
    const series = buildPortfolioSeries(["2024-01-01"], snapshots, new Map());
    expect(series).toEqual([]);
  });

  it("ignores dust balances below the 0.001 threshold", () => {
    const dust = new Map<string, Map<string, number>>([
      ["2024-01-01", new Map([["BTC", 2], ["DUST", 0.0000001]])],
    ]);
    const prices: Map<string, Map<string, number>> = new Map([
      ["BTC", new Map([["2024-01-01", 100]])],
    ]);
    const series = buildPortfolioSeries(["2024-01-01"], dust, prices);
    expect(series).toEqual([{ date: "2024-01-01", value: 200 }]);
  });

  it("downsamples to roughly maxPoints and always keeps the final date", () => {
    const many = new Map<string, Map<string, number>>();
    const dates: string[] = [];
    for (let i = 1; i <= 30; i++) {
      const d = `2024-01-${String(i).padStart(2, "0")}`;
      dates.push(d);
      many.set(d, new Map([["BTC", 1]]));
    }
    const priceMap = new Map<string, number>();
    for (const d of dates) priceMap.set(d, 10);
    const series = buildPortfolioSeries(dates, many, new Map([["BTC", priceMap]]), 10);
    // The final date is always retained so the chart ends at the latest data,
    // which can add one point beyond the sampling budget.
    expect(series.length).toBeLessThanOrEqual(11);
    expect(series[series.length - 1].date).toBe("2024-01-30");
  });
});

describe("fetchHistoricFiatRates", () => {
  it("prices USD at 1 for every day without calling the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchHistoricFiatRates(["USD"], "2024-01-01", "2024-01-03");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.prices.get("USD")?.get("2024-01-01")).toBe(1);
    expect(result.prices.get("USD")?.get("2024-01-03")).toBe(1);
    expect(result.unpricedSymbols).toEqual([]);
  });

  it("maps Frankfurter rates onto date keys", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          amount: 1.0,
          base: "EUR",
          rates: { "2024-01-01": { USD: 1.1 }, "2024-01-02": { USD: 1.2 } },
        }),
      })
    );

    const result = await fetchHistoricFiatRates(["EUR"], "2024-01-01", "2024-01-02");

    expect(result.prices.get("EUR")?.get("2024-01-01")).toBe(1.1);
    expect(result.prices.get("EUR")?.get("2024-01-02")).toBe(1.2);
    expect(result.unpricedSymbols).toEqual([]);
  });

  it("reports a fiat symbol as unpriced when Frankfurter fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const result = await fetchHistoricFiatRates(["EUR"], "2024-01-01", "2024-01-02");

    expect(result.prices.has("EUR")).toBe(false);
    expect(result.unpricedSymbols).toEqual(["EUR"]);
  });
});
