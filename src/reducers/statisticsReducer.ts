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

export type StatisticsState = {
  interestData: DateValueArray[];
  depositAndWithdrawalData: DepositsWithdrawalsArray[];
};

const initialState: StatisticsState = {
  interestData: [],
  depositAndWithdrawalData: [],
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
  },
});

export const { setInterestData, setDepositAndWithdrawalData } =
  statisticsSlice.actions;
export default statisticsSlice;
