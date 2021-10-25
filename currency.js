`use strict`;

/////////////////////////////////////////////////////
/// Transaction type definitions
/////////////////////////////////////////////////////
export const CurrencyType = {
  //
  BTC: "BTC",
  ETH: "ETH",
  XRP: "XRP",

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
};

Object.freeze(CurrencyType);

/////////////////////////////////////////////////////
/// Transaction
/////////////////////////////////////////////////////
export class Currency {
  #m_type;
  #m_fAmount;
  #m_fFiatEquivalent;
  #m_fInterestEarned; // in coin value, NOT USD

  // TX
  #m_sDateAdded;
  #m_fAmountAdded;

  // MAP
  #m_portfolioValue;

  constructor(type, amount = 0) {
    this.#m_type = type;
    this.SetAmount(amount);
    this.SetInterestEarned(0);

    this.#m_sDateAdded = [];
    this.#m_fAmountAdded = [];
  }

  GetPortfolioValue() {
    return this.#m_portfolioValue;
  }

  SetPortfolioValue(value) {
    this.#m_portfolioValue = value;
  }

  AddTXDate(value) {
    this.#m_sDateAdded.push(value);
  }

  // Returns array
  GetTXDates() {
    return this.#m_sDateAdded;
  }

  AddTXAmount(value) {
    this.#m_fAmountAdded.push(value);
  }

  // Returns array
  GetTXAmounts() {
    return this.#m_fAmountAdded;
  }

  GetInterestEarned() {
    return this.#m_fInterestEarned;
  }

  SetInterestEarned(amount) {
    this.#m_fInterestEarned = parseFloat(amount);
  }

  AddInterestEarned(amount) {
    this.#m_fInterestEarned += parseFloat(amount);
  }

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

  GetFiatEquivalent() {
    return this.#m_fFiatEquivalent;
  }

  SetFiatEquivalent(amount) {
    this.#m_fFiatEquivalent = amount;
  }

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

  GetExchangeRate(history = false) {
    if (history) {
      this.GetPortfolioValue().forEach((v, k, m) => {
        //console.log(k);

        if (
          this.GetType() == CurrencyType.NEXO ||
          this.GetType() == CurrencyType.XRP
        ) {
          // fetch(
          //   `https://api.coingecko.com/api/v3/coins/${this.#m_type.toLowerCase()}/history?date=${
          //     k.substring(8, 10) +
          //     `-` +
          //     k.substring(5, 7) +
          //     `-` +
          //     k.substring(0, 4)
          //   }`
          // )
          //   .then((response) => response.json())
          //   .then((data) => console.log(data));
          // console.log(
          //   `https://api.coingecko.com/api/v3/coins/${
          //     this.#m_type
          //   }/history?date=${
          //     k.substring(8, 10) +
          //     `-` +
          //     k.substring(5, 7) +
          //     `-` +
          //     k.substring(0, 4)
          //   }`
          // );

          //dd-mm-year
          // year-mm-dd
          return;
        }
        fetch(
          `https://api.coinbase.com/v2/prices/${
            this.#m_type
          }-USD/spot?date=${k}`
        )
          .then((response) => response.json())
          .then((data) => console.log(data));
      });
    }
  }

  GetExchangeRateAsAPIString() {
    return `https://api.coinbase.com/v2/exchange-rates?currency=${
      this.#m_type
    }`;
  }

  IsCrypto() {
    if (!this.IsFiat() && !this.IsStableCoin()) return true;
    else return false;
  }

  IsFiat() {
    if (
      this.GetType() === CurrencyType.EUR ||
      this.GetType() === CurrencyType.USD ||
      this.GetType() === CurrencyType.GBP
    )
      return true;
    else return false;
  }

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
