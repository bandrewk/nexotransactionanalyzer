import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type InterestData = {
  date: string;
  value: number;
};
export type StatisticsState = {
  interestData: InterestData[];
};

const initialState: StatisticsState = {
  interestData: [],
};

const statisticsSlice = createSlice({
  name: "statistics",
  initialState: initialState,
  reducers: {
    setInterestData(state, action: PayloadAction<InterestData[]>) {
      state.interestData = action.payload;
    },
  },
});

export const { setInterestData } = statisticsSlice.actions;
export default statisticsSlice;
