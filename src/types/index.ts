export type Transaction = {
  id: string;
  type: string;
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
  interestData: DateValueArray[];
  depositAndWithdrawalData: DepositsWithdrawalsArray[];
  historicPortfolioData: DateValueArray[];
  earnedInterestBreakdown: EarnedInterestBreakdown[];
};
