import { createSlice, PayloadAction } from "@reduxjs/toolkit";

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

const initialState: StatisticsState = {
  interestData: [],
  depositAndWithdrawalData: [],
  historicPortfolioData: [],
  earnedInterestBreakdown: [],
};

const statisticsSlice = createSlice({
  name: "statistics",
  initialState: initialState,
  reducers: {
    setInterestData(state, action: PayloadAction<DateValueArray[]>) {
      state.interestData = action.payload;
    },
    setDepositAndWithdrawalData(
      state,
      action: PayloadAction<DepositsWithdrawalsArray[]>
    ) {
      state.depositAndWithdrawalData = action.payload;
    },
    setHistoricPortfolioData(state, action: PayloadAction<DateValueArray[]>) {
      state.historicPortfolioData = action.payload;
    },
    setEarnedInterestBreakdown(
      state,
      action: PayloadAction<EarnedInterestBreakdown[]>
    ) {
      state.earnedInterestBreakdown = action.payload;
    },
  },
});

export const {
  setInterestData,
  setDepositAndWithdrawalData,
  setHistoricPortfolioData,
  setEarnedInterestBreakdown,
} = statisticsSlice.actions;
export default statisticsSlice;
