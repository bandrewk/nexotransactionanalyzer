import { useEffect, useRef } from "react";
import { useAppStore } from "../stores/app-store";

const PULL_RATE = 60_000; // 60 seconds

function buildCoinGeckoUrl(ids: string[]): string {
  return `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd`;
}

export function usePriceFeed() {
  const currencies = useAppStore((s) => s.currencies);
  const updatePrices = useAppStore((s) => s.updatePrices);
  const setPriceFeedOk = useAppStore((s) => s.setPriceFeedOk);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const cryptos = currencies.filter(
      (c) => c.type === "crypto" && c.coingeckoId && c.amount !== 0
    );
    if (cryptos.length === 0) return;

    const ids = cryptos.map((c) => c.coingeckoId);

    const fetchPrices = async () => {
      try {
        const res = await fetch(buildCoinGeckoUrl(ids));
        if (!res.ok) throw new Error(`CoinGecko: ${res.status}`);
        const data = await res.json();

        const updates: { symbol: string; usdPrice: number }[] = [];
        for (const c of cryptos) {
          const price = data[c.coingeckoId]?.usd;
          if (price !== undefined) {
            updates.push({ symbol: c.coingeckoId, usdPrice: price });
          }
        }
        updatePrices(updates);
      } catch {
        setPriceFeedOk(false);
      }
    };

    fetchPrices();
    intervalRef.current = setInterval(fetchPrices, PULL_RATE);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [currencies.length]); // eslint-disable-line react-hooks/exhaustive-deps
}
