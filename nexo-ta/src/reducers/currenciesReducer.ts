import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type Currency = {
  name: string;
  symbol: string;
  type: string;
  amount: number;
  coingeckoId: string;
};

const currenciesSlice = createSlice({
  name: "currencies",
  initialState: [] as Currency[],
  reducers: {
    addCurrency(state, action: PayloadAction<Currency>) {
      if (state.some((item) => item.symbol === action.payload.symbol)) {
        // Currency is already available
        console.log(`Currency ${action.payload.symbol} is already available.`);

        // const index = state.findIndex(
        //   (item) => item.symbol === action.payload.symbol
        // );
        // let data = state[index];

        // if (data) {
        //   data.amount += action.payload.amount;
        //   state[index] = data;
        // } else {
        //   // Data was invalid..
        //   console.log(`Data object for ${action.payload.symbol} was invalid.`);
        // }
      } else {
        // Add currency
        state.push(action.payload);
        console.log(`Added currency ${action.payload.symbol}.`);
      }
    },
  },
});

export const { addCurrency } = currenciesSlice.actions;
export default currenciesSlice;
