import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export const TransactionType = {
  // Basic types
  INTEREST: `Interest`,
  DEPOSIT: `Deposit`,
  WITHDRAWAL: `Withdrawal`,
  EXCHANGE: `Exchange`,

  // Cashback
  EXCHANGECASHBACK: `Exchange Cashback`,

  // Refs
  REFERRALBONUS: `ReferralBonus`,

  // Deposit Fiat
  EXCHANGEDEPOSITEDON: `ExchangeDepositedOn`,
  DEPOSITTOEXCHANGE: `DepositToExchange`,

  // Widthdraw fiat
  WITHDRAWEXCHANGED: `WithdrawExchanged`,
  EXCHANGETOWITHDRAW: `ExchangeToWithdraw`,

  // Fixed terms
  LOCKINGTERMDEPOSIT: `LockingTermDeposit`,
  FIXEDTERMINTEREST: `FixedTermInterest`,
  UNLOCKINGTERMDEPOSIT: `UnlockingTermDeposit`,
};

// File header
// ['Transaction', 'Type', 'Input Currency', 'Input Amount', 'Output Currency', 'Output Amount', 'USD Equivalent', 'Details', 'Outstanding Loan', 'Date / Time']
export type Transaction = {
  id: string;
  type: string;
  inputCurrency: string;
  inputAmount: number;
  outputCurrency: string;
  outputAmount: number;
  usdEquivalent: number;
  details: string;
  outstandingLoan: number;
  dateTime: string;
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
