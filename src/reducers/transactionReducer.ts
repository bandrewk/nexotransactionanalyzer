import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { loadState } from "../localStorageIO";

export const TransactionType = {
  // Basic types
  INTEREST: `Interest`,
  DEPOSIT: `Deposit`,
  WITHDRAWAL: `Withdrawal`,
  EXCHANGE: `Exchange`,

  // Wallet transfers
  TRANSFERIN: `Transfer In`, // Credit to savings wallet
  TRANSFEROUT: `Transfer Out`, // Savings wallet to credit wallet

  // Credit card
  CREDITCARDSTATUS: `Nexo Card Purchase`,

  // LOAN
  LIQUIDATION: `Liquidation`,
  REPAYMENT: `Manual Repayment`,

  // Cashback
  EXCHANGECASHBACK: `Exchange Cashback`,
  CASHBACK: `Cashback`,

  // Refs
  REFERRALBONUS: `Referral Bonus`,

  // Deposit Fiat
  EXCHANGEDEPOSITEDON: `Exchange Deposited On`,
  DEPOSITTOEXCHANGE: `Deposit To Exchange`,

  // Widthdraw fiat
  WITHDRAWEXCHANGED: `Withdraw Exchanged`,
  EXCHANGETOWITHDRAW: `Exchange To Withdraw`,

  // Fixed terms
  LOCKINGTERMDEPOSIT: `Locking Term Deposit`,
  FIXEDTERMINTEREST: `Fixed Term Interest`,
  UNLOCKINGTERMDEPOSIT: `Unlocking Term Deposit`,

  // Top up
  TOPUPCRYPTO: `Top up Crypto`,

  // Dividend
  DIVIDEND: `Dividend`,

  // Manual sell
  MANUALSELLORDER: `Manual Sell Order`,
};

// File header
// ['Transaction', 'Type', 'Input Currency', 'Input Amount', 'Output Currency', 'Output Amount', 'USD Equivalent', 'Fee', 'Fee Currency', 'Details', 'Date / Time (UTC)', 'normalizedDisplayDetails']
export type Transaction = {
  id: string;
  type: string;
  inputCurrency: string;
  inputAmount: number;
  outputCurrency: string;
  outputAmount: number;
  usdEquivalent: number;
  fee: string;
  feeCurrency: string;
  details: string;
  dateTime: string;
};

const transactionSlice = createSlice({
  name: "transactions",
  initialState: loadState(`transactions`, [] as Transaction[]) as Transaction[],
  reducers: {
    addTransaction(state, action: PayloadAction<Transaction>) {
      state.push(action.payload);
    },
  },
});

export const { addTransaction } = transactionSlice.actions;
export default transactionSlice;
