import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type Currency = {
  name: string;
  symbol: string;
  type: string;
  amount: number;
  coingeckoId: string;
  supported: boolean;
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

        if (!isValid(currency)) {
          console.log(`(!) Adding unknown currency: ${currency}`);
          state.push({
            name: `Unknown ${Math.random().toFixed(2)}`,
            amount: 0,
            coingeckoId: `unknown`,
            symbol: currency,
            type: `unknown`,
            supported: false,
          });
        }
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

        const outputCurrency = action.payload.outputCurrency;
        const inputCurrency = action.payload.inputCurrency;

        if (outputCurrency === "")
          if (!isValid(outputCurrency) && outputCurrency !== "") {
            console.log(
              `(!) Adding unknown currency in pair transaction (output): ${outputCurrency} (${action.payload.outputAmount})`
            );
            state.push({
              name: `Unknown ${Math.random().toFixed(2)}`,
              amount: 0,
              coingeckoId: `unknown`,
              symbol: outputCurrency,
              type: `unknown`,
              supported: false,
            });
          }

        if (!isValid(inputCurrency)) {
          console.log(
            `(!) Adding unknown currency in pair transaction (input): ${inputCurrency} (${action.payload.inputAmount})`
          );
          state.push({
            name: `Unknown ${Math.random().toFixed(2)}`,
            amount: 0,
            coingeckoId: `unknown`,
            symbol: inputCurrency,
            type: `unknown`,
            supported: false,
          });
        }

        if (isValid(outputCurrency) && isValid(inputCurrency)) {
          console.log(state);

          // 1. Find currencies
          const indexA = state.findIndex(
            (item) => item.symbol === inputCurrency
          );

          const indexB = state.findIndex(
            (item) => item.symbol === outputCurrency
          );

          if (indexA >= 0 && indexB >= 0) {
            // 2. Process input currency
            state[indexA].amount += action.payload.inputAmount;
            console.log(
              `(Input)${inputCurrency}: ${action.payload.inputAmount}`
            );

            // 3. Process output currency
            state[indexB].amount += action.payload.outputAmount;
            console.log(
              `(Output)${outputCurrency}: ${action.payload.outputAmount}`
            );
          } else {
            console.log(
              `(!) Could not locate one or more currencies of pair transaction.`
            );
            console.log(
              `(!) indexA: ${indexA} (${inputCurrency}), indexB: ${indexB} (${outputCurrency})`
            );
            console.log(JSON.stringify(state));
          }
        } else {
          console.log(`One or more currencies of pair not supported.`);
        }
      }
    },
  },
});

export const { addCurrency, addAmount } = currenciesSlice.actions;
export default currenciesSlice;
