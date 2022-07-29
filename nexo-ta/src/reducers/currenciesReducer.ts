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
    /****************************************************************
     * ADD CURRENCY
     * Adds a currency to the supported list
     ***************************************************************/
    addCurrency(state, action: PayloadAction<Currency>) {
      if (state.some((item) => item.symbol === action.payload.symbol)) {
        // Currency is already available
        console.log(`Currency ${action.payload.symbol} is already available.`);
      } else {
        // Add currency
        state.push(action.payload);
        console.log(`Added currency ${action.payload.symbol}.`);
      }
    },

    /****************************************************************
     * ADD AMOUNT
     * Add +/- n amount of coins to the specified currencies
     ***************************************************************/
    addAmount(
      state,
      action: PayloadAction<{
        inputAmount: number;
        inputCurrency: string;
        outputAmount: number;
        outputCurrency: string;
      }>
    ) {
      // Little helper for verifying the currency
      const isValid = (currency: string) => {
        if (state.some((item) => item.symbol === currency)) return true;
        else return false;
      };

      // Single transaction (Deposit, earn, etc.)
      if (
        action.payload.inputAmount === action.payload.outputAmount &&
        action.payload.inputCurrency === action.payload.outputCurrency
      ) {
        console.log(`**Single transaction`);
        const currency = action.payload.outputCurrency;
        const amount = action.payload.outputAmount;

        if (isValid(currency)) {
          // Add amount to currency
          const index = state.findIndex((item) => item.symbol === currency);
          state[index].amount += amount;

          console.log(`${currency}: ${state[index].amount}`);
        } else {
          console.log(`Currency ${currency} not supported!`);
        }
      } else {
        // Pair transaction (Swap, purchase, etc.)
        console.log(`**Pair transaction`);

        if (
          isValid(action.payload.outputCurrency && action.payload.inputCurrency)
        ) {
          // 1. Process input currency
          let index = state.findIndex(
            (item) => item.symbol === action.payload.inputCurrency
          );
          state[index].amount += action.payload.inputAmount;
          console.log(
            `(Input)${action.payload.inputCurrency}: ${action.payload.inputAmount}`
          );

          // 2. Process output currency

          index = state.findIndex(
            (item) => item.symbol === action.payload.outputCurrency
          );
          state[index].amount += action.payload.outputAmount;
          console.log(
            `(Output)${action.payload.outputCurrency}: ${action.payload.outputAmount}`
          );
        } else {
          console.log(`One or more currencies of pair not supported.`);
        }
      }
    },
  },
});

export const { addCurrency, addAmount } = currenciesSlice.actions;
export default currenciesSlice;
