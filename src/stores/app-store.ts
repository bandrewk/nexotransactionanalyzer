import { create } from "zustand";
import type { Transaction, Currency, StatisticsState } from "../types";
import { parseCSV } from "../lib/csv-parser";
import { calculateBalances } from "../lib/balance-calculator";
import { saveTransactions, loadTransactions, clearSavedData, hasSavedData } from "../lib/storage";

interface AppState {
  // Data
  transactions: Transaction[];
  currencies: Currency[];
  statistics: StatisticsState;
  dailySnapshots: Map<string, Map<string, number>>;

  // Platform state
  isLoading: boolean;
  isPriceFeedOk: boolean;
  isFiatPriceFeedOk: boolean;
  hasData: boolean;

  // Actions
  loadCSV: (content: string) => void;
  loadFromStorage: () => boolean;
  updatePrices: (updates: { symbol: string; usdPrice: number }[]) => void;
  updateFiatRate: (symbol: string, rate: number) => void;
  setHistoricPortfolioData: (data: { date: string; value: number }[]) => void;
  setPriceFeedOk: (ok: boolean) => void;
  setFiatPriceFeedOk: (ok: boolean) => void;
  save: () => void;
  exit: () => void;
}

const emptyStatistics: StatisticsState = {
  interestData: [],
  depositAndWithdrawalData: [],
  historicPortfolioData: [],
  earnedInterestBreakdown: [],
};

export const useAppStore = create<AppState>((set, get) => ({
  transactions: [],
  currencies: [],
  statistics: emptyStatistics,
  dailySnapshots: new Map(),
  isLoading: false,
  isPriceFeedOk: false,
  isFiatPriceFeedOk: false,
  hasData: false,

  loadCSV: (content: string) => {
    set({ isLoading: true });
    const transactions = parseCSV(content);
    const result = calculateBalances(transactions);

    set({
      transactions,
      currencies: result.currencies,
      statistics: {
        interestData: result.interestData,
        depositAndWithdrawalData: result.depositAndWithdrawalData,
        historicPortfolioData: [],
        earnedInterestBreakdown: result.earnedInterestBreakdown,
      },
      dailySnapshots: result.dailySnapshots,
      isLoading: false,
      hasData: true,
    });
  },

  loadFromStorage: () => {
    if (!hasSavedData()) return false;
    const saved = loadTransactions();
    if (!saved || saved.length === 0) return false;

    set({ isLoading: true });
    const result = calculateBalances(saved);

    set({
      transactions: saved,
      currencies: result.currencies,
      statistics: {
        interestData: result.interestData,
        depositAndWithdrawalData: result.depositAndWithdrawalData,
        historicPortfolioData: [],
        earnedInterestBreakdown: result.earnedInterestBreakdown,
      },
      dailySnapshots: result.dailySnapshots,
      isLoading: false,
      hasData: true,
    });
    return true;
  },

  updatePrices: (updates) => {
    set((state) => {
      const currencies = state.currencies.map((c) => {
        const update = updates.find(
          (u) => u.symbol === c.coingeckoId || u.symbol === c.symbol
        );
        if (update) {
          return { ...c, usdEquivalent: c.amount * update.usdPrice };
        }
        return c;
      });
      return { currencies, isPriceFeedOk: true };
    });
  },

  updateFiatRate: (symbol: string, rate: number) => {
    set((state) => {
      const currencies = state.currencies.map((c) => {
        if (c.symbol === symbol) {
          return { ...c, usdEquivalent: c.amount * rate };
        }
        return c;
      });
      return { currencies, isFiatPriceFeedOk: true };
    });
  },

  setHistoricPortfolioData: (data) => {
    set((state) => ({
      statistics: { ...state.statistics, historicPortfolioData: data },
    }));
  },

  setPriceFeedOk: (ok) => set({ isPriceFeedOk: ok }),
  setFiatPriceFeedOk: (ok) => set({ isFiatPriceFeedOk: ok }),

  save: () => {
    const { transactions } = get();
    saveTransactions(transactions);
  },

  exit: () => {
    clearSavedData();
    set({
      transactions: [],
      currencies: [],
      statistics: emptyStatistics,
      dailySnapshots: new Map(),
      isLoading: false,
      isPriceFeedOk: false,
      isFiatPriceFeedOk: false,
      hasData: false,
    });
  },
}));
