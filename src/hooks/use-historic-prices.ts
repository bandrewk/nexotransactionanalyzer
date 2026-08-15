import { useEffect, useRef } from "react";
import { useAppStore } from "../stores/app-store";
import {
  fetchHistoricPrices,
  fetchHistoricFiatRates,
  buildPortfolioSeries,
} from "../lib/price-oracle";

const DUST_THRESHOLD = 0.001;

export function useHistoricPrices() {
  const dailySnapshots = useAppStore((s) => s.dailySnapshots);
  const currencies = useAppStore((s) => s.currencies);
  const setHistoricPortfolioData = useAppStore((s) => s.setHistoricPortfolioData);
  const fetched = useRef(false);

  useEffect(() => {
    if (dailySnapshots.size === 0 || fetched.current) return;
    fetched.current = true;

    const compute = async () => {
      // Every symbol ever held with a non-dust balance.
      const held = new Set<string>();
      dailySnapshots.forEach((balances) => {
        balances.forEach((amount, symbol) => {
          if (Math.abs(amount) >= DUST_THRESHOLD) held.add(symbol);
        });
      });

      const dates = [...dailySnapshots.keys()].sort();
      if (dates.length === 0) return;

      const heldCurrencies = [...held]
        .map((symbol) => currencies.find((c) => c.symbol === symbol))
        .filter((c): c is NonNullable<typeof c> => Boolean(c));

      // Crypto goes to DefiLlama; fiat has no coingecko id and goes to Frankfurter.
      const cryptoCoins = heldCurrencies
        .filter((c) => c.type !== "fiat")
        .map((c) => ({ symbol: c.symbol, coingeckoId: c.coingeckoId }));
      const fiatSymbols = heldCurrencies.filter((c) => c.type === "fiat").map((c) => c.symbol);

      const start = dates[0];
      const end = dates[dates.length - 1];

      const [crypto, fiat] = await Promise.all([
        fetchHistoricPrices(cryptoCoins, start, end),
        fetchHistoricFiatRates(fiatSymbols, start, end),
      ]);

      const prices = crypto.prices;
      fiat.prices.forEach((byDate, symbol) => prices.set(symbol, byDate));

      const unpricedSymbols = [...crypto.unpricedSymbols, ...fiat.unpricedSymbols].sort();

      const { series, gapSymbols } = buildPortfolioSeries(dates, dailySnapshots, prices);
      setHistoricPortfolioData(series, unpricedSymbols, gapSymbols);
    };

    compute();
  }, [dailySnapshots, currencies, setHistoricPortfolioData]);
}
