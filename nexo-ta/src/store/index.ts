// https://redux.js.org/usage/usage-with-typescript

import { configureStore } from "@reduxjs/toolkit";
import transactionSlice from "../reducers/transactionReducer";
import currenciesSlice from "../reducers/currenciesReducer";
import statisticsSlice from "../reducers/statisticsReducer";

// ...

export const store = configureStore({
  reducer: {
    transactions: transactionSlice.reducer,
    currencies: currenciesSlice.reducer,
    statistics: statisticsSlice.reducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;

// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
