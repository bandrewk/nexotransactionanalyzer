import type {
  Transaction,
  Currency,
  DateValueArray,
  DepositsWithdrawalsArray,
  EarnedInterestBreakdown,
} from "../types";
import { TransactionType, INTERNAL_TRANSFER_TYPES } from "../data/transaction-types";
import { currencyData } from "../data/currencies";

export type BalanceResult = {
  currencies: Currency[];
  interestData: DateValueArray[];
  depositAndWithdrawalData: DepositsWithdrawalsArray[];
  dailySnapshots: Map<string, Map<string, number>>;
  earnedInterestBreakdown: EarnedInterestBreakdown[];
};

function isAlmostZero(val: number): boolean {
  return Math.abs(val) < 0.000001;
}

/**
 * Calculate currency balances and statistics from transactions.
 * Transactions should be in chronological order (oldest first).
 */
export function calculateBalances(transactions: Transaction[]): BalanceResult {
  // Initialize currencies from the static data
  const currencies: Currency[] = currencyData.map((c) => ({ ...c, amount: 0, usdEquivalent: 0 }));
  const currencyMap = new Map<string, number>(); // symbol -> index
  currencies.forEach((c, i) => currencyMap.set(c.symbol, i));

  const ensureCurrency = (symbol: string) => {
    if (!currencyMap.has(symbol)) {
      const idx = currencies.length;
      currencies.push({
        name: symbol,
        symbol,
        type: "unknown",
        amount: 0,
        usdEquivalent: 0,
        coingeckoId: "",
        supported: false,
      });
      currencyMap.set(symbol, idx);
    }
  };

  // Statistics accumulators
  const interestByDate = new Map<string, number>();
  const depositByDate = new Map<string, number>();
  const withdrawByDate = new Map<string, number>();
  const interestBreakdown = new Map<
    string,
    { inKindAmount: number; inKindUsd: number; inNexoAmount: number; inNexoUsd: number }
  >();

  // Per-currency running balances for historic portfolio
  const currencyBalances = new Map<string, number>();
  const dailySnapshots = new Map<string, Map<string, number>>();

  // Process in chronological order
  const sorted = [...transactions].sort(
    (a, b) => a.dateTime.localeCompare(b.dateTime)
  );

  for (const t of sorted) {
    if (t.details.includes("pending") || t.details.includes("rejected")) continue;

    const date = t.dateTime.substring(0, 10);
    const isInternal = INTERNAL_TRANSFER_TYPES.has(t.type);

    // Update currency amounts (skip internal transfers)
    if (!isInternal) {
      const ic = t.inputCurrency;
      const oc = t.outputCurrency;

      ensureCurrency(ic);
      if (oc && oc !== "-") ensureCurrency(oc);

      const icIdx = currencyMap.get(ic)!;

      if (ic === oc || !oc || oc === "-") {
        // Single currency transaction
        currencies[icIdx].amount += t.inputAmount;
        if (isAlmostZero(currencies[icIdx].amount)) currencies[icIdx].amount = 0;
      } else {
        // Exchange between two currencies
        const ocIdx = currencyMap.get(oc)!;
        currencies[icIdx].amount += t.inputAmount;
        currencies[ocIdx].amount += t.outputAmount;
        if (isAlmostZero(currencies[icIdx].amount)) currencies[icIdx].amount = 0;
        if (isAlmostZero(currencies[ocIdx].amount)) currencies[ocIdx].amount = 0;
      }

      // Update running balances for historic portfolio
      if (ic === oc || !oc || oc === "-") {
        currencyBalances.set(ic, (currencyBalances.get(ic) ?? 0) + t.inputAmount);
      } else {
        currencyBalances.set(ic, (currencyBalances.get(ic) ?? 0) + t.inputAmount);
        currencyBalances.set(oc, (currencyBalances.get(oc) ?? 0) + t.outputAmount);
      }
    }

    // Snapshot balances at end of each date
    dailySnapshots.set(date, new Map(currencyBalances));

    // Interest statistics
    if (t.type === TransactionType.INTEREST || t.type === TransactionType.FIXEDTERMINTEREST) {
      interestByDate.set(date, (interestByDate.get(date) ?? 0) + t.usdEquivalent);

      // Interest breakdown: in-kind vs in-NEXO
      const isInNexo = t.outputCurrency === "NEXO" && t.inputCurrency !== "NEXO";
      const key = t.inputCurrency;
      const existing = interestBreakdown.get(key) || {
        inKindAmount: 0, inKindUsd: 0, inNexoAmount: 0, inNexoUsd: 0,
      };
      if (isInNexo) {
        existing.inNexoAmount += Math.abs(t.outputAmount);
        existing.inNexoUsd += t.usdEquivalent;
      } else {
        existing.inKindAmount += Math.abs(t.inputAmount);
        existing.inKindUsd += t.usdEquivalent;
      }
      interestBreakdown.set(key, existing);
    }

    // Deposits
    if (
      t.type === TransactionType.DEPOSIT ||
      t.type === TransactionType.DEPOSITTOEXCHANGE ||
      t.type === TransactionType.TOPUPCRYPTO
    ) {
      depositByDate.set(date, (depositByDate.get(date) ?? 0) + t.usdEquivalent);
    }

    // Withdrawals
    if (
      t.type === TransactionType.WITHDRAWAL ||
      t.type === TransactionType.WITHDRAWEXCHANGED
    ) {
      withdrawByDate.set(date, (withdrawByDate.get(date) ?? 0) - t.usdEquivalent);
    }
  }

  // Convert maps to sorted arrays
  const interestData: DateValueArray[] = [...interestByDate.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const allDates = new Set([...depositByDate.keys(), ...withdrawByDate.keys()]);
  const depositAndWithdrawalData: DepositsWithdrawalsArray[] = [...allDates]
    .map((date) => ({
      date,
      deposit: depositByDate.get(date) ?? 0,
      withdrawal: withdrawByDate.get(date) ?? 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const earnedInterestBreakdown: EarnedInterestBreakdown[] = [...interestBreakdown.entries()]
    .map(([currency, data]) => ({ currency, ...data }));

  return {
    currencies,
    interestData,
    depositAndWithdrawalData,
    dailySnapshots,
    earnedInterestBreakdown,
  };
}
