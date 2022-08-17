import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type PlatformState = {
  isLoading: boolean;
  hasError: Error | null; // not yet in use
  isPriceFeedOk: boolean;
};

const initialState: PlatformState = {
  isLoading: true,
  hasError: null,
  isPriceFeedOk: false,
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
  },
});

export const { setIsLoading, setError, setPriceFeedOk } = platformSlice.actions;
export default platformSlice;
