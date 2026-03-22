export const TransactionType = {
  // Basic types
  INTEREST: "Interest",
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  EXCHANGE: "Exchange",

  // Wallet transfers
  TRANSFERIN: "Transfer In",
  TRANSFEROUT: "Transfer Out",

  // Credit card
  CREDITCARDSTATUS: "Nexo Card Purchase",

  // Loan
  LIQUIDATION: "Liquidation",
  REPAYMENT: "Manual Repayment",

  // Cashback
  EXCHANGECASHBACK: "Exchange Cashback",
  CASHBACK: "Cashback",

  // Referrals
  REFERRALBONUS: "Referral Bonus",

  // Deposit Fiat
  EXCHANGEDEPOSITEDON: "Exchange Deposited On",
  DEPOSITTOEXCHANGE: "Deposit To Exchange",

  // Withdraw Fiat
  WITHDRAWEXCHANGED: "Withdraw Exchanged",
  EXCHANGETOWITHDRAW: "Exchange To Withdraw",

  // Fixed terms
  LOCKINGTERMDEPOSIT: "Locking Term Deposit",
  FIXEDTERMINTEREST: "Fixed Term Interest",
  UNLOCKINGTERMDEPOSIT: "Unlocking Term Deposit",

  // Top up
  TOPUPCRYPTO: "Top up Crypto",

  // Dividend
  DIVIDEND: "Dividend",

  // Manual sell
  MANUALSELLORDER: "Manual Sell Order",
} as const;

export type TransactionTypeValue =
  (typeof TransactionType)[keyof typeof TransactionType];

/** Transaction types that are internal transfers and should be skipped for balance calculations */
export const INTERNAL_TRANSFER_TYPES = new Set<string>([
  TransactionType.LOCKINGTERMDEPOSIT,
  TransactionType.UNLOCKINGTERMDEPOSIT,
  TransactionType.EXCHANGETOWITHDRAW,
  TransactionType.EXCHANGEDEPOSITEDON,
  TransactionType.TRANSFERIN,
  TransactionType.TRANSFEROUT,
  TransactionType.CREDITCARDSTATUS,
  TransactionType.REPAYMENT,
  TransactionType.LIQUIDATION,
]);
