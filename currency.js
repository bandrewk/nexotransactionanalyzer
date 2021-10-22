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
  #m_amount;
  #m_fFiatEquivalent;
  #m_fInterestEarned; // in coin value, NOT USD

  #m_sDateAdded;
  #m_fAmountAdded;

  constructor(type, amount = 0) {
    this.#m_type = type;
    this.SetAmount(amount);
    this.SetInterestEarned(0);

    this.#m_sDateAdded = [];
    this.#m_fAmountAdded = [];
  }

  AddDate(value) {
    this.#m_sDateAdded.push(value);
  }

  AddAmount(value) {
    this.#m_fAmountAdded.push(value);
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
    return this.#m_amount;
  }

  SetAmount(amount) {
    this.#m_amount = amount;
  }

  AddAmount(amount) {
    this.#m_amount += amount;
  }

  GetFiatEquivalent() {
    return this.#m_fFiatEquivalent;
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

  GetExchangeRate() {
    fetch(`https://api.coinbase.com/v2/exchange-rates?currency=${this.#m_type}`)
      .then((response) => response.json())
      .then(
        (data) =>
          (this.#m_fFiatEquivalent =
            parseFloat(data.data.rates.USD) * parseFloat(this.GetAmount()))
      );
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
