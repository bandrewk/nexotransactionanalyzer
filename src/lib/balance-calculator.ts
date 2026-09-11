import type {
  Transaction,
  Currency,
  InterestPoint,
  DepositsWithdrawalsArray,
  EarnedInterestBreakdown,
} from "../types";
import { TransactionType, getTypeRule } from "../data/transaction-types";
import { currencyData } from "../data/currencies";

export type BalanceResult = {
  currencies: Currency[];
  interestData: InterestPoint[];
  depositAndWithdrawalData: DepositsWithdrawalsArray[];
  dailySnapshots: Map<string, Map<string, number>>;
  earnedInterestBreakdown: EarnedInterestBreakdown[];
  interestChargedUsd: number;
};

/**
 * Excluded detail statuses for balance calculation.
 * Detail status is the text before the first "/", or the entire field if no "/" exists.
 */
export const EXCLUDED_DETAIL_STATUSES = new Set<string>(["pending", "rejected"]);

/**
 * Extracts the status prefix from a Details string:
 * the text before the first "/", or the whole field when there is no "/".
 * Trims whitespace and lowercases.
 */
export function extractDetailStatus(details: string | undefined | null): string {
  if (!details) return "";
  const slashIdx = details.indexOf("/");
  const rawStatus = slashIdx === -1 ? details : details.slice(0, slashIdx);
  return rawStatus.trim().toLowerCase();
}

/**
 * Checks whether the status in Details is excluded from balance calculation.
 */
export function isExcludedDetailStatus(details: string | undefined | null): boolean {
  return EXCLUDED_DETAIL_STATUSES.has(extractDetailStatus(details));
}

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

  // Displayed amounts snap to zero below the dust threshold; the snapshot series does not.
  const credit = (symbol: string, delta: number) => {
    ensureCurrency(symbol);
    const idx = currencyMap.get(symbol)!;
    currencies[idx].amount += delta;
    if (isAlmostZero(currencies[idx].amount)) currencies[idx].amount = 0;
    currencyBalances.set(symbol, (currencyBalances.get(symbol) ?? 0) + delta);
  };

  // Statistics accumulators.
  // Regular and fixed-term interest are kept apart: a term deposit pays its
  // whole accrual on the maturity date, so merging the two makes a single
  // payout dwarf every ordinary day in the chart.
  const regularByDate = new Map<string, number>();
  const fixedTermByDate = new Map<string, number>();
  const allInterestDates = new Set<string>();
  const depositByDate = new Map<string, number>();
  const withdrawByDate = new Map<string, number>();
  const interestBreakdown = new Map<
    string,
    { inKindAmount: number; inKindUsd: number; inNexoAmount: number; inNexoUsd: number }
  >();
  let interestChargedUsd = 0;

  // Per-currency running balances for historic portfolio
  const currencyBalances = new Map<string, number>();
  const dailySnapshots = new Map<string, Map<string, number>>();

  // Process in chronological order
  const sorted = [...transactions].sort(
    (a, b) => a.dateTime.localeCompare(b.dateTime)
  );

  for (const t of sorted) {
    if (isExcludedDetailStatus(t.details)) continue;

    const date = t.dateTime.substring(0, 10);
    const rule = getTypeRule(t.type);
    const effect = rule?.effect ?? "generic";

    // Update currency amounts based on holding effect
    if (effect === "generic") {
      const ic = t.inputCurrency;
      const oc = t.outputCurrency;

      credit(ic, t.inputAmount);
      if (oc && oc !== "-" && oc !== ic) {
        credit(oc, t.outputAmount);
      }
    } else if (effect === "debit-input") {
      credit(t.inputCurrency, -Math.abs(t.inputAmount));
    }

    // Snapshot balances at end of each date
    dailySnapshots.set(date, new Map(currencyBalances));

    // A row counts as earned interest only when it credits. In-kind rows carry the
    // sign on inputAmount, in-NEXO rows on outputAmount. Zero and non-finite amounts
    // are neither earned nor charged.
    if (t.type === TransactionType.INTEREST || t.type === TransactionType.FIXEDTERMINTEREST) {
      allInterestDates.add(date);

      const isInNexo = t.outputCurrency === "NEXO" && t.inputCurrency !== "NEXO";
      const directionalAmount = isInNexo ? t.outputAmount : t.inputAmount;
      const isCredit = Number.isFinite(directionalAmount) && directionalAmount > 0;
      const isCharged = Number.isFinite(directionalAmount) && directionalAmount < 0;

      if (isCredit) {
        const target =
          t.type === TransactionType.FIXEDTERMINTEREST ? fixedTermByDate : regularByDate;
        target.set(date, (target.get(date) ?? 0) + t.usdEquivalent);

        // Interest breakdown: in-kind vs in-NEXO
        const key = t.inputCurrency;
        const existing = interestBreakdown.get(key) || {
          inKindAmount: 0, inKindUsd: 0, inNexoAmount: 0, inNexoUsd: 0,
        };
        if (isInNexo) {
          // A quantity, not a signed value — Math.abs is deliberate.
          existing.inNexoAmount += Math.abs(t.outputAmount);
          existing.inNexoUsd += t.usdEquivalent;
        } else {
          // A quantity, not a signed value — Math.abs is deliberate.
          existing.inKindAmount += Math.abs(t.inputAmount);
          existing.inKindUsd += t.usdEquivalent;
        }
        interestBreakdown.set(key, existing);
      } else if (isCharged) {
        // Charges and reversals accumulate separately, and additively, so they
        // cannot pull an existing figure negative.
        const charged = Math.abs(t.usdEquivalent);
        if (Number.isFinite(charged)) {
          interestChargedUsd += charged;
        }
      }
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
  const interestDates = new Set([
    ...regularByDate.keys(),
    ...fixedTermByDate.keys(),
    ...allInterestDates,
  ]);
  const interestData: InterestPoint[] = [...interestDates]
    .map((date) => ({
      date,
      regular: regularByDate.get(date) ?? 0,
      fixedTerm: fixedTermByDate.get(date) ?? 0,
    }))
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
    interestChargedUsd,
  };
}
