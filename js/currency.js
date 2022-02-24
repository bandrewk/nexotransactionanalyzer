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
  // Diverse blockchain networks
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
  KSM: "KSM", // ✅ Fully working ✅ Coingecko API with histroic data (id: kusama)

  // ERC-20 tokens
  ERC20: {
    NEXO: "NEXO", // ✅ Fully working (ERC20) ❌ Not working for BEP20 ❌ Coinbase API ✅ Coingecko API with histroic data (id: nexo)
    LINK: "LINK", // ✅ Fully working (ERC20) ✅ Coinbase API with histroic data ✅ Coingecko API with histroic data (id: chainlink)
    PAXG: "PAXG", // ✅ Fully working (ERC20) ❌ Coinbase API ✅ Coingecko API with histroic data (id: pax-gold)
    AXS: "AXS", // ✅ Fully working (ERC20) ✅ Coinbase API with histroic data ✅ Coingecko API with histroic data (id: axie-infinity)
    UNI: "UNI", // ✅ Fully working (ERC20) ✅ Coinbase API with histroic data ✅ Coingecko API with histroic data (id: uniswap)
    MANA: "MANA", // ✅ Fully working (ERC20) ✅ Coingecko API with histroic data (id: decentraland)
    SAND: "SAND", // ✅ Fully working (ERC20) ✅ Coingecko API with histroic data (id: the-sandbox)

    // Stable tokens
    STABLE: {
      DAI: "DAI", // ✅ Fully working (ERC20) ✅ Coinbase API with histroic data ✅ Coingecko API with histroic data (id: dai)
      TUSD: "TUSD", // ✅ Fully working (ERC20) ❌ Coinbase API ✅ Coingecko API with histroic data (id: true-usd)
      USDP: "USDP", // ✅ Fully working (ERC20) ❌ Coinbase API ✅ Coingecko API with histroic data (id: paxos-standard)
      USDC: "USDC", // ✅ Fully working (ERC20) ✅ Coinbase API with histroic data ✅ Coingecko API with histroic data (id: usd-coin)
      USDT: "USDT", // ✅ Fully working (ERC20) ✅ Coinbase API with histroic data ✅ Coingecko API with histroic data (id: tether)
    },
  },

  // Fiat
  FIAT: {
    EUR: "EUR", // ✅ Fully working ✅ ECB API fully working
    USD: "USD", // ✅ Fully working ✅ No API needed
    GBP: "GBP", // ✅ Fully working ✅ ECB API fully working (probably inaccurate) ❌ Bank of England API isn`t working (cors)
  },
}; // 35 currencies supported as of 24.02.2022

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
    this.#m_fAmount = 0;
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

  /**
   * Adds a transaction snapshot to the historic prices array
   * @param {*} date transaction date
   */
  AddTransactionByDate(date) {
    if (this.#m_arrTransaction.get(date)) {
      // We just need the current amount here as it includes all previous transactions.
      this.#m_arrTransaction.set(date, this.GetAmount());
    } else this.#m_arrTransaction.set(date, this.GetAmount());

    // Keep track of the first transaction
    if (new Date(date) < window.FIRST_TRANSACTION) window.FIRST_TRANSACTION = new Date(date);
  }

  /**
   * Returns the saved historic price data
   * @returns historic price data
   */
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
  /**
   * Get type of currency
   * @returns CurrencyType
   */
  GetType() {
    return this.#m_type;
  }

  /**
   * Get currency amound, in-kind value
   * @returns amount in-kind
   */
  GetAmount() {
    return this.#m_fAmount;
  }

  /**
   * Adds the specified amount to the currency
   * @param {*} amount  amount in-kind
   */
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
    //console.log(`Start date: ${dates[0]}`);

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

    //console.log(`Filling gaps for.. ${this.GetType()}`);
    //console.log(temp);

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

  /**
   * Gets the api string to request historic data since the first deposit
   * @returns API string to request historic data
   */
  GetExchangeAPIStringHistoric() {
    this.FillTransactionGaps();

    let urls = [];
    if (!this.IsFiat()) {
      this.#m_arrTransaction.forEach((v, k, m) => {
        if (this.#IsCoinbaseApiSupported()) {
          urls.push(`https://api.coinbase.com/v2/prices/${this.#m_type}-USD/spot?date=${k}`);
        } else if (this.#IsCoingeckoApiSupported()) {
          // Only do single requests for up to 10 days
          if ([...this.#m_arrTransaction.keys()].length <= 10)
            urls.push(
              `https://api.coingecko.com/api/v3/coins/${this.#GetCoingeckoApiID()}/history?date=${
                k.substr(-2) + `-` + k.substring(5, 7) + `-` + k.substring(0, 4)
              }`
            );
        } else {
          if (!this.IsFiat()) console.log(`No crypto api support for ${this.GetType()}`);
        }
      });

      if (urls.length > 0) return urls;

      if (this.#IsCoingeckoApiSupported()) {
        let dates = [...this.#m_arrTransaction.keys()];

        let start = Math.floor(new Date(dates[0]).getTime() / 1000);
        const end = Math.floor(new Date(dates[dates.length - 1]).getTime() / 1000);

        // Minimum of 90 days is required by coingecko API to reply with daily values
        if (dates.length < 90) {
          //console.log(`Data below 90 days.. expanding.`);

          let firstDate = new Date(dates[0]);
          let correctedFirstDate = new Date(firstDate - (95 - dates.length) * 86400000);
          start = Math.floor(correctedFirstDate.getTime() / 1000);

          //console.log(`...old: ${firstDate}, new: ${correctedFirstDate}`);
        }

        // Sort data oldest to newest
        //if (!window.DEMO_MODE) dates = dates.reverse();

        //console.log(`Start: ${start}, end: ${end}`);
        urls.push(
          `https://api.coingecko.com/api/v3/coins/${this.#GetCoingeckoApiID()}/market_chart/range?vs_currency=usd&from=${start}&to=${end}`
        );
      }
    } //if

    if (this.GetType() === CurrencyType.FIAT.EUR) {
      // We can use the ECB to grab all EUR related data
      //https://sdw-wsrest.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?startPeriod=2009-05-01&endPeriod=2009-05-31

      let dates = [...this.#m_arrTransaction.keys()];
      urls.push(
        `https://sdw-wsrest.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?startPeriod=${dates[0]}&endPeriod=${
          dates[dates.length - 1]
        }&detail=dataonly&format=jsondata`
      );
    } else if (this.GetType() === CurrencyType.FIAT.GBP) {
      /* Ooooooops, doesn't work. Bank of england hasn't set any cors headers thus we can`t fetch infos from there.
      //https://www.bankofengland.co.uk/boeapps/database/fromshowcolumns.asp?Travel=NIxIRxSUx&FromSeries=1&ToSeries=50&DAT=RNG&FD=1&FM=Jan&FY=2012&TD=17&TM=Feb&TY=2022&FNY=&CSVF=TT&html.x=100&html.y=14&C=C8P&Filter=N#
      let dates = [...this.#m_arrTransaction.keys()];

      // Format time range
      const fy = dates[0].substr(0, 4);
      const fd = dates[0].substr(-2, 2);

      let tmpDate = new Date(dates[0]);
      const fm = tmpDate.toLocaleString("default", { month: "short" });

      const ty = dates[dates.length - 1].substr(0, 4);
      const td = dates[dates.length - 1].substr(-2, 2);

      tmpDate = new Date(dates[dates.length - 1]);
      const tm = tmpDate.toLocaleString("default", { month: "short" });

      urls.push(
        `https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes&Datefrom=${fd}/${fm}/${fy}&Dateto=${td}/${tm}/${ty}&SeriesCodes=XUDLUSS&UsingCodes=Y&CSVF=TN`
      );*/
    }

    return urls;
  }

  /**
   * Get GBP API request data
   * @returns Array of url requests for GBP currency
   */
  GetGBPAPIRequest() {
    this.FillTransactionGaps();
    let urls = [];
    let dates = [...this.#m_arrTransaction.keys()];
    urls.push(
      `https://sdw-wsrest.ecb.europa.eu/service/data/EXR/D.GBP.EUR.SP00.A?startPeriod=${dates[0]}&endPeriod=${
        dates[dates.length - 1]
      }&detail=dataonly&format=jsondata`
    );
    urls.push(
      `https://sdw-wsrest.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?startPeriod=${dates[0]}&endPeriod=${
        dates[dates.length - 1]
      }&detail=dataonly&format=jsondata`
    );

    return urls;
  }

  /**
   * Set USD price 1:1 1USD = 1USD
   */
  SetUSDData() {
    this.FillTransactionGaps();
    this.#m_arrHistoricPriceData = this.#m_arrTransaction;
  }

  /////////////////////////////////////////////////////////////////////////////
  // Coinbase + Coingecko Data
  /////////////////////////////////////////////////////////////////////////////
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

  /////////////////////////////////////////////////////////////////////////////
  // Coingecko Data
  /////////////////////////////////////////////////////////////////////////////
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

  /////////////////////////////////////////////////////////////////////////////
  // ECB Data
  /////////////////////////////////////////////////////////////////////////////
  /**
   * Converts GBP to EUR to USD. This not 100% accurate but we can`t pull data from the bank of england.
   * @param {*} _data1  GBP to EUR dataset
   * @param {*} _dates1 GBP to EUR dataset (dates)
   * @param {*} _data2  EUR to USD dataset
   * @param {*} _dates2  EUR to USD dataset (dates)
   */
  ReceiveECBGBPRangeData(_data1, _dates1, _data2, _dates2) {
    let dates = [...this.#m_arrTransaction.keys()];
    let amount = [...this.#m_arrTransaction.values()];

    const GBPToEUR = this.#FillDateGapsInECBData(_data1, _dates1, new Date(dates[0]));
    const EURToUSD = this.#FillDateGapsInECBData(_data2, _dates2, new Date(dates[0]));

    let filledDates = [...GBPToEUR.keys()];
    let filledValues = [...GBPToEUR.values()];

    // Convert GBP to EUR
    for (let i = 0; i < filledDates.length; i++) {
      for (let x = 0; x < dates.length; x++) {
        if (filledDates[i] === dates[x]) {
          this.#m_arrHistoricPriceData.set(dates[x], amount[x] / filledValues[i]); // i.e. 100GBP / 0.8394 EUR = 119EUR
        }
      }
    }

    filledDates = [...EURToUSD.keys()];
    filledValues = [...EURToUSD.values()];

    // Convert EUR to USD
    for (let i = 0; i < filledDates.length; i++) {
      for (let x = 0; x < dates.length; x++) {
        if (filledDates[i] === dates[x]) {
          this.#m_arrHistoricPriceData.set(dates[x], this.#m_arrHistoricPriceData.get(dates[x]) * filledValues[i]);
        }
      }
    }
  }

  /**
   * Fills an data array response from ECB (holidays are missing)
   * @param {*} _data Data array from ECB JSON response
   * @param {*} _dates Dates array from ECB JSON response
   * @param {*} _startDate Starting day for the filling process
   * @returns Filled Map object
   */
  #FillDateGapsInECBData(_data, _dates, _startDate) {
    // Get all possible dates between the first transaction and today
    let fillerDates = this.#GetDatesBetween(_startDate, window.LAST_TRANSACTION);

    // Temp storage
    let temp = new Map();

    let xid = 0;
    // Starting at 1 because it includes the starting date
    for (let index = 1; index < fillerDates.length; index++) {
      let element = fillerDates[index];

      // Loop through already stored dates
      // Set the exact same value for all next dates till we find a new one,
      // then use the new one.
      for (let x = 0; x < _dates.length; ) {
        if (element === _dates[x].id) {
          xid = x;
        }
        x++;
      }

      temp.set(element, _data[xid][0]);
    }

    return temp;
  }

  /**
   * Processes the response to EUR USD exchange rate from EU
   * @param {*} eData data array
   * @param {*} eDate date array
   */
  ReceiveECBEuroRangeData(_data, _dates) {
    let dates = [...this.#m_arrTransaction.keys()];
    let amount = [...this.#m_arrTransaction.values()];

    const EURtoUSD = this.#FillDateGapsInECBData(_data, _dates, new Date(dates[0]));

    const filledDates = [...EURtoUSD.keys()];
    const filledValues = [...EURtoUSD.values()];

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
    for (let key in CurrencyType.FIAT) {
      if (this.GetType() === key) return true;
    }
    return false;
  }

  /**
   * Check if currency (supplied as string) is FIAT
   * @param {*} cur Currency string
   * @returns true if currency is fiat
   */
  static IsFiat(cur) {
    for (let key in CurrencyType.FIAT) {
      if (cur === key) return true;
    }
    return false;
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
    for (let key in CurrencyType.ERC20.STABLE) {
      if (this.GetType() === key) return true;
    }
    return false;
  }

  /**
   * Is ERC20 token? Includes ETH!
   * @returns True if currency is ERC20 token
   */
  IsERC20Token() {
    for (let key in CurrencyType.ERC20) {
      if (this.GetType() === key) return true;
    }

    for (let key in CurrencyType.ERC20.STABLE) {
      if (this.GetType() === key) return true;
    }

    if (this.GetType() === CurrencyType.ETH) return true;

    return false;
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
      case CurrencyType.ERC20.NEXO:
        {
          return "nexo";
        }
        break;
      case CurrencyType.ERC20.PAXG:
        {
          return "pax-gold";
        }
        break;
      case CurrencyType.ERC20.STABLE.TUSD:
        {
          return "true-usd";
        }
        break;
      case CurrencyType.ERC20.STABLE.USDP:
        {
          return "paxos-standard";
        }
        break;
      case CurrencyType.ERC20.LINK:
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
      case CurrencyType.ERC20.STABLE.USDT:
        {
          return "tether";
        }
        break;
      case CurrencyType.ERC20.STABLE.USDC:
        {
          return "usd-coin";
        }
        break;
      case CurrencyType.ERC20.STABLE.DAI:
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
      case CurrencyType.ERC20.AXS:
        {
          return "axie-infinity";
        }
        break;
      case CurrencyType.ERC20.UNI:
        {
          return "uniswap";
        }
        break;
      case CurrencyType.ERC20.MANA:
        {
          return "decentraland";
        }
        break;
      case CurrencyType.ERC20.SAND:
        {
          return "the-sandbox";
        }
        break;
      case CurrencyType.KSM:
        {
          return "kusama";
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
          return CurrencyType.ERC20.NEXO;
        }
        break;
      case "pax-gold":
        {
          return CurrencyType.ERC20.PAXG;
        }
        break;
      case "true-usd":
        {
          return CurrencyType.ERC20.STABLE.TUSD;
        }
        break;
      case "paxos-standard":
        {
          return CurrencyType.ERC20.STABLE.USDP;
        }
        break;
      case "chainlink":
        {
          return CurrencyType.ERC20.LINK;
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
          return CurrencyType.ERC20.STABLE.USDT;
        }
        break;
      case "usd-coin":
        {
          return CurrencyType.ERC20.STABLE.USDC;
        }
        break;
      case "dai":
        {
          return CurrencyType.ERC20.STABLE.DAI;
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
          return CurrencyType.ERC20.AXS;
        }
        break;
      case "uniswap":
        {
          return CurrencyType.ERC20.UNI;
        }
        break;
      case "decentraland":
        {
          return CurrencyType.ERC20.MANA;
        }
        break;
      case "the-sandbox":
        {
          return CurrencyType.ERC20.SAND;
        }
        break;
      case "kusama":
        {
          return CurrencyType.KSM;
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
