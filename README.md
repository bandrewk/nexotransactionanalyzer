# Nexo.io transaction analyzer

Analyzer web app for nexo.io's csv export.

Source code of www.nexo-ta.com

Supports all currencies.

Version 1 implemented transactions (taken from `js/transaction.js`):

```Javascript
export const TransactionType = {
  // Basic types
  INTEREST: `Interest`,
  DEPOSIT: `Deposit`,
  WITHDRAWAL: `Withdrawal`,
  EXCHANGE: `Exchange`,

  // Cashback
  EXCHANGECASHBACK: `Exchange Cashback`,

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
```

Other transactions are not yet implemented because of lack of data. I simply haven`t seen them yet.
