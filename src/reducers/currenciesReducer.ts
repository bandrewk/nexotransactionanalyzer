import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Transaction } from "./transactionReducer";

export type Currency = {
  name: string;
  symbol: string;
  type: string;
  amount: number;
  usdEquivalent: number;
  coingeckoId: string;
  supported: boolean;
};

const addCurrency = (state: Currency[], currency: Currency) => {
  let symbol = currency.symbol;

  if (state.some((item) => item.symbol === symbol)) {
    // Currency is already available
    // console.log(`Currency ${symbol} is already available.`);
    return null;
  } else {
    // console.log(`Added currency ${currency.symbol}.`);
    return currency;
  }
};

const currenciesSlice = createSlice({
  name: "currencies",
  initialState: [] as Currency[],
  reducers: {
    /****************************************************************
     * ADD CURRENCIES
     ***************************************************************/
    addCurrencies(state, action: PayloadAction<Currency[]>) {
      action.payload.forEach((currency) => {
        const ret = addCurrency(state, currency);

        if (ret) state.push(ret);
      });
    },

    /****************************************************************
     * ADD AMOUNT
     * Add +/- n amount of coins to the specified currencies
     ***************************************************************/
    addAmount(state, action: PayloadAction<{ t: Transaction }>) {
      // Little helper for verifying the currency
      const isValid = (currency: string) => {
        if (state.some((item) => item.symbol === currency)) return true;
        else return false;
      };

      const AddUnsupportedCurrency = (symbol: string) => {
        const ret = addCurrency(state, {
          name: `Unknown ${Math.random().toFixed(2)}`,
          amount: Number(0),
          usdEquivalent: Number(0),
          coingeckoId: `unknown`,
          symbol: symbol,
          type: `unknown`,
          supported: false,
        });
        if (ret) state.push(ret);
      };

      const GetIndex = (symbol: string) => {
        return state.findIndex((item) => item.symbol === symbol);
      };

      const IsAlmostZero = (amount: number) => {
        // if (amount > 0 && amount < 0.000001) return true;
        return false;
      };

      const inputAmount = action.payload.t.inputAmount;
      const inputCurrency = action.payload.t.inputCurrency;
      const outputAmount = action.payload.t.outputAmount;
      const outputCurrency = action.payload.t.outputCurrency;

      // console.log(`Input: ${inputAmount}, Output: ${outputAmount}`);

      // 1. Single transaction
      if (
        inputCurrency === outputCurrency ||
        (inputCurrency.length > 1 && outputCurrency === "")
      ) {
        // Make sure currency is available, if not, add it.
        if (!isValid(inputCurrency)) AddUnsupportedCurrency(inputCurrency);

        // 1.1. Find index
        const index = GetIndex(inputCurrency);

        // 1.2. Update amount
        if (index >= 0) {
          state[index].amount += inputAmount;
          if (IsAlmostZero(state[index].amount)) state[index].amount = 0;
        } else {
          console.log(
            `Unable to find currency index for ${inputCurrency} (${JSON.stringify(
              action.payload.t
            )})`
          );
          console.log(JSON.stringify(state));
        }

        // Exit !
        return;
      }

      // 2. Pair transaction
      if (!isValid(inputCurrency)) AddUnsupportedCurrency(inputCurrency);
      if (!isValid(outputCurrency)) AddUnsupportedCurrency(outputCurrency);

      // 2.1. Find indexes
      const indexInput = GetIndex(inputCurrency);
      const indexOuput = GetIndex(outputCurrency);

      // 2.2. Update amounts
      if (indexInput >= 0 && indexOuput >= 0) {
        state[indexInput].amount += inputAmount;
        state[indexOuput].amount += outputAmount;

        if (IsAlmostZero(state[indexInput].amount))
          state[indexInput].amount = 0;
        if (IsAlmostZero(state[indexOuput].amount))
          state[indexOuput].amount = 0;
      } else {
        console.log(
          `Unable to find currency index for ${inputCurrency} or ${outputCurrency} (${JSON.stringify(
            action.payload.t
          )})`
        );
        console.log(JSON.stringify(state));
      }
    },

    /****************************************************************
     * USD Equivalent (array)
     * A = Exchange course to USD
     * C = Currency symbol
     * Will calculate: Amount * payload.a
     ***************************************************************/
    setUSDEquivalent(state, action: PayloadAction<{ c: string; a: number }[]>) {
      const isValid = (coingeckoId: string) => {
        if (
          state.some(
            (item) =>
              item.coingeckoId.toLocaleUpperCase() ===
              coingeckoId.toLocaleUpperCase()
          )
        )
          return true;
        else return false;
      };

      const GetIndex = (coingeckoId: string) => {
        return state.findIndex((item) => item.coingeckoId === coingeckoId);
      };

      action.payload.forEach((item) => {
        // Make sure currency is available
        if (isValid(item.c)) {
          // 1.1. Find index
          const index = GetIndex(item.c);

          // 1.2. Update amount
          if (index >= 0) {
            state[index].usdEquivalent = state[index].amount * item.a;
          } else {
            console.log(
              `Unable to find currency index for ${item.a} (${JSON.stringify(
                action.payload
              )})`
            );
            console.log(JSON.stringify(state));
          }
        }
      });
    },

    /****************************************************************
     * USD Equivalent (single)
     * A = Exchange course to USD
     * C = Currency symbol
     * Will calculate: Amount * payload.a
     ***************************************************************/
    setUSDEquivalentSingle(
      state,
      action: PayloadAction<{ c: string; a: number }>
    ) {
      const GetIndex = (symbol: string) => {
        return state.findIndex((item) => item.symbol === symbol);
      };

      const index = GetIndex(action.payload.c);

      if (index >= 0) {
        state[index].usdEquivalent = state[index].amount * action.payload.a;
      } else {
        console.log(
          `setUSDEquivalentSingle: Currency not found`,
          action.payload.c
        );
      }
    },
  },
});

export const {
  addAmount,
  addCurrencies,
  setUSDEquivalent,
  setUSDEquivalentSingle,
} = currenciesSlice.actions;
export default currenciesSlice;
