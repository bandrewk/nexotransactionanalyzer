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

/**
 * Currency type definitions
 * The string equals to the definition in the .csv file
 */
export const CurrencyType = {
  // Diverse blockchains
  // Note: Use coingecko whenever possible !! it's much much faster due to its range function than coinbase
  // See helper methods for name conversion on bottom of this file, one COULD do this via the coingecko API too (search function) but we're on limited API requests so it's hardcoded.
  BTC: "BTC", // ✅ Fully working ✅ Coinbase API with histroic data ✅ Coingecko API with histroic data (id: bitcoin)
  BCH: "BCH", // ✅ Fully working ✅ Coinbase API with histroic data ✅ Coingecko API with histroic data (id: bitcoin-cash)
  LTC: "LTC", // ✅ Fully working ✅ Coinbase API with histroic data ✅ Coingecko API with histroic data (id: litecoin)

  EOS: "EOS", // ✅ Fully working ✅ Coinbase API with histroic data ✅ Coingecko API with histroic data (id: eos)
  BNB: "BNB", // ✅ Fully working ❌ Coinbase API ✅ Coingecko API with histroic data (id: binancecoin)
  XLM: "XLM", // ✅ Fully working ✅ Coinbase API with histroic data ✅ Coingecko API with histroic data (id: stellar)

  ETH: "ETH", // ✅ Fully working ✅ Coinbase API with histroic data ✅ Coingecko API with histroic data (id: ethereum)
  XRP: "XRP", // ✅ Fully working ❌ Coinbase API ✅ Coingecko API with histroic data (id: ripple)

  TRX: "TRX", // ✅ Fully working ❌ Coinbase API ✅ Coingecko API with histroic data (id: tron)
  ADA: "ADA", // ✅ Fully working ✅ Coinbase API with histroic data ✅ Coingecko API with histroic data (id: cardano)
  DOT: "DOT", // ✅ Fully working ✅ Coinbase API with histroic data ✅ Coingecko API with histroic data (id: polkadot)
  DOGE: "DOGE", // ✅ Fully working ✅ Coinbase API with histroic data ✅ Coingecko API with histroic data (id: dogecoin)
  MATIC: "MATIC", // ✅ Fully working ✅ Coinbase API with histroic data ✅ Coingecko API with histroic data (id: matic-network)

  // ❌ Disabled top ups (no tx linking)
  SOL: "SOL", // ✅ Fully working ✅ Coinbase API with histroic data ✅ Coingecko API with histroic data (id: solana)
  LUNA: "LUNA", // ✅ Fully working ❌ Coinbase API ✅ Coingecko API with histroic data (id: terra-luna)
  FTM: "FTM", // ✅ Fully working ❌ Coinbase API ✅ Coingecko API with histroic data (id: fantom)
  AVAX: "AVAX", // ✅ Fully working ✅ Coinbase API with histroic data ✅ Coingecko API with histroic data (id: avalanche-2)
  UST: "UST", // ✅ Fully working ✅ Coinbase API with histroic data ✅ Coingecko API with histroic data (id: terrausd)
  ATOM: "ATOM", // ✅ Fully working ✅ Coinbase API with histroic data ✅ Coingecko API with histroic data (id: cosmos)

  // ERC-20
  NEXO: "NEXO", // ✅ Fully working (ERC20) ❌ Not working for BEP20 ❌ Coinbase API ✅ Coingecko API with histroic data (id: nexo)
  LINK: "LINK", // ✅ Fully working (ERC20) ✅ Coinbase API with histroic data ✅ Coingecko API with histroic data (id: chainlink)
  PAXG: "PAXG", // ✅ Fully working (ERC20) ❌ Coinbase API ✅ Coingecko API with histroic data (id: pax-gold)
  AXS: "AXS", // ✅ Fully working (ERC20) ✅ Coinbase API with histroic data ✅ Coingecko API with histroic data (id: axie-infinity)
  UNI: "UNI", // ✅ Fully working (ERC20) ✅ Coinbase API with histroic data ✅ Coingecko API with histroic data (id: uniswap)

  // Stable Coins
  DAI: "DAI", // ✅ Fully working (ERC20) ✅ Coinbase API with histroic data ✅ Coingecko API with histroic data (id: dai)
  TUSD: "TUSD", // ✅ Fully working (ERC20) ❌ Coinbase API ✅ Coingecko API with histroic data (id: true-usd)
  USDP: "USDP", // ✅ Fully working (ERC20) ❌ Coinbase API ✅ Coingecko API with histroic data (id: paxos-standard)
  USDC: "USDC", // ✅ Fully working (ERC20) ✅ Coinbase API with histroic data ✅ Coingecko API with histroic data (id: usd-coin)
  USDT: "USDT", // ✅ Fully working (ERC20) ✅ Coinbase API with histroic data ✅ Coingecko API with histroic data (id: tether)

  // Fiat
  EUR: "EUR", // ✅ Fully working ❌ Coinbase API (responds but empty) ❌ Coingecko API
  USD: "USD", // ✅ Fully working ❌ Coinbase API (responds but empty) ❌ Coingecko API
  GBP: "GBP", // ✅ Fully working ❌ Coinbase API (responds but empty) ❌ Coingecko API
}; // 32 currencies supported as of 15.02.2022

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

  /**
   * Cashback received in kind,  not USD
   */
  #m_fCashbackReceivedInKind;

  /**
   * Cashback received in USD
   */
  #m_fCashbackReceivedInUSD;

  /**
   * Transaction history dates + amounts (in-kind) (map)
   */
  #m_arrTransaction;

  /**
   * Historic price data
   *  dates + amounts (in usd) (map)
   */
  #m_arrHistoricPriceData;

  constructor(type, amount = 0) {
    this.#m_type = type;
    this.SetAmount(amount);
    this.SetUSDEquivalent(0);

    // Interest
    this.#m_fInterestEarnedInKind = 0;
    this.#m_fInterestEarnedInUSD = 0;

    // Cashback
    this.#m_fCashbackReceivedInKind = 0;
    this.#m_fCashbackReceivedInUSD = 0;

    this.#m_arrTransaction = new Map();
    this.#m_arrHistoricPriceData = new Map();
  }

  AddTransactionByDate(date, amount) {
    if (this.#m_arrTransaction.get(date)) {
      this.#m_arrTransaction.set(date, this.GetAmount()); //this.#m_arrTransaction.get(date) + parseFloat(amount));
    } else this.#m_arrTransaction.set(date, this.GetAmount()); //parseFloat(amount));

    if (new Date(date) < window.FIRST_TRANSACTION) window.FIRST_TRANSACTION = new Date(date);

    //console.log(`Date: ${date} / ${this.GetAmount()} / ${this.GetType()}`);
  }

  GetTransactions() {
    return this.#m_arrTransaction;
  }

  GetHistoricPriceData() {
    return this.#m_arrHistoricPriceData;
  }

  /////////////////////////////////////////////////////////////////////////////
  // In-coin interest earned
  /////////////////////////////////////////////////////////////////////////////
  /**
   * Add interest in-kind value. Adds to existing value.
   * @param {*} amount
   */
  AddInterestInKind(amount) {
    this.#m_fInterestEarnedInKind += parseFloat(amount);
  }

  /**
   * Get interest earned, in-kind
   * @returns interest earned in-kind value
   */
  GetInterestInKind() {
    return this.#m_fInterestEarnedInKind;
  }

  /**
   * Set interest earned in USD-value
   * @param {*} amount
   */
  SetInterestInUSD(amount) {
    this.#m_fInterestEarnedInUSD = parseFloat(amount);
  }

  /**
   * Get interest earned as USD value
   * @returns interest earned in USD value
   */
  GetInterestInUSD() {
    return this.#m_fInterestEarnedInUSD;
  }

  /////////////////////////////////////////////////////////////////////////////
  // Cashback
  /////////////////////////////////////////////////////////////////////////////
  /**
   * Add cashback value, in kind. Adds to existing value.
   * @param {*} amount
   */
  AddCashbackInKind(amount) {
    this.#m_fCashbackReceivedInKind += parseFloat(amount);
  }

  /**
   * Get cashback value, in kind
   * @returns cashback value in kind
   */
  GetCashbackInKind() {
    return this.#m_fCashbackReceivedInKind;
  }

  /**
   * Set cashback value in USD
   * @param {*} amount cashback value in USD
   */
  SetCashbackInUSD(amount) {
    this.#m_fCashbackReceivedInUSD += parseFloat(amount);
  }

  /**
   * Cashback value in USD
   * @returns Cashback in USD
   */
  GetCashbackInUSD() {
    return this.#m_fCashbackReceivedInUSD;
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

  /**
   * Fills all date and value gaps in the transaction array `m_arrTransaction`
   */
  FillTransactionGaps() {
    let dates = [...this.#m_arrTransaction.keys()];
    let values = [...this.#m_arrTransaction.values()];

    // Get all possible dates between the first transaction and today
    let fillerDates = this.#GetDatesBetween(new Date(dates[0]), window.LAST_TRANSACTION);
    console.log(`Start date: ${dates[0]}`);

    // Temp storage
    let temp = new Map();

    let xid = 0;
    // Starting at 1 because it includes the starting date
    for (let index = 1; index < fillerDates.length; index++) {
      let element = fillerDates[index];

      // Loop through already stored dates
      // Set the exact same value for all next dates till we find a new one,
      // then use the new one.
      for (let x = 0; x < dates.length; ) {
        if (element === dates[x]) {
          xid = x;
        }
        x++;
      }

      temp.set(element, values[xid]);
    }

    console.log(`Filling gaps for.. ${this.GetType()}`);
    console.log(temp);

    // Assign temp array
    this.#m_arrTransaction = temp;
  }

  /**
   * Get all possible dates between two dates
   * @param {*} startDate Start date
   * @param {*} endDate End date
   * @returns alle dates in between including start and end date as an array in YYYY-MM-DD format
   */
  #GetDatesBetween(startDate, endDate) {
    let dates = [];

    let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

    while (currentDate <= endDate) {
      dates.push(currentDate.toISOString().split("T")[0]); //YYYY-MM-DD

      currentDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate() + 1 // Swaps over to next month automatically
      );
    }

    return dates;
  }

  /**
   * Gets the api string to request current exchange rate
   * @returns API string to request exchange rate
   */
  GetExchangeAPIString() {
    return `https://api.coinbase.com/v2/exchange-rates?currency=${this.#m_type}`;
  }

  GetExchangeAPIStringHistoric() {
    this.FillTransactionGaps();

    let urls = [];
    this.#m_arrTransaction.forEach((v, k, m) => {
      if (this.#IsCoinbaseApiSupported()) {
        urls.push(`https://api.coinbase.com/v2/prices/${this.#m_type}-USD/spot?date=${k}`);
      } else if (this.#IsCoingeckoApiSupported()) {
        if ([...this.#m_arrTransaction.keys()].length < 10)
          urls.push(
            `https://api.coingecko.com/api/v3/coins/${this.#GetCoingeckoApiID()}/history?date=${
              k.substr(-2) + `-` + k.substring(5, 7) + `-` + k.substring(0, 4)
            }`
          );
      } else {
        console.log(`No API support for ${this.GetType()}`);
      }
    });

    if (urls.length > 0) return urls;

    if (this.GetType() === CurrencyType.EUR) {
      // Whee we can use the ECB to grab EUR to USD data :D
      //https://sdw-wsrest.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?startPeriod=2009-05-01&endPeriod=2009-05-31

      let dates = [...this.#m_arrTransaction.keys()];
      urls.push(
        `https://sdw-wsrest.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?startPeriod=${dates[0]}&endPeriod=${
          dates[dates.length - 1]
        }&detail=dataonly&format=jsondata`
      );
    }

    if (this.#IsCoingeckoApiSupported()) {
      //console.log(this.GetType());
      //console.log(this.#m_arrTransaction);
      let dates = [...this.#m_arrTransaction.keys()];

      // Sort data oldest to newest
      //if (!window.DEMO_MODE) dates = dates.reverse();

      const start = Math.floor(new Date(dates[0]).getTime() / 1000);
      const end = Math.floor(new Date(dates[dates.length - 1]).getTime() / 1000);

      //console.log(`Start: ${start}, end: ${end}`);
      urls.push(
        `https://api.coingecko.com/api/v3/coins/${this.#GetCoingeckoApiID()}/market_chart/range?vs_currency=usd&from=${start}&to=${end}`
      );
    }

    return urls;
  }

  /**
   * Receives the response of a single date request
   * @param {*} date date
   * @param {*} value price value
   */
  ReceiveData(date, value) {
    if (this.#m_arrTransaction.get(date)) {
      //console.log(`date found!`);
      this.#m_arrHistoricPriceData.set(date, value * this.#m_arrTransaction.get(date));
    }
  }

  /**
   * Receives the response of a range date request
   * @param {*} data range data
   */
  ReceiveCoingeckoRangeData(data) {
    let dates = [...this.#m_arrTransaction.keys()];
    let amount = [...this.#m_arrTransaction.values()];

    // Sort data oldest to newest
    /*if (!window.DEMO_MODE) {
      amount = amount.reverse();
      dates = dates.reverse();
    }*/

    // Convert dates to UNIX time format
    dates = dates.map((x) => Math.floor(new Date(x).getTime()));

    // Match data
    for (let i = 0; i < data.length; i++) {
      for (let x = 0; x < dates.length; x++) {
        if (data[i][0] == dates[x]) {
          // console.log(`Match found!`);
          this.#m_arrHistoricPriceData.set(new Date(dates[x]).toISOString().split("T")[0], amount[x] * data[i][1]);
        }
      }
    }
  }

  /**
   * Processes the response to EUR USD exchange rate from EU
   * @param {*} eData data array
   * @param {*} eDate date array
   */
  ReceiveEuropeRangeData(eData, eDate) {
    // We need to fill gaps in the data as holidays are not included in the response..
    // We are filling the europe response here!

    let dates = [...this.#m_arrTransaction.keys()];
    let amount = [...this.#m_arrTransaction.values()];

    // Get all possible dates between the first transaction and today
    let fillerDates = this.#GetDatesBetween(new Date(dates[0]), window.LAST_TRANSACTION);
    console.log(`Start date: ${dates[0]}`);

    // Temp storage
    let temp = new Map();

    let xid = 0;
    // Starting at 1 because it includes the starting date
    for (let index = 1; index < fillerDates.length; index++) {
      let element = fillerDates[index];

      // Loop through already stored dates
      // Set the exact same value for all next dates till we find a new one,
      // then use the new one.
      for (let x = 0; x < eDate.length; ) {
        if (element === eDate[x].id) {
          xid = x;
        }
        x++;
      }

      temp.set(element, eData[xid][0]);
    }

    const filledDates = [...temp.keys()];
    const filledValues = [...temp.values()];

    // Match data
    for (let i = 0; i < filledDates.length; i++) {
      for (let x = 0; x < dates.length; x++) {
        if (filledDates[i] == dates[x]) {
          //console.log(`Match found!`);
          this.#m_arrHistoricPriceData.set(new Date(dates[x]).toISOString().split("T")[0], amount[x] * filledValues[i]);
        }
      }
    }
  }

  /**
   * Set USD price 1:1 1USD = 1USD
   */
  SetUSDData() {
    this.#m_arrHistoricPriceData = this.#m_arrTransaction;
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
    if (this.GetType() === CurrencyType.EUR || this.GetType() === CurrencyType.USD || this.GetType() === CurrencyType.GBP)
      return true;
    else return false;
  }

  /**
   * Check if currency (supplied as string) is FIAT
   * @param {*} cur Currency string
   * @returns true if currency is fiat
   */
  static IsFiat(cur) {
    if (cur === CurrencyType.EUR || cur === CurrencyType.USD || cur === CurrencyType.GBP) return true;
    else return false;
  }

  /**
   * Check if currency (supplied as string) is FIATX (Nexos 1:1 pegged fiat token)
   * @param {*} cur Currency string
   * @returns true if currency is fiatX
   */
  static IsFiatX(cur) {
    if (cur === `EURX` || cur === `USDX` || cur === `GBPX`) return true;
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

  /**
   * Is ERC20 token? Includes ETH!
   * @returns True if currency is ERC20 token
   */
  IsERC20Token() {
    if (
      this.GetType() === CurrencyType.ETH ||
      this.GetType() === CurrencyType.LINK ||
      this.GetType() === CurrencyType.USDT ||
      this.GetType() === CurrencyType.NEXO ||
      this.GetType() === CurrencyType.USDC ||
      this.GetType() === CurrencyType.USDP ||
      this.GetType() === CurrencyType.TUSD ||
      this.GetType() === CurrencyType.DAI ||
      this.GetType() === CurrencyType.PAXG ||
      this.GetType() === CurrencyType.AXS ||
      this.GetType() === CurrencyType.UNI
    )
      return true;
    else return false;
  }

  /////////////////////////////////////////////////////////////////////////////
  // API helpers
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Convert currency type to a compatible format for coingecko api
   * @returns valid coingecko api name as string
   */
  #GetCoingeckoApiID() {
    switch (this.GetType()) {
      case CurrencyType.BNB:
        {
          return "binancecoin";
        }
        break;
      case CurrencyType.XRP:
        {
          return "ripple";
        }
        break;
      case CurrencyType.TRX:
        {
          return "tron";
        }
        break;
      case CurrencyType.LUNA:
        {
          return "terra-luna";
        }
        break;
      case CurrencyType.FTM:
        {
          return "fantom";
        }
        break;
      case CurrencyType.NEXO:
        {
          return "nexo";
        }
        break;
      case CurrencyType.PAXG:
        {
          return "pax-gold";
        }
        break;
      case CurrencyType.TUSD:
        {
          return "true-usd";
        }
        break;
      case CurrencyType.USDP:
        {
          return "paxos-standard";
        }
        break;
      case CurrencyType.LINK:
        {
          return "chainlink";
        }
        break;
      case CurrencyType.BTC:
        {
          return "bitcoin";
        }
        break;
      case CurrencyType.ETH:
        {
          return "ethereum";
        }
        break;
      case CurrencyType.USDT:
        {
          return "tether";
        }
        break;
      case CurrencyType.USDC:
        {
          return "usd-coin";
        }
        break;
      case CurrencyType.DAI:
        {
          return "dai";
        }
        break;
      case CurrencyType.BCH:
        {
          return "bitcoin-cash";
        }
        break;
      case CurrencyType.LTC:
        {
          return "litecoin";
        }
        break;
      case CurrencyType.DOGE:
        {
          return "dogecoin";
        }
        break;
      case CurrencyType.EOS:
        {
          return "eos";
        }
        break;
      case CurrencyType.XLM:
        {
          return "stellar";
        }
        break;
      case CurrencyType.ADA:
        {
          return "cardano";
        }
        break;
      case CurrencyType.MATIC:
        {
          return "matic-network";
        }
        break;
      case CurrencyType.DOT:
        {
          return "polkadot";
        }
        break;
      case CurrencyType.SOL:
        {
          return "solana";
        }
        break;
      case CurrencyType.AVAX:
        {
          return "avalanche-2";
        }
        break;
      case CurrencyType.UST:
        {
          return "terrausd";
        }
        break;
      case CurrencyType.ATOM:
        {
          return "cosmos";
        }
        break;
      case CurrencyType.AXS:
        {
          return "axie-infinity";
        }
        break;
      case CurrencyType.UNI:
        {
          return "uniswap";
        }
        break;
      default:
        console.log("Invalid currency in coingecko api");
        console.log(this.GetType());
    }
  }

  /**
   * Reverse function of GetCoingeckoApiID
   * @param {*} cur Currency in coingecko api format
   * @returns currency in our app format
   */
  static NormalizeCoingeckoApiName(cur) {
    switch (cur) {
      case "binancecoin":
        {
          return CurrencyType.BNB;
        }
        break;
      case "ripple":
        {
          return CurrencyType.XRP;
        }
        break;
      case "tron":
        {
          return CurrencyType.TRX;
        }
        break;
      case "terra-luna":
        {
          return CurrencyType.LUNA;
        }
        break;
      case "fantom":
        {
          return CurrencyType.FTM;
        }
        break;
      case "nexo":
        {
          return CurrencyType.NEXO;
        }
        break;
      case "pax-gold":
        {
          return CurrencyType.PAXG;
        }
        break;
      case "true-usd":
        {
          return CurrencyType.TUSD;
        }
        break;
      case "paxos-standard":
        {
          return CurrencyType.USDP;
        }
        break;
      case "chainlink":
        {
          return CurrencyType.LINK;
        }
        break;
      case "bitcoin":
        {
          return CurrencyType.BTC;
        }
        break;
      case "ethereum":
        {
          return CurrencyType.ETH;
        }
        break;
      case "tether":
        {
          return CurrencyType.USDT;
        }
        break;
      case "usd-coin":
        {
          return CurrencyType.USDC;
        }
        break;
      case "dai":
        {
          return CurrencyType.DAI;
        }
        break;
      case "bitcoin-cash":
        {
          return CurrencyType.BCH;
        }
        break;
      case "litecoin":
        {
          return CurrencyType.LTC;
        }
        break;
      case "dogecoin":
        {
          return CurrencyType.DOGE;
        }
        break;
      case "eos":
        {
          return CurrencyType.EOS;
        }
        break;
      case "stellar":
        {
          return CurrencyType.XLM;
        }
        break;
      case "cardano":
        {
          return CurrencyType.ADA;
        }
        break;
      case "matic-network":
        {
          return CurrencyType.MATIC;
        }
        break;
      case "polkadot":
        {
          return CurrencyType.DOT;
        }
        break;
      case "solana":
        {
          return CurrencyType.SOL;
        }
        break;
      case "avalanche-2":
        {
          return CurrencyType.AVAX;
        }
        break;
      case "terrausd":
        {
          return CurrencyType.UST;
        }
        break;
      case "cosmos":
        {
          return CurrencyType.ATOM;
        }
        break;
      case "axie-infinity":
        {
          return CurrencyType.AXS;
        }
        break;
      case "uniswap":
        {
          return CurrencyType.UNI;
        }
        break;
      default:
        console.log("Invalid currency in coingecko api");
        console.log(cur);
    }
  }

  /**
   * Check if currency is supported by coinbase api
   * @returns true if supported
   */
  #IsCoinbaseApiSupported() {
    // This is implemented and working but we switched to the coingecko api 100% for historical data as it's much faster
    return false;

    const cur = this.GetType();
    if (
      cur === CurrencyType.BNB ||
      cur === CurrencyType.XRP ||
      cur === CurrencyType.TRX ||
      cur === CurrencyType.LUNA ||
      cur === CurrencyType.FTM ||
      cur === CurrencyType.NEXO ||
      cur === CurrencyType.PAXG ||
      cur === CurrencyType.TUSD ||
      cur === CurrencyType.USDP ||
      this.IsFiat() ||
      CCurrency.IsFiatX(cur)
    ) {
      return false;
    } else return true;
  }

  /**
   * Check if currency is supported by coingecko api
   * @returns true if supported
   */
  #IsCoingeckoApiSupported() {
    const cur = this.GetType();
    if (this.#IsCoinbaseApiSupported() || this.IsFiat() || CCurrency.IsFiatX(cur)) return false;
    else return true;
  }
}
