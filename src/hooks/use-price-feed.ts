import { useEffect, useRef } from "react";
import { useAppStore } from "../stores/app-store";
import { fetchCurrentPrices } from "../lib/price-oracle";

const PULL_RATE = 60_000; // 60 seconds
const MAX_BACKOFF = 8;    // cap at 8 missed polls (~8 minutes)

function buildCoinGeckoUrl(ids: string[]): string {
  return `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd`;
}

export function usePriceFeed() {
  const currencies = useAppStore((s) => s.currencies);
  const updatePrices = useAppStore((s) => s.updatePrices);
  const setPriceFeedOk = useAppStore((s) => s.setPriceFeedOk);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const backoffRef = useRef(0);
  const skipRef = useRef(0);

  useEffect(() => {
    const cryptos = currencies.filter(
      (c) => c.type === "crypto" && c.coingeckoId && c.amount !== 0
    );
    if (cryptos.length === 0) return;

    const ids = cryptos.map((c) => c.coingeckoId);

    /** CoinGecko first (primary source), DefiLlama as fallback when it rate-limits. */
    const fetchFromAnySource = async (): Promise<Map<string, number>> => {
      try {
        const res = await fetch(buildCoinGeckoUrl(ids));
        if (!res.ok) throw new Error(`CoinGecko: ${res.status}`);
        const data = await res.json();
        const out = new Map<string, number>();
        for (const id of ids) {
          const price = data[id]?.usd;
          if (typeof price === "number") out.set(id, price);
        }
        if (out.size === 0) throw new Error("CoinGecko: empty response");
        return out;
      } catch {
        // CoinGecko 429s have no CORS headers, so this lands here as a rejection.
        return fetchCurrentPrices(ids);
      }
    };

    const poll = async () => {
      // Honour backoff without tearing down the interval.
      if (skipRef.current > 0) {
        skipRef.current--;
        return;
      }
      try {
        const prices = await fetchFromAnySource();
        if (prices.size === 0) throw new Error("no prices");
        const updates = [...prices.entries()].map(([symbol, usdPrice]) => ({ symbol, usdPrice }));
        updatePrices(updates); // sets isPriceFeedOk = true
        backoffRef.current = 0;
      } catch {
        backoffRef.current = Math.min(backoffRef.current === 0 ? 1 : backoffRef.current * 2, MAX_BACKOFF);
        skipRef.current = backoffRef.current;
        setPriceFeedOk(false);
      }
    };

    poll();
    intervalRef.current = setInterval(poll, PULL_RATE);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [currencies.length]); // eslint-disable-line react-hooks/exhaustive-deps
}
