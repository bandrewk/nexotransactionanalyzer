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

  // Credit line and card payments
  EXCHANGECREDIT: "Exchange Credit",
  CREDITCARDWITHDRAWALCREDIT: "Credit Card Withdrawal Credit",
  NEXOCARDTRANSACTIONFEE: "Nexo Card Transaction Fee",
  EXCHANGELIQUIDATION: "Exchange Liquidation",
  NEXOCARDREFUND: "Nexo Card Refund",
  NEXOCARDCASHBACKREVERSAL: "Nexo Card Cashback Reversal",

  // Advanced trading
  TRANSFERTOADVANCED: "Transfer To Advanced",
  TRANSFERFROMADVANCED: "Transfer From Advanced",

  // Collateral and leverage
  EXCHANGEBOOSTER: "Exchange Booster",
  EXCHANGECOLLATERAL: "Exchange Collateral",

  // Loan operations
  LOANWITHDRAWAL: "Loan Withdrawal",
  INTERESTDISCOUNT: "Interest Discount",
} as const;

export type TransactionTypeValue =
  (typeof TransactionType)[keyof typeof TransactionType];

export type HoldingEffect =
  | "ignore"        // no holding moves: internal, credit-line, or wrapper
  | "generic"       // input +=, and output += when currencies differ
  | "debit-input";  // input written positive but means an outflow; output is not a holding

export type CurrencyClass = "credit-line" | "known" | "unknown" | "absent";

export type TypeRule = {
  effect: HoldingEffect;
  /** Why, in words a user can read. Rendered on File Details. */
  why: string;
  /** Shapes this rule was written against. Anything else is reported, not silently handled. */
  expectedShapes: string[];
  /** Expected currency classifications for input/output assets where evidence supports it. */
  expectedCurrencies?: {
    input?: CurrencyClass[];
    output?: CurrencyClass[];
  };
  /** "observed" = evidenced by exported data or Nexo's published documentation; "inferred" = best reading, unconfirmed. */
  confidence: "observed" | "inferred";
};

export const TYPE_RULES: Record<TransactionTypeValue, TypeRule> = {
  // Already recognised (22)
  [TransactionType.INTEREST]: {
    effect: "generic",
    why: "Interest earned on held crypto or fiat assets, credited to the balance. A negative amount debits the balance instead: Nexo uses this same type for a credit-line interest charge, a reversal and an adjustment, and states the export carries no marker telling them apart.",
    // Negative shapes are omitted so the diagnostic report samples them.
    expectedShapes: ["in+ out+ same", "in0 out0 same", "in0 out0 diff"],
    confidence: "observed",
  },
  [TransactionType.FIXEDTERMINTEREST]: {
    effect: "generic",
    why: "Interest paid on fixed-term deposits upon maturity, credited to the balance.",
    expectedShapes: ["in+ out+ same"],
    confidence: "observed",
  },
  [TransactionType.DEPOSIT]: {
    effect: "generic",
    why: "External deposit into the account, credited to the balance.",
    expectedShapes: ["in+ out+ same"],
    confidence: "inferred",
  },
  [TransactionType.WITHDRAWAL]: {
    effect: "generic",
    why: "External withdrawal out of the account, debited from the balance.",
    expectedShapes: ["in- out+ same"],
    confidence: "observed",
  },
  [TransactionType.EXCHANGE]: {
    effect: "generic",
    why: "Spot exchange trading one asset for another. Debits the sold asset and credits the bought asset.",
    expectedShapes: ["in- out+ diff"],
    confidence: "observed",
  },
  [TransactionType.TRANSFERIN]: {
    effect: "ignore",
    why: "Internal wallet-to-wallet transfer into the account. Ignored because overall platform holdings do not change.",
    expectedShapes: ["in+ out+ same"],
    confidence: "observed",
  },
  [TransactionType.TRANSFEROUT]: {
    effect: "ignore",
    why: "Internal wallet-to-wallet transfer out of the account. Ignored because overall platform holdings do not change.",
    expectedShapes: ["in- out+ same", "in0 out0 same", "in- out0 diff"],
    confidence: "observed",
  },
  [TransactionType.CREDITCARDSTATUS]: {
    effect: "ignore",
    why: "Card purchase in Credit Mode, funded by the credit line rather than held assets. Holdings are unchanged. (Debit Mode card purchases spend held assets and remain an open issue.)",
    expectedShapes: ["in- out+ diff", "in0 out0 diff", "in+ out+ diff"],
    expectedCurrencies: {
      input: ["credit-line"],
    },
    confidence: "observed",
  },
  [TransactionType.LIQUIDATION]: {
    effect: "ignore",
    why: "Legacy loan liquidation row type. Ignored for backward compatibility with existing account exports; see Exchange Liquidation for current credit-line liquidations.",
    expectedShapes: ["in- out+ same"],
    confidence: "observed",
  },
  [TransactionType.REPAYMENT]: {
    effect: "ignore",
    why: "Manual repayment of an outstanding loan. Treated as a loan-side entry that does not change the assets you hold. This is imperfect: a repayment does spend assets, so the figures here may understate what left the account.",
    expectedShapes: ["in+ out0 same"],
    confidence: "observed",
  },
  [TransactionType.MANUALSELLORDER]: {
    effect: "generic",
    why: "Asset sold to cover debt or spend funds. Debits the sold asset with no credited output holding.",
    expectedShapes: ["in- out0 same", "in- out+ same"],
    confidence: "observed",
  },
  [TransactionType.CASHBACK]: {
    effect: "generic",
    why: "Nexo Card purchase cashback reward, credited to the balance.",
    expectedShapes: ["in+ out+ same"],
    confidence: "observed",
  },
  [TransactionType.EXCHANGECASHBACK]: {
    effect: "generic",
    why: "Cashback reward earned on an exchange transaction, credited to the balance.",
    expectedShapes: ["in+ out+ same"],
    confidence: "observed",
  },
  [TransactionType.REFERRALBONUS]: {
    effect: "generic",
    why: "Bonus received from the referral program, credited to the balance.",
    expectedShapes: ["in+ out+ same"],
    confidence: "observed",
  },
  [TransactionType.DIVIDEND]: {
    effect: "generic",
    why: "NEXO token loyalty dividend distribution, credited to the balance.",
    expectedShapes: ["in+ out+ same"],
    confidence: "observed",
  },
  [TransactionType.DEPOSITTOEXCHANGE]: {
    effect: "generic",
    why: "Fiat deposit converted to platform FIATx asset (e.g. EUR to EURx). Credited once to the balance after normalisation.",
    expectedShapes: ["in+ out+ same"],
    confidence: "observed",
  },
  [TransactionType.EXCHANGEDEPOSITEDON]: {
    effect: "ignore",
    why: "Paired internal conversion leg for fiat deposit. Ignored to avoid double-counting the deposit.",
    expectedShapes: ["in- out+ same"],
    confidence: "observed",
  },
  [TransactionType.WITHDRAWEXCHANGED]: {
    effect: "generic",
    why: "Fiat withdrawal leg converting platform FIATx to external fiat, debited from the balance.",
    expectedShapes: ["in- out+ same"],
    confidence: "observed",
  },
  [TransactionType.EXCHANGETOWITHDRAW]: {
    effect: "ignore",
    why: "Paired internal conversion leg for fiat withdrawal. Ignored to avoid double-counting the withdrawal.",
    expectedShapes: ["in+ out+ same"],
    confidence: "observed",
  },
  [TransactionType.LOCKINGTERMDEPOSIT]: {
    effect: "ignore",
    why: "Transfer locking flexible savings into a fixed-term deposit. Ignored because assets remain held on the platform.",
    expectedShapes: ["in- out+ same"],
    confidence: "observed",
  },
  [TransactionType.UNLOCKINGTERMDEPOSIT]: {
    effect: "ignore",
    why: "Transfer unlocking a matured fixed-term deposit back into flexible savings. Ignored because assets remain held on the platform.",
    expectedShapes: ["in+ out+ same"],
    confidence: "observed",
  },
  [TransactionType.TOPUPCRYPTO]: {
    effect: "generic",
    why: "External cryptocurrency deposit, credited to the balance.",
    expectedShapes: ["in+ out+ same", "in+ out0 same"],
    confidence: "observed",
  },

  // Newly recognised (12)
  [TransactionType.EXCHANGECREDIT]: {
    effect: "ignore",
    why: "Card funding conversion moving credit-line borrowing to fiat to pay a merchant. Ignored because Credit Mode purchases are funded by debt, and the paired merchant leg is also ignored.",
    expectedShapes: ["in- out+ diff"],
    expectedCurrencies: {
      input: ["credit-line"],
    },
    confidence: "observed",
  },
  [TransactionType.CREDITCARDWITHDRAWALCREDIT]: {
    effect: "ignore",
    why: "Credit-line borrow draw created by a card purchase in Credit Mode. Increases outstanding loan balance rather than held spot assets.",
    expectedShapes: ["in- out+ same", "in+ out+ same"],
    expectedCurrencies: {
      input: ["credit-line"],
    },
    confidence: "observed",
  },
  [TransactionType.NEXOCARDTRANSACTIONFEE]: {
    effect: "ignore",
    why: "Foreign exchange or transaction fee on card operations charged in credit-line units (xUSD). Ignored because xUSD is a credit line rather than a held wallet asset.",
    expectedShapes: ["in- out+ same"],
    expectedCurrencies: {
      input: ["credit-line"],
    },
    confidence: "observed",
  },
  // Shape does not encode direction, so a reversed row (credit line -> asset)
  // matches the same pattern. expectedCurrencies below is what catches it.
  [TransactionType.EXCHANGELIQUIDATION]: {
    effect: "debit-input",
    why: "An asset sold to repay card debt. The sold asset is debited; the credit-line proceeds are not a holding. The older Liquidation type is left ignored so existing balances do not move.",
    expectedShapes: ["in+ out+ diff"],
    expectedCurrencies: {
      input: ["known"],
      output: ["credit-line"],
    },
    confidence: "observed",
  },
  [TransactionType.TRANSFERTOADVANCED]: {
    effect: "ignore",
    why: "Asset transfer from the Savings Wallet to the Futures/Advanced Trading Wallet. Ignored because assets remain held on the platform.",
    expectedShapes: ["in- out0 diff"],
    confidence: "observed",
  },
  [TransactionType.TRANSFERFROMADVANCED]: {
    effect: "ignore",
    why: "Asset transfer from the Futures/Advanced Trading Wallet back to the Savings Wallet. Ignored because assets remain held on the platform.",
    expectedShapes: ["in+ out0 diff"],
    confidence: "observed",
  },
  [TransactionType.EXCHANGEBOOSTER]: {
    effect: "generic",
    why: "Booster exchange involving credit exposure. Treated as a spot exchange between the input and output assets.",
    expectedShapes: ["in- out+ diff"],
    confidence: "observed",
  },
  [TransactionType.EXCHANGECOLLATERAL]: {
    effect: "generic",
    why: "Collateral swap inside the Credit Wallet. Both assets remain user property, so input is debited and output is credited.",
    expectedShapes: ["in- out+ diff"],
    confidence: "observed",
  },
  [TransactionType.NEXOCARDREFUND]: {
    effect: "generic",
    why: "Merchant refund for a card purchase, credited to the savings balance in the card currency.",
    expectedShapes: ["in+ out+ same", "in+ out+ diff"],
    confidence: "observed",
  },
  [TransactionType.NEXOCARDCASHBACKREVERSAL]: {
    effect: "ignore",
    why: "Clawback of previously granted card cashback. Ignored because the exact reward currency being clawed back is not identified in the CSV.",
    expectedShapes: ["in- out+ diff", "in- out+ same"],
    confidence: "inferred",
  },
  [TransactionType.LOANWITHDRAWAL]: {
    effect: "generic",
    why: "Credit-line borrow withdrawal. The received asset is credited to the balance; whether external payouts appear in this row type remains unconfirmed.",
    expectedShapes: ["in- out+ diff"],
    confidence: "inferred",
  },
  [TransactionType.INTERESTDISCOUNT]: {
    effect: "ignore",
    why: "Discount applied to loan interest charged on the credit line. Ignored because it adjusts credit-line debt rather than held wallet balances. Unconfirmed: this reading comes from Nexo support commentary, not from the data or any documentation, and rests on a single row.",
    expectedShapes: ["in+ out0 diff"],
    confidence: "inferred",
  },
};

/**
 * The types whose effect is `ignore`, as a set.
 *
 * Derived from `TYPE_RULES`, which `calculateBalances` reads directly. This set
 * exists for the guard test that pins the types skipped before the rule table.
 * Remove it only together with that test.
 */
export const INTERNAL_TRANSFER_TYPES = new Set<string>(
  Object.entries(TYPE_RULES)
    .filter(([, r]) => r.effect === "ignore")
    .map(([t]) => t)
);

/** Safely look up a type rule without inheriting properties from Object.prototype. */
export function getTypeRule(type: string): TypeRule | undefined {
  return Object.prototype.hasOwnProperty.call(TYPE_RULES, type)
    ? TYPE_RULES[type as TransactionTypeValue]
    : undefined;
}

