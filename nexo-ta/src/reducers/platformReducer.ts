import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type PlatformState = {
  isLoading: boolean;
  hasError: Error | null;
};

const initialState: PlatformState = { isLoading: false, hasError: null };

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
  },
});

export const { setIsLoading } = platformSlice.actions;
export default platformSlice;
