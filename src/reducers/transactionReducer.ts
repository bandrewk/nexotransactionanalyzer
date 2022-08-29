import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { loadState } from "../localStorageIO";

export const TransactionType = {
  // Basic types
  INTEREST: `Interest`,
  DEPOSIT: `Deposit`,
  WITHDRAWAL: `Withdrawal`,
  EXCHANGE: `Exchange`,

  // Wallet transfers
  TRANSFERIN: `TransferIn`, // Credit to savings wallet
  TRANSFEROUT: `TransferOut`, // Savings wallet to credit wallet

  // Credit card
  CREDITCARDSTATUS: `CreditCardStatus`, // This one is weird, input = the value of the output in usd, output = origin currency (i.e. EUR) (informative only)

  // LOAN
  LIQUIDATION: `Liquidation`, // Broken for sure. Output = Input. Output should be the USD value not the same as input. (Liquidation currency -> Repayment USD)
  REPAYMENT: `Repayment`, // Weird one, repayment but as a positive value. should be negative ?!! Ouput value is always USD with an amount of 0 for some reason

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
  initialState: loadState(`transactions`, [] as Transaction[]) as Transaction[],
  reducers: {
    addTransaction(state, action: PayloadAction<Transaction>) {
      state.push(action.payload);
    },
  },
});

export const { addTransaction } = transactionSlice.actions;
export default transactionSlice;
