export type Transaction = {
  id: string;
  type: string;
  creditLine?: string;
  inputCurrency: string;
  inputAmount: number;
  outputCurrency: string;
  outputAmount: number;
  usdEquivalent: number;
  fee: string;
  feeCurrency: string;
  details: string;
  dateTime: string;
};

export type Currency = {
  name: string;
  symbol: string;
  type: "crypto" | "fiat" | "unknown";
  amount: number;
  usdEquivalent: number;
  coingeckoId: string;
  supported: boolean;
};

export type DateValueArray = {
  date: string;
  value: number;
};

/**
 * One bucket of earned interest, split by how it was paid.
 *
 * `fixedTerm` payouts settle the whole accrual of a term deposit on its
 * maturity date, so they are one to two orders of magnitude larger than a
 * day's regular interest. Keeping them in a separate series is what lets the
 * chart stay readable — merged, a single maturity flattens everything else.
 *
 * `date` is `YYYY-MM-DD` for daily buckets and `YYYY-MM` for monthly ones.
 */
export type InterestPoint = {
  date: string;
  regular: number;
  fixedTerm: number;
};

export type DepositsWithdrawalsArray = {
  date: string;
  deposit: number;
  withdrawal: number;
};

export type EarnedInterestBreakdown = {
  currency: string;
  inKindAmount: number;
  inKindUsd: number;
  inNexoAmount: number;
  inNexoUsd: number;
};

export type StatisticsState = {
  interestData: InterestPoint[];
  depositAndWithdrawalData: DepositsWithdrawalsArray[];
  historicPortfolioData: DateValueArray[];
  earnedInterestBreakdown: EarnedInterestBreakdown[];
  interestChargedUsd: number;
};
