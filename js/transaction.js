/**
 *  NEXO Transaction Analyzer, a .csv transactions insight tool
    Copyright (C) 2022 Bryan Andrew King

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
/**
 * Possible transaction types
 */
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

Object.freeze(TransactionType);

const FIXED_DECIMALS = 4;

/**
 * Transaction module
 *
 * A single transaction is made up from this
 */
export class CTransaction {
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

  /**
   * Get transaction id
   * @returns Transaction id
   */
  GetId() {
    return this.#m_sId;
  }

  /**
   * Get transaction type
   * @returns Transaction type
   */
  GetType() {
    return this.#m_sType;
  }

  /**
   * Get currency as string
   * @returns Curreny as string
   */
  GetCurrency() {
    return this.#m_sCurrency;
  }

  /**
   * Get transaction amount in coin value
   * @param {} fixed boolean use fixed decimals
   * @returns Transaction amount (in coin value)
   */
  GetAmount(fixed = false) {
    return fixed ? parseFloat(this.#m_fAmount).toFixed(FIXED_DECIMALS) : this.#m_fAmount;
  }

  /**
   * Get transaction amount in usd value
   * @param {} fixed boolean use fixed decimals
   * @returns Transaction amount (in usd value)
   */
  GetUSDEquivalent(fixed = false) {
    // prettier-ignore
    return fixed ? parseFloat(this.#m_fUSDEquivalent).toFixed(FIXED_DECIMALS) : this.#m_fUSDEquivalent;
  }

  /**
   * Transaction details
   * @returns details string
   */
  GetDetails() {
    return this.#m_sDetails;
  }

  /**
   * Get outstanding loan amount in usd value
   * @param {} fixed boolean use fixed decimals
   * @returns Outstanding loan amount (in usd value)
   */
  GetOutstandingLoan(fixed = false) {
    // prettier-ignore
    return fixed ? parseFloat(this.#m_fOutstandingLoan).toFixed(FIXED_DECIMALS) : this.#m_fOutstandingLoan;
  }

  /**
   * Get transaction date
   * @returns Transaction date as string
   */
  GetDateTime() {
    return this.#m_sDateTime;
  }

  /**
   * Fix NEXONEXO currency entries
   */
  #FixCurrency() {
    if (this.#m_sCurrency.search(`NEXO`) < 0) return;

    if (this.#m_sCurrency === `NEXONEXO`) this.#m_sCurrency = `NEXO`;
    let nexoCorrect = this.#m_sCurrency.search(`NEXONEXO`);
    if (nexoCorrect >= 0) {
      this.#m_sCurrency = this.#m_sCurrency.substr(0, nexoCorrect) + `NEXO`;
    }
  }
}
