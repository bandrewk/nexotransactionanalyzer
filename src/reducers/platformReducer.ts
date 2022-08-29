import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type PlatformState = {
  isLoading: boolean;
  hasError: Error | null; // not yet in use
  isPriceFeedOk: boolean;
  isFiatPriceFeedOk: boolean;
};

const initialState: PlatformState = {
  isLoading: true,
  hasError: null,
  isPriceFeedOk: false,
  isFiatPriceFeedOk: false,
};

const platformSlice = createSlice({
  name: "transactions",
  initialState: initialState,
  reducers: {
    setIsLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<Error>) {
      state.hasError = action.payload;
    },
    setPriceFeedOk(state, action: PayloadAction<boolean>) {
      state.isPriceFeedOk = action.payload;
    },
    setFiatPriceFeedOk(state, action: PayloadAction<boolean>) {
      state.isFiatPriceFeedOk = action.payload;
    },
  },
});

export const { setIsLoading, setError, setPriceFeedOk, setFiatPriceFeedOk } =
  platformSlice.actions;
export default platformSlice;
