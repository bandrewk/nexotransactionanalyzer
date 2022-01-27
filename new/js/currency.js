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
`use strict`;

/////////////////////////////////////////////////////
/// Transaction type definitions
/////////////////////////////////////////////////////
export const CurrencyType = {
  BTC: "BTC",
  BCH: "BCH",
  LTC: "LTC",

  EOS: "EOS",
  BNB: "BNB",
  XLM: "XLM",

  ETH: "ETH",
  XRP: "XRP",

  PAXG: "PAXG",
  TRX: "TRX",
  ADA: "ADA",
  DOT: "DOT",
  DOGE: "DOGE",
  SOL: "SOL",

  // ERC-20
  NEXO: "NEXO",
  LINK: "LINK",

  // Stable Coins
  DAI: "DAI",
  TUSD: "TUSD",
  USDP: "USDP",
  USDC: "USDC",
  USDT: "USDT",

  // Fiat
  EUR: "EUR",
  USD: "USD",
  GBP: "GBP",
}; //24

Object.freeze(CurrencyType);

/**
 * Curreny module
 * This represents a single currency like ETH or BTC.
 */
export class CCurrency {
  /**
   * Currency type
   */
  #m_type;

  /**
   * Amount
   */
  #m_fAmount;

  /**
   * USD equivalent
   */
  #m_fUSDEquivalent;

  /**
   * Interest earned in coin value, NOT USD!!
   */
  #m_fInterestEarnedInKind;

  /**
   * Interest earned in USD
   */
  #m_fInterestEarnedInUSD;

  // TX
  #m_arrDateAdded; // Array of strings
  #m_arrAmountAdded; // Array of numbers

  // MAP
  #m_portfolioValue;

  constructor(type, amount = 0) {
    this.#m_type = type;
    this.SetAmount(amount);
    this.SetInterestEarnedInKind(0);
    this.SetInterestEarnedInUSD(0);
    this.SetUSDEquivalent(0);

    this.#m_arrDateAdded = [];
    this.#m_arrAmountAdded = [];
  }

  /////////////////////////////////////////////////////////////////////////////
  // Trying to get the portfolio value to work here..
  /////////////////////////////////////////////////////////////////////////////
  GetPortfolioValue() {
    return this.#m_portfolioValue;
  }

  SetPortfolioValue(value) {
    this.#m_portfolioValue = value;
  }

  AddTXDate(value) {
    this.#m_arrDateAdded.push(value);
  }

  // Returns array
  GetTXDates() {
    return this.#m_arrDateAdded;
  }

  AddTXAmount(value) {
    this.#m_arrAmountAdded.push(value);
  }

  // Returns array
  GetTXAmounts() {
    return this.#m_arrAmountAdded;
  }

  /////////////////////////////////////////////////////////////////////////////
  // In-coin interest earned
  /////////////////////////////////////////////////////////////////////////////
  GetInterestEarnedInKind() {
    return this.#m_fInterestEarnedInKind;
  }

  SetInterestEarnedInKind(amount) {
    this.#m_fInterestEarnedInKind = parseFloat(amount);
  }

  AddInterestEarnedInKind(amount) {
    this.#m_fInterestEarnedInKind += parseFloat(amount);
  }

  /////////////////////////////////////////////////////////////////////////////
  // In-coin interest earned as USD
  /////////////////////////////////////////////////////////////////////////////
  GetInterestEarnedInUSD() {
    return this.#m_fInterestEarnedInUSD;
  }

  SetInterestEarnedInUSD(amount) {
    this.#m_fInterestEarnedInUSD = parseFloat(amount);
  }

  /////////////////////////////////////////////////////////////////////////////
  //
  /////////////////////////////////////////////////////////////////////////////
  GetType() {
    return this.#m_type;
  }

  GetAmount() {
    return this.#m_fAmount;
  }

  SetAmount(amount) {
    this.#m_fAmount = amount;
  }

  AddAmount(amount) {
    this.#m_fAmount += amount;
  }

  /////////////////////////////////////////////////////////////////////////////
  // Current USD value of amount
  /////////////////////////////////////////////////////////////////////////////
  GetUSDEquivalent() {
    return this.#m_fUSDEquivalent;
  }

  SetUSDEquivalent(amount) {
    this.#m_fUSDEquivalent = amount;
  }

  /// TODO Add all currencies
  GetFullName() {
    switch (this.#m_type) {
      // Currencies
      case CurrencyType.BTC:
        {
          return "Bitcoin";
        }
        break;
      case CurrencyType.ETH:
        {
          return "Ethereum";
        }
        break;
      case CurrencyType.XRP:
        {
          return "XRP";
        }
        break;
      // ERC-20 Tokens
      case CurrencyType.NEXO:
        {
          return "NEXO Token";
        }
        break;
      case CurrencyType.LINK:
        {
          return "Chainlink";
        }
        break;
      // FIAT
      case CurrencyType.EUR:
        {
          return "Euro";
        }
        break;
      case CurrencyType.USD:
        {
          return "Dollar";
        }
        break;
      default: {
        return `not implemented`;
      }
    }
  }

  // TODO: This is a mess! And currently only used to figure out portfoliio value
  // FIXME
  GetExchangeRate(history = false) {
    let urls = [];
    this.GetPortfolioValue().forEach((v, k, m) => {
      //console.log(k);

      if (
        this.GetType() == CurrencyType.NEXO || // TODO Coinbase also has no historic data for EUR
        this.GetType() == CurrencyType.XRP
      ) {
        let type = this.GetType().toLowerCase();

        if (this.GetType() === CurrencyType.XRP) type = `ripple`; // coingecko api id for xrp is `ripple`

        urls.push(
          `https://api.coingecko.com/api/v3/coins/${type}/history?date=${
            k.substr(-2) + `-` + k.substring(5, 7) + `-` + k.substring(0, 4)
          }`
        );
        // fetch(
        //   `https://api.coingecko.com/api/v3/coins/${type}/history?date=${
        //     k.substr(-2) + `-` + k.substring(5, 7) + `-` + k.substring(0, 4)
        //   }`
        // )
        //   .then((response) => response.json())
        //   .then((data) => console.log(data));

        // console.log(
        //   `https://api.coingecko.com/api/v3/coins/${this.#m_type.toLowerCase()}/history?date=${
        //     k.substr(-2) + `-` + k.substring(5, 7) + `-` + k.substring(0, 4)
        //   }`
        // );

        //dd-mm-year
        // year-mm-dd
        return;
      } else {
        // TODO move to top so other api calls can access this too...
        // Set new date to 1st of next month
        let desiredDate = new Date(parseInt(k.substring(0, 4)), parseInt(k.substring(5, 7)) + 1, 1);

        // -1 = Last day of last month
        desiredDate.setDate(desiredDate.getDate() - 1);

        // If we reached the current month take todays date as we can't predict the future
        if (desiredDate > Date.now()) {
          desiredDate = new Date(Date.now());
        }

        // Format date for coinbase api (YYYY-MM-DD)
        const dateformated =
          desiredDate.getFullYear() +
          `-` +
          (`0` + `${desiredDate.getMonth() + 1}`).substr(-2) +
          `-` +
          desiredDate.getDate();

        urls.push(
          `https://api.coinbase.com/v2/prices/${this.#m_type}-USD/spot?date=${dateformated}`
        );

        // fetch(
        //   `https://api.coinbase.com/v2/prices/${
        //     this.#m_type
        //   }-USD/spot?date=${dateformated}`
        // )
        //   .then((response) => response.json())
        //   .then((data) => console.log(data));
      }
    });
    return urls;
  }

  /**
   * Gets the api string to request current exchange rate
   * @returns API string to request exchange rate
   */
  GetExchangeAPIString() {
    return `https://api.coinbase.com/v2/exchange-rates?currency=${this.#m_type}`;
  }

  /////////////////////////////////////////////////////////////////////////////
  // Helper methods to identify currency type
  /////////////////////////////////////////////////////////////////////////////
  /**
   * Is currency crypto?
   * Warning: does not include stable-cryptos!
   * @returns true if currency is crypto
   */
  IsCrypto() {
    if (!this.IsFiat() && !this.IsStableCoin()) return true;
    else return false;
  }

  /**
   * Is currency FIAT?
   * @returns true if currency is FIAT
   */
  IsFiat() {
    if (
      this.GetType() === CurrencyType.EUR ||
      this.GetType() === CurrencyType.USD ||
      this.GetType() === CurrencyType.GBP
    )
      return true;
    else return false;
  }

  /**
   * Is currency a stablecoin?
   * @returns true if currency is a stablecoin
   */
  IsStableCoin() {
    if (
      this.GetType() === CurrencyType.DAI ||
      this.GetType() === CurrencyType.TUSD ||
      this.GetType() === CurrencyType.USDP ||
      this.GetType() === CurrencyType.USDC ||
      this.GetType() === CurrencyType.USDT
    )
      return true;
    else return false;
  }
}
