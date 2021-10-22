`use strict`;

/////////////////////////////////////////////////////
/// Transaction type definitions
/////////////////////////////////////////////////////
export const TransactionType = {
  // Basic types
  INTEREST: `Interest`,
  DEPOSIT: `Deposit`,
  WITHDRAWAL: `Withdrawal`,
  EXCHANGE: `Exchange`,

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

Object.freeze(TransactionType);

const FIXED_DECIMALS = 4;

/////////////////////////////////////////////////////
/// Transaction
/////////////////////////////////////////////////////
export class Transaction {
  #m_sId;
  #m_sType;
  #m_sCurrency;
  #m_fAmount;
  #m_fUSDEquivalent;
  #m_sDetails;
  #m_fOutstandingLoan;
  #m_sDateTime;

  constructor(id, type, currency, amount, usde, details, oloan, datetime) {
    this.#m_sId = id;
    this.#m_sType = type;
    this.#m_sCurrency = currency;
    this.#m_fAmount = amount;
    this.#m_fUSDEquivalent = usde.slice(1);
    this.#m_sDetails = details;
    this.#m_fOutstandingLoan = oloan.slice(1);
    this.#m_sDateTime = datetime;

    this.#FixCurrency();
  }

  GetId() {
    return this.#m_sId;
  }

  GetType() {
    return this.#m_sType;
  }

  GetCurrency() {
    return this.#m_sCurrency;
  }

  GetAmount(fixed = false) {
    // prettier-ignore
    return fixed ? parseFloat(this.#m_fAmount).toFixed(FIXED_DECIMALS) : this.#m_fAmount;
  }

  GetUSDEquivalent(fixed = false) {
    // prettier-ignore
    return fixed ? parseFloat(this.#m_fUSDEquivalent).toFixed(FIXED_DECIMALS) : this.#m_fUSDEquivalent;
  }

  GetDetails() {
    return this.#m_sDetails;
  }

  GetOutstandingLoan(fixed = false) {
    // prettier-ignore
    return fixed ? parseFloat(this.#m_fOutstandingLoan).toFixed(FIXED_DECIMALS) : this.#m_fOutstandingLoan;
  }

  GetDateTime() {
    return this.#m_sDateTime;
  }

  // Fix NEXONEXO currency entries
  #FixCurrency() {
    if (this.#m_sCurrency.search(`NEXO`) < 0) return;

    if (this.#m_sCurrency === `NEXONEXO`) this.#m_sCurrency = `NEXO`;
    let nexoCorrect = this.#m_sCurrency.search(`NEXONEXO`);
    if (nexoCorrect >= 0) {
      this.#m_sCurrency = this.#m_sCurrency.substr(0, nexoCorrect) + `NEXO`;
    }
  }
}
