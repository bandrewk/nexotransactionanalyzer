import { create } from "zustand";
import type { Transaction, Currency, StatisticsState } from "../types";
import { parseCSV } from "../lib/csv-parser";
import { calculateBalances } from "../lib/balance-calculator";
import { analyseCsv, type CsvDiagnostics } from "../lib/csv-diagnostics";
import { saveTransactions, loadTransactions, clearSavedData, hasSavedData } from "../lib/storage";

interface AppState {
  // Data
  transactions: Transaction[];
  currencies: Currency[];
  statistics: StatisticsState;
  dailySnapshots: Map<string, Map<string, number>>;
  /** Held symbols with no historic price coverage. Surfaced in the UI, never valued at 0. */
  unpricedSymbols: string[];
  /** Symbols with partial price coverage that forced days to be omitted from the chart. */
  partialCoverageSymbols: string[];
  /**
   * What the uploaded file looked like: schema, row shapes, unrecognised
   * types. Redacted at source, so it is safe to persist and to display.
   * Null after a restored session, where the raw text is long gone.
   */
  diagnostics: CsvDiagnostics | null;

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
  setHistoricPortfolioData: (
    data: { date: string; value: number }[],
    unpricedSymbols?: string[],
    partialCoverageSymbols?: string[]
  ) => void;
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
  interestChargedUsd: 0,
};

export const useAppStore = create<AppState>((set, get) => ({
  transactions: [],
  currencies: [],
  statistics: emptyStatistics,
  dailySnapshots: new Map(),
  unpricedSymbols: [],
  partialCoverageSymbols: [],
  diagnostics: null,
  isLoading: false,
  isPriceFeedOk: false,
  isFiatPriceFeedOk: false,
  hasData: false,

  loadCSV: (content: string) => {
    set({ isLoading: true });

    // Diagnostics first: they are the only thing that still works when the
    // file is rejected, and the caller needs them to explain the rejection.
    const diagnostics = analyseCsv(content);

    let transactions;
    let result;
    try {
      transactions = parseCSV(content);
      result = calculateBalances(transactions);
    } catch (e) {
      // Without this the store keeps isLoading true forever. Rethrow so the
      // upload component can show the reason.
      set({ isLoading: false, diagnostics });
      throw e;
    }

    set({
      transactions,
      diagnostics,
      currencies: result.currencies,
      statistics: {
        interestData: result.interestData,
        depositAndWithdrawalData: result.depositAndWithdrawalData,
        historicPortfolioData: [],
        earnedInterestBreakdown: result.earnedInterestBreakdown,
        interestChargedUsd: result.interestChargedUsd,
      },
      dailySnapshots: result.dailySnapshots,
      unpricedSymbols: [],
      partialCoverageSymbols: [],
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
        interestChargedUsd: result.interestChargedUsd,
      },
      dailySnapshots: result.dailySnapshots,
      unpricedSymbols: [],
      partialCoverageSymbols: [],
      // A restored session has no raw CSV to inspect.
      diagnostics: null,
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

  setHistoricPortfolioData: (data, unpricedSymbols = [], partialCoverageSymbols = []) => {
    set((state) => ({
      statistics: { ...state.statistics, historicPortfolioData: data },
      unpricedSymbols,
      partialCoverageSymbols,
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
      unpricedSymbols: [],
      partialCoverageSymbols: [],
      diagnostics: null,
      isLoading: false,
      isPriceFeedOk: false,
      isFiatPriceFeedOk: false,
      hasData: false,
    });
  },
}));
