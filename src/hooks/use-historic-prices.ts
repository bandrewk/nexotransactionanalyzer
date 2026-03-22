import { useEffect, useRef } from "react";
import { useAppStore } from "../stores/app-store";
import type { DateValueArray } from "../types";

const DELAY_MS = 300; // Delay between API calls to avoid rate limiting

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function useHistoricPrices() {
  const dailySnapshots = useAppStore((s) => s.dailySnapshots);
  const currencies = useAppStore((s) => s.currencies);
  const setHistoricPortfolioData = useAppStore((s) => s.setHistoricPortfolioData);
  const fetched = useRef(false);

  useEffect(() => {
    if (dailySnapshots.size === 0 || fetched.current) return;
    fetched.current = true;

    const compute = async () => {
      // Find all crypto symbols with non-zero balances in snapshots
      const allSymbols = new Set<string>();
      dailySnapshots.forEach((balances) => {
        balances.forEach((amount, symbol) => {
          if (Math.abs(amount) >= 0.001) allSymbols.add(symbol);
        });
      });

      const dates = [...dailySnapshots.keys()].sort();
      if (dates.length === 0) return;

      const startDate = dates[0];
      const endDate = dates[dates.length - 1];
      const start = new Date(startDate);
      const end = new Date(endDate);
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / 86400000);

      // Fetch historic prices for each crypto symbol
      const historicPrices = new Map<string, Map<string, number>>();

      const cryptoSymbols = [...allSymbols].filter((s) => {
        const cur = currencies.find((c) => c.symbol === s);
        return cur && cur.type === "crypto";
      });

      const fiatSymbols = [...allSymbols].filter((s) => {
        const cur = currencies.find((c) => c.symbol === s);
        return cur && cur.type === "fiat";
      });

      // Crypto: CryptoCompare
      for (const symbol of cryptoSymbols) {
        try {
          const toTs = Math.floor(end.getTime() / 1000);
          const url = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=USD&limit=${totalDays}&toTs=${toTs}`;
          const res = await fetch(url);
          if (!res.ok) continue;
          const data = await res.json();
          const priceMap = new Map<string, number>();
          for (const entry of data.Data?.Data ?? []) {
            const date = new Date(entry.time * 1000).toISOString().substring(0, 10);
            priceMap.set(date, entry.close);
          }
          historicPrices.set(symbol, priceMap);
          await sleep(DELAY_MS);
        } catch {
          // Skip failed fetches
        }
      }

      // Fiat: frankfurter.app
      for (const symbol of fiatSymbols) {
        if (symbol === "USD") {
          const priceMap = new Map<string, number>();
          for (const date of dates) priceMap.set(date, 1);
          historicPrices.set("USD", priceMap);
          continue;
        }
        try {
          const url = `https://api.frankfurter.app/${startDate}..${endDate}?from=${symbol}&to=USD`;
          const res = await fetch(url);
          if (!res.ok) continue;
          const data = await res.json();
          const priceMap = new Map<string, number>();
          for (const [date, rates] of Object.entries(data.rates ?? {})) {
            priceMap.set(date, (rates as Record<string, number>).USD);
          }
          historicPrices.set(symbol, priceMap);
        } catch {
          // Skip
        }
      }

      // Compute daily portfolio values
      const portfolioValues: DateValueArray[] = [];
      let lastBalances = new Map<string, number>();
      const sampleInterval = Math.max(1, Math.floor(dates.length / 500));

      for (let i = 0; i < dates.length; i++) {
        const date = dates[i];
        if (dailySnapshots.has(date)) {
          lastBalances = dailySnapshots.get(date)!;
        }

        if (i % sampleInterval !== 0 && i !== dates.length - 1) continue;

        let totalValue = 0;
        lastBalances.forEach((amount, symbol) => {
          if (Math.abs(amount) < 0.001) return;
          const priceMap = historicPrices.get(symbol);
          if (!priceMap) return;

          let price = priceMap.get(date);
          if (price === undefined) {
            // Find nearest earlier price
            const priceDates = [...priceMap.keys()].sort();
            for (let j = priceDates.length - 1; j >= 0; j--) {
              if (priceDates[j] <= date) {
                price = priceMap.get(priceDates[j]);
                break;
              }
            }
          }
          if (price !== undefined) {
            totalValue += amount * price;
          }
        });

        portfolioValues.push({
          date,
          value: parseFloat(totalValue.toFixed(2)),
        });
      }

      setHistoricPortfolioData(portfolioValues);
    };

    compute();
  }, [dailySnapshots, currencies, setHistoricPortfolioData]);
}
