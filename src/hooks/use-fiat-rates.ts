import { useEffect, useRef } from "react";
import { useAppStore } from "../stores/app-store";

const PULL_RATE = 60_000;

export function useFiatRates() {
  const currencies = useAppStore((s) => s.currencies);
  const updateFiatRate = useAppStore((s) => s.updateFiatRate);
  const setFiatPriceFeedOk = useAppStore((s) => s.setFiatPriceFeedOk);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const hasEUR = currencies.some((c) => c.symbol === "EUR" && c.amount !== 0);
    const hasGBP = currencies.some((c) => c.symbol === "GBP" && c.amount !== 0);
    if (!hasEUR && !hasGBP) return;

    const fetchRates = async () => {
      try {
        if (hasEUR) {
          const res = await fetch("https://api.frankfurter.app/latest?from=EUR&to=USD");
          if (res.ok) {
            const data = await res.json();
            updateFiatRate("EUR", data.rates.USD);
          }
        }
        if (hasGBP) {
          const res = await fetch("https://api.frankfurter.app/latest?from=GBP&to=USD");
          if (res.ok) {
            const data = await res.json();
            updateFiatRate("GBP", data.rates.USD);
          }
        }
        setFiatPriceFeedOk(true);
      } catch {
        setFiatPriceFeedOk(false);
      }
    };

    fetchRates();
    intervalRef.current = setInterval(fetchRates, PULL_RATE);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [currencies.length]); // eslint-disable-line react-hooks/exhaustive-deps
}
