import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type Transaction = {
  id: string;
  type: string;
  currency: string;
  amount: number;
  usdEquivalent: number;
  details: string;
  outstandingLoan: number;
  dateTime: Date;
};

const transactionSlice = createSlice({
  name: "transactions",
  initialState: [] as Transaction[],
  reducers: {
    addTransaction(state, action: PayloadAction<Transaction>) {
      state.push(action.payload);
    },
  },
});

export const { addTransaction } = transactionSlice.actions;
export default transactionSlice;
