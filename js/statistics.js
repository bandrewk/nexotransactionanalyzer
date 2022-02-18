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

import { CurrencyType, CCurrency } from "./currency.js";
import { TransactionType } from "./transaction.js";

/**
 * Loyality levels
 */
export const LoyalityLevel = {
  BASE: `BASE`, // <1% nexo tokens
  SILVER: `<span style="color: #c0c0c0">🥈 SILVER</span>`, // >1-5%
  GOLD: `<span style="color: #ffd700">🥇 GOLD</span>`, // >5-<10%
  PLATINUM: `<span style="color: #c0bdb9">🔥 PLATINUM</span>`, // >=10%
};

/**
 * Statistics helper module
 *
 * Here we keep track of numbersss
 */
export class CStatistics {
  /**
   * Total crypto deposited (all-time)
   */
  #m_fTotalCryptoDeposited;

  /**
   * Total fiat deposited (all-time)
   */
  #m_fTotalFiatDeposited;

  /**
   * Total interest earned as USD (all-time)
   */
  #m_fTotalInterestEarnedAsUSD;

  /**
   * Stores all currencies (CCurrency)
   */
  #m_arrCurrency;

  /**
   * Total referral bonus earned (all-time)
   */
  #m_fTotalReferralBonusEarned;

  constructor() {
    this.#m_fTotalCryptoDeposited = 0;
    this.#m_fTotalFiatDeposited = 0;
    this.#m_fTotalInterestEarnedAsUSD = 0;
    this.#m_fTotalReferralBonusEarned = 0;

    this.#m_arrCurrency = new Map();
  }

  /////////////////////////////////////////////////////////////////////////////
  // Add new transaction / currency
  /////////////////////////////////////////////////////////////////////////////
  /**
   * Adds a new transaction to the stats
   */
  AddTransaction(t) {
    // Do not process pending transactions
    if (t.GetDetails().search(`pending`) >= 0) {
      console.log(`Skipping pending transaction ${t.GetId()}.`);
      return;
    }

    if (t.GetType() === TransactionType.DEPOSIT) {
      this.#m_fTotalCryptoDeposited += parseFloat(t.GetUSDEquivalent(false));
    }

    if (t.GetType() === TransactionType.DEPOSITTOEXCHANGE) {
      this.#m_fTotalFiatDeposited += parseFloat(t.GetUSDEquivalent(false));
    }

    // When counting currencies ignore fixed terms  (deposits and withdraws) as the depot value stays the same
    if (
      t.GetType() != TransactionType.LOCKINGTERMDEPOSIT && // Internal transaction
      t.GetType() != TransactionType.UNLOCKINGTERMDEPOSIT && // Internal transaction
      t.GetType() != TransactionType.EXCHANGETOWITHDRAW && //FiatX to Fiat
      t.GetType() != TransactionType.EXCHANGEDEPOSITEDON // Fiat to FiatX
    ) {
      this.AddCurrency(t);
    }

    // Count interest
    if (t.GetType() === TransactionType.INTEREST || t.GetType() === TransactionType.FIXEDTERMINTEREST) {
      this.#m_arrCurrency.get(t.GetCurrency()).AddInterestInKind(t.GetAmount());
    }

    // Count cashback
    if (t.GetType() === TransactionType.EXCHANGECASHBACK) {
      this.#m_arrCurrency.get(t.GetCurrency()).AddCashbackInKind(t.GetAmount());
    }

    // Count ref bonus
    if (t.GetType() === TransactionType.REFERRALBONUS) {
      // It's always in bitcoin so we might as well track it here
      this.m_fTotalReferralBonusEarned += t.GetAmount();
    }
  }

  /////////////////////////////////////////////////////////////////////////////
  // Add currency
  /////////////////////////////////////////////////////////////////////////////
  /**
   * Adds currency to `#m_arrCurrency` array.
   * If not existent yet, will create a new entry.
   * The two params `cur` and `amount` are optional and only needed when adding a currency coming from a PAIR
   * See `AddCurrencyPair()` method.
   * @param {*} t Transaction
   * @param {*} cur Curreny object (string)
   * @param {*} amount Amount to add (string)
   * @returns nothing
   */
  AddCurrency(t, cur = null, amount = null) {
    // if no specific currency is supplied take the data from the transaction
    if (cur === null && amount === null) {
      if (t === null) throw new Error(`AddCurrency all parameters are null!`);

      cur = t.GetCurrency();
      amount = t.GetAmount();
    }

    // Process pairs (Coins exchanged on nexo exchange)
    if (amount.search(`/`) >= 0) {
      this.#AddCurrencyPair(t, cur, amount);
      return;
    }

    // Grab value
    amount = parseFloat(amount);

    // Check for valid values, if this fails the csv is messed up
    if (isNaN(amount)) {
      console.log(t);
      const errormsg =
        "Transaction file is invalid! Could not receive exchange values (Look at exchange transactions there probably a value missing).";
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: errormsg,
        //footer: '<a href="">Why do I have this issue?</a>',
      }).then((result) => {
        /* Reload page when confirmed */
        if (result.isConfirmed) {
          location.reload();
        }
      });

      // It makes no sense to continue execution after we failed here
      throw new Error(errormsg);
    }

    // Add curreny and amount
    if (!this.#m_arrCurrency.has(cur)) {
      this.#m_arrCurrency.set(cur, new CCurrency(cur));
    }
    this.#m_arrCurrency.get(cur).AddAmount(amount);

    // Add historical data to the currency
    this.#m_arrCurrency.get(cur).AddTransactionByDate(t.GetDateTime());
  }

  /**
   * Adds a currency pair
   * Called by `AddCurrency()` method
   * @param {*} t Transaction
   * @param {*} cur Curreny object (string)
   * @param {*} amount Amount to add (string)
   */
  #AddCurrencyPair(t, cur, amount) {
    // Get exchange pair
    let cur1 = cur.substr(0, cur.search(`/`));
    let cur2 = cur.substr(cur.search(`/`) + 1, cur.length);

    // When exchanging FIAT to crypto we need to remove the last X (eg. EURX becomes EUR)
    if (CCurrency.IsFiatX(cur1)) {
      cur1 = cur1.substr(0, cur1.length - 1);
    }

    // I dont know if this transaction is possible but maybe for crypto to fiatX
    if (CCurrency.IsFiatX(cur2)) {
      cur2 = cur2.substr(0, cur2.length - 1);
    }

    //console.log(`Found ${cur1} and ${cur2} (${cur})`);

    // Get the individual amounts
    const amount1 = amount.substr(0, amount.search(`/`));
    const amount2 = amount.substr(amount.search(`/`) + 1, cur.length);

    if (isNaN(amount1) || isNaN(amount2)) alert("Transaction file is invalid! Could not find exchange values.");

    // Add them individually
    this.AddCurrency(t, cur1, amount1);
    this.AddCurrency(t, cur2, amount2);
  }

  /////////////////////////////////////////////////////////////////////////////
  // Portfolio value in USD
  /////////////////////////////////////////////////////////////////////////////
  /**
   * Get exchange rates for all currencys stored in `m_arrCurrency` as of TODAY
   * @param {*} finishedCallback Callback function that gets called when exchange rates are ready
   */
  GetCurrentExchangeRates(finishedCallback = null) {
    let urls = [];

    // Collect API requests
    this.#m_arrCurrency.forEach((e) => {
      urls.push(e.GetExchangeAPIString());
    });

    // Make promises resolve to their final value
    // This would fire all calls at once but we can't do that due to API limits
    // let apiRequests = urls.map((url) => fetch(url).then((res) => res.json()));

    // Go easy with the APIs and delay the calls a little (5 calls per sec max)
    let i = 0;
    let apiRequests = urls.map((url) => this.DelayFetch(url, (i += 200)).then((url) => fetch(url).then((res) => res.json())));
    console.log(`Loading exchange rates.. requesting data for ~${i / 1000}s`);

    // Wait for  all promises to settle
    Promise.allSettled(apiRequests).then((responses) => {
      responses.forEach((response, index) => {
        // Loop through all responses
        if (response.status === "fulfilled") {
          // This is tailored to the coinbase API
          const currency = response.value.data.currency;
          // Success
          if (this.#m_arrCurrency.has(currency)) {
            // USD value
            const value = parseFloat(response.value.data.rates.USD);

            // Look up currency and set the usd value
            this.#m_arrCurrency.get(currency).SetUSDEquivalent(value * parseFloat(this.#m_arrCurrency.get(currency).GetAmount()));

            // Calculate interest earned
            this.#m_arrCurrency.get(currency).SetInterestInUSD(value * this.#m_arrCurrency.get(currency).GetInterestInKind());

            // Calculate cashback value
            this.#m_arrCurrency.get(currency).SetCashbackInUSD(value * this.#m_arrCurrency.get(currency).GetCashbackInKind());
          }
        } else if (response.status === "rejected") {
          // Failed
          console.log(`GetExchangeRate failed for: ${urls[index]} - ${response.reason}`);
        }
      });

      // Calculate total interest earned in usd
      this.#m_fTotalInterestEarnedAsUSD = 0;

      this.#m_arrCurrency.forEach((v, k, m) => {
        this.#m_fTotalInterestEarnedAsUSD += v.GetInterestInUSD();
      });

      console.log(`Loading exchange rates finished.`);
      // We're ready !
      if (finishedCallback) finishedCallback();
    });
  }

  /////////////////////////////////////////////////////////////////////////////
  // HTML Exports
  /////////////////////////////////////////////////////////////////////////////
  /**
   * Get full Coinlist portfolio as html string
   * @returns html ready for injection
   */
  GetCoinlistAsHTML() {
    // Start with empty string
    let html = ``;
    let src = ``;

    // Go through all stored currencies
    this.#m_arrCurrency.forEach((e) => {
      // Do not show empty currencies
      if (e.GetAmount() === 0) return;

      if (window.USE_NEXO_API) {
        src = `https://static.nexo.io/currencies/${e.GetType()}${e.IsFiat() ? `X` : ``}.svg`;
      } else {
        src = `https://cryptoicon-api.vercel.app/api/icon/${e.GetType().toLowerCase()}`;
      }

      html += `<div class="pure-u-1-2 pure-u-lg-1-8 coinlist-container" bg-text="${e.GetType()}">
      <div class="pure-g">
      <div class="pure-u-2-5">
<img class="coinlist-icon" src="${src}" />

</div>
<div class="pure-u-3-5">

<h4>${e.GetAmount() % 1 === 0 ? e.GetAmount().toFixed(2) : parseFloat(e.GetAmount().toFixed(8))}</h4>
<p>~$${e.GetUSDEquivalent().toFixed(2)}</p>
</div></div>
</div>`;
    }); // parseFloat removes the padding that toFixed() leaves !

    return html;
  }

  /**
   * Get Coinlist earned in kind stats as html string
   * @returns html ready for injection
   */
  GetCoinlistEarnedInKindAsHTML() {
    // Start with empty string
    let html = ``;
    let src = ``;
    // Go through all stored currencies
    this.#m_arrCurrency.forEach((e) => {
      if (e.GetInterestInKind() === 0) return;

      if (window.USE_NEXO_API) {
        src = `https://static.nexo.io/currencies/${e.GetType()}${e.IsFiat() ? `X` : ``}.svg"`;
      } else {
        src = `https://cryptoicon-api.vercel.app/api/icon/${e.GetType().toLowerCase()}`;
      }

      html += `<div class="pure-u-1-4 pure-u-lg-1-8 coinlist-container" bg-text="${e.GetType()}">
      <div class="pure-g">
      <div class="pure-u-2-5">
<img class="coinlist-icon" src="${src}" />
</div>
<div class="pure-u-3-5">
<h4>${e.GetInterestInKind() % 1 === 0 ? e.GetInterestInKind().toFixed(2) : parseFloat(e.GetInterestInKind().toFixed(8))}</h4>
<p>~$${e.GetInterestInUSD().toFixed(2)}</p>
</div></div></div>`;
    }); // parseFloat removes the padding that toFixed() leaves !

    return html;
  }

  /**
   * Get Coinlist earned cashback stats as html string
   * @returns html ready for injection
   */
  GetCoinlistCashbackEarnedAsHTML() {
    // Start with empty string
    let html = ``;
    let src = ``;
    // Go through all stored currencies
    this.#m_arrCurrency.forEach((e) => {
      if (e.GetCashbackInKind() === 0) return;

      if (window.USE_NEXO_API) {
        src = `https://static.nexo.io/currencies/${e.GetType()}${e.IsFiat() ? `X` : ``}.svg"`;
      } else {
        src = `https://cryptoicon-api.vercel.app/api/icon/${e.GetType().toLowerCase()}`;
      }

      html += `<div class="pure-u-1-4 pure-u-lg-1-8 coinlist-container" bg-text="${e.GetType()}">
          <div class="pure-g">
          <div class="pure-u-2-5">
    <img class="coinlist-icon" src="${src}" />
    </div>
    <div class="pure-u-3-5">
    <h4>${e.GetCashbackInKind() % 1 === 0 ? e.GetCashbackInKind().toFixed(2) : parseFloat(e.GetCashbackInKind().toFixed(8))}</h4>
    <p>~$${e.GetCashbackInUSD().toFixed(2)}</p>
    </div></div></div>`;
    }); // parseFloat removes the padding that toFixed() leaves !

    return html;
  }

  /////////////////////////////////////////////////////
  /// Generate portfolio value over time
  /////////////////////////////////////////////////////

  GetHistoricalPortfolioData() {
    let urls = [];
    // Collect all fetch promises, we want to send and wait for all of them together
    this.#m_arrCurrency.forEach((v, k, m) => {
      // We don`t have to request USD data, just set it 1:1 1usd = 1usd
      if (v.GetType() === CurrencyType.FIAT.USD) {
        v.SetUSDData();

        // Draw portfolio if we don`t have anything else in portfolio to call the regular generation method
        if (!this.HasCrypto() && !this.HasEUR() && !this.HasGBP()) this.DrawPortfolioChart();
      } // GBP is a little weird, request GBP to EUR and convert EUR to USD
      else if (v.GetType() === CurrencyType.FIAT.GBP) {
        const arr = v.GetGBPAPIRequest();

        const req = arr.map((url) => fetch(url).then((res) => res.json()));

        let data1 = null;
        let dates1 = null;
        let data2 = null;
        let dates2 = null;

        // Wait for all promises to settle
        Promise.allSettled(req).then((responses) => {
          responses.forEach((response, index) => {
            // Loop through all responses
            if (response.status === "fulfilled") {
              // Process API endpoints..
              if (arr[index].search(`GBP`) >= 0) {
                //console.log(`Received ECB response for GBP (GBP to EUR).`);

                data1 = response.value.dataSets[0].series["0:0:0:0:0"].observations;
                dates1 = response.value.structure.dimensions.observation[0].values;
              }
              if (arr[index].search(`USD`) >= 0) {
                //console.log(`Received ECB response for GBP (EUR to USD).`);
                data2 = response.value.dataSets[0].series["0:0:0:0:0"].observations;
                dates2 = response.value.structure.dimensions.observation[0].values;

                if (data1 != null) {
                  // Process data
                  v.ReceiveECBGBPRangeData(data1, dates1, data2, dates2);
                }
              }
            } else if (response.status === "rejected") {
              // Failed
              console.log(`GetExchangeRate failed for: ${urls[index]} - ${response.reason}`);
            }
          });

          // Draw portfolio if we don`t have anything else in portfolio to call the regular generation method
          if (!this.HasCrypto() && !this.HasEUR()) this.DrawPortfolioChart();
        });
      } else {
        urls.push(...v.GetExchangeAPIStringHistoric());
      }
    }); //forEach

    // Jonky donky way of calculating max api calls to be as fast as possible
    let cb = 0; //coinbase api calls
    let cg = 0; //coingecko api calls

    //Count api calls
    urls.forEach((element) => {
      if (element.search(`coinbase`) >= 0) cb++;
      else cg++;
    });

    // If more coingecko calls are present give it a little more time
    const maxTime = cb * 200 + cg * (urls.length / 2 > cg ? 600 : 800);

    console.log(`Requesting API data for.. ${maxTime}ms`);

    const timePerRequest = maxTime / urls.length;
    console.log(`Requesting every.. ${timePerRequest}ms`);

    // Make promises resolve to their final value
    // go easy with the APIs and delay the calls a little (5 calls per sec max)
    let i = 0;
    let apiRequests = urls.map((url) =>
      this.DelayFetch(url, (i += timePerRequest)).then((url) => fetch(url).then((res) => res.json()))
    );

    console.log(`~Load time ~${i}ms`);

    let date;
    let currency, value;

    // Wait for all promises to settle
    Promise.allSettled(apiRequests).then((responses) => {
      responses.forEach((response, index) => {
        // Loop through all responses
        if (response.status === "fulfilled") {
          //console.log(response);

          // Process API endpoints..
          if (urls[index].search(`coinbase`) >= 0) {
            /////////////////////////////////////////////////////
            /// Coinbase API
            /////////////////////////////////////////////////////
            // TODO Process coinbase API endpoint
            // console.log(`Response from coinbase~`);

            currency = response.value.data.base;

            if (this.#m_arrCurrency.has(currency)) {
              date = urls[index].substr(-10, 10);

              this.#m_arrCurrency.get(currency).ReceiveData(date, parseFloat(response.value.data.amount));
              //console.log(`~~${currency + ` - ` + value}$`);
            } else console.log(`~~${currency} not found (${urls[index]})`);
          } else if (urls[index].search(`coingecko`) >= 0) {
            /////////////////////////////////////////////////////
            /// Coingecko API
            /////////////////////////////////////////////////////
            // TODO Process coingecko API endpoint
            //console.log(`Response from coingecko~`);

            // Remove https://api.coingecko.com/api/v3/coins/
            currency = urls[index].substr(39, urls[index].length);
            currency = currency.substr(0, currency.search(`/`));
            //console.log(`Received coingecko response for ${currency}.`);
            currency = CCurrency.NormalizeCoingeckoApiName(currency);
            //console.log(`Converted to.. ${currency}`);

            if (this.#m_arrCurrency.has(currency)) {
              // Range request answer
              if (urls[index].search(`from`) >= 0) {
                this.#m_arrCurrency.get(currency).ReceiveCoingeckoRangeData(response.value.prices);
              } else {
                // Single request answer
                value = parseFloat(response.value.market_data.current_price.usd);

                // Grab date (DD-MM-YYYY)
                date = urls[index].substr(-10, 10);

                // Format to YYYY-MM-DD
                date = date.split(`-`);
                date = `${date[2]}-${date[1]}-${date[0]}`;

                this.#m_arrCurrency.get(currency).ReceiveData(date, value);
              }
            } else console.log(`~~${currency} not found (${urls[index]})`);
          } else if (urls[index].search(`europa`) >= 0) {
            /////////////////////////////////////////////////////
            /// Europe ECB
            /////////////////////////////////////////////////////
            console.log(`Received ECB response for EUR.`);
            currency = CurrencyType.FIAT.EUR;

            if (this.#m_arrCurrency.has(currency)) {
              value = response.value.dataSets[0].series["0:0:0:0:0"].observations;
              date = response.value.structure.dimensions.observation[0].values;

              this.#m_arrCurrency.get(currency).ReceiveECBEuroRangeData(value, date);
            } else console.log(`~~${currency} not found (${urls[index]})`);
          } else {
            console.log(`Could not identify API response.. stopping portolio graph generation (${urls[index]}).`);
            return;
          }
        } else if (response.status === "rejected") {
          // Failed
          console.log(`GetExchangeRate failed for: ${urls[index]} - ${response.reason}`);
        }
      });

      // We're ready !
      this.DrawPortfolioChart();
    });
  }

  /**
   * Draws the portfolio chart graph
   */
  DrawPortfolioChart() {
    let arrPortfolioData = new Map();

    // Group all currencies per day
    this.#m_arrCurrency.forEach((element) => {
      element.GetHistoricPriceData().forEach((v, k, m) => {
        if (arrPortfolioData.get(k)) {
          arrPortfolioData.set(k, arrPortfolioData.get(k) + parseFloat(v));
        } else arrPortfolioData.set(k, parseFloat(v));
      });
    });
    let trace1 = {
      x: [...arrPortfolioData.keys()],
      y: [...arrPortfolioData.values()],

      name: `Deposits`,
      type: `bar`,
      marker: {
        size: 8,
      },
      line: {
        width: 2,
      },
      connectgaps: true,
    };

    let data = [trace1];
    let layout = {
      title: "Portfolio Value",
      autosize: true,
      yaxis: {
        title: "USD",
        showline: false,
      },
    };

    const config = { responsive: true };

    Plotly.newPlot("ov-graph-portfolio", data, layout, config);

    // Hide loading animation
    const loader = document.querySelector("#portfolio-loader");
    if (loader) loader.classList.add(`hidden`);
    else console.log(`Could not find portfolio loader.`);
  }
  /////////////////////////////////////////////////////
  /// Charts
  /////////////////////////////////////////////////////
  /**
   * Draw pie charts in `overview` page
   */
  DrawPieCharts() {
    /////////////////////////////////////////////////////
    /// Pie chart `Portfolio division`
    /////////////////////////////////////////////////////
    let names = [];
    this.#m_arrCurrency.forEach((e) => {
      names.push(e.GetType());
    });

    let amounts = [];
    this.#m_arrCurrency.forEach((e) => {
      // Hide zero entries
      if (e.GetUSDEquivalent() === 0) {
        amounts.push(null);
        return;
      }
      amounts.push(e.GetUSDEquivalent());
    });

    // If we have more than 10 entries group small percentage amounts, otherwise the pie-chart won't be readable.
    if (amounts.length > 10) {
      // Everything below this percentage will be summarized
      const MIN_PERCENTAGE = 1.5;

      let total = 0;
      let etc = 0;

      amounts.forEach((x) => {
        total += x;
      });

      const P = 100 / total;

      for (let i = 0; i < amounts.length; i++) {
        if (P * amounts[i] < MIN_PERCENTAGE) {
          etc += amounts[i];

          /*console.log(
            `Grouped ${names[i]} with a value of ${amounts[i]} into ETC. Portfolio percentage is below ${MIN_PERCENTAGE} (${(
              P * amounts[i]
            ).toFixed(2)}%).`
          );*/

          // Setting them to NULL will make them invisible in the graph
          amounts[i] = null;
          names[i] = null;
        }
      }

      names.push(`ETC < ${MIN_PERCENTAGE}%`);
      amounts.push(etc);

      // Inform user
      Swal.fire({
        icon: "info",
        title: "Portfolio graph",
        text: `Data in the portfolio graph has been grouped. Entries below ${MIN_PERCENTAGE}% of your portfolio are summarized in "ETC < ${MIN_PERCENTAGE}%".`,
      });
    } //if

    var data = [
      {
        type: "pie",
        values: amounts,
        labels: names,
        textinfo: "label+percent",
        textposition: "outside",
        automargin: true,
      },
    ];

    let layout = {
      showlegend: true,
      title: "Portfolio division",
      autosize: true,
    };

    const config = { responsive: true };

    Plotly.newPlot("ov-graph-pie1", data, layout, config);

    /////////////////////////////////////////////////////
    /// Pie chart `Asset division`
    /////////////////////////////////////////////////////
    let fiat = 0;
    let scoin = 0;
    let crypto = 0;

    this.#m_arrCurrency.forEach((e) => {
      if (e.IsFiat()) fiat += e.GetUSDEquivalent();
      else if (e.IsStableCoin()) scoin += e.GetUSDEquivalent();
      else crypto += e.GetUSDEquivalent();
    });

    data = [
      {
        type: "pie",
        values: [
          // Only show data if value > 0 (hide zero entries)
          fiat > 0 ? fiat : null,
          scoin > 0 ? scoin : null,
          crypto > 0 ? crypto : null,
        ],
        labels: [`Fiat`, `Stablecoins`, `Crypto`],
        textinfo: "label+percent",
        textposition: "outside",
        automargin: true,
      },
    ];

    layout = {
      showlegend: true,
      title: "Asset division",
      autosize: true,
    };
    Plotly.newPlot("ov-graph-pie2", data, layout, config);
  }

  /**
   * Draw line charts in `overview` page
   * @param {*} arrTransaction Transaction array from CAPP
   */
  DrawLineCharts(arrTransaction) {
    /////////////////////////////////////////////////////
    /// Deposits and Withdrawals
    /////////////////////////////////////////////////////
    let arrDepositData = new Map();
    let arrWithdrawData = new Map();
    let arrInterestData = new Map();

    // Collect data
    arrTransaction.forEach((e) => {
      const tmpDate = e.GetDateTime().substr(0, 10);

      // Collect deposits
      if (e.GetType() === TransactionType.DEPOSIT || e.GetType() === TransactionType.DEPOSITTOEXCHANGE) {
        console.log(e.GetUSDEquivalent());
        if (arrDepositData.get(tmpDate)) {
          // There is alrady an entry for that day

          arrDepositData.set(tmpDate, arrDepositData.get(tmpDate) + e.GetUSDEquivalent());
        } else arrDepositData.set(tmpDate, e.GetUSDEquivalent());
      }

      // Collect withdrawals
      if (e.GetType() === TransactionType.WITHDRAWAL || e.GetType() === TransactionType.WITHDRAWEXCHANGED) {
        if (arrWithdrawData.get(tmpDate)) {
          // There is alrady an entry for that day
          arrWithdrawData.set(tmpDate, arrWithdrawData.get(tmpDate) + e.GetUSDEquivalent());
        } else arrWithdrawData.set(tmpDate, -e.GetUSDEquivalent());
      }

      // Grab data for next chart too while we're in here
      // Collect interest data
      if (e.GetType() === TransactionType.INTEREST) {
        if (arrInterestData.get(tmpDate)) {
          // There is alrady an entry for that day
          arrInterestData.set(tmpDate, arrInterestData.get(tmpDate) + e.GetUSDEquivalent());
        } else {
          arrInterestData.set(tmpDate, e.GetUSDEquivalent());
        }
      }
    });

    console.log(arrDepositData);

    let trace1 = {
      x: [...arrDepositData.keys()],
      y: [...arrDepositData.values()],

      name: `Deposits`,
      mode: "lines+markers",
      marker: {
        size: 8,
      },
      line: {
        width: 2,
      },
      connectgaps: true,
    };

    let trace2 = {
      x: [...arrWithdrawData.keys()],
      y: [...arrWithdrawData.values()],
      mode: "lines+markers",
      name: `Withdrawals`,
      marker: {
        size: 8,
      },
      line: {
        width: 2,
      },
      connectgaps: true,
    };

    let data = [trace1, trace2];
    let layout = {
      title: "Deposits and Withdrawls",
      autosize: true,
      yaxis: {
        title: "USD",
        showline: false,
      },
    };

    const config = { responsive: true };

    Plotly.newPlot("ov-graph-line2", data, layout, config);

    /////////////////////////////////////////////////////
    /// Interest earned per day
    /////////////////////////////////////////////////////

    trace1 = {
      x: [...arrInterestData.keys()],
      y: [...arrInterestData.values()],
      type: `bar`,
      name: `Interest earned`,
      line: {
        dash: "solid",
        width: 2,
      },
    };

    data = [trace1];
    layout = {
      title: "Interest earned",
      autosize: true,
      yaxis: {
        title: "USD",
        showline: false,
      },
    };
    Plotly.newPlot("ov-graph-line1", data, layout, config);
  }

  /////////////////////////////////////////////////////////////////////////////
  // Helpers
  /////////////////////////////////////////////////////////////////////////////
  /**
   *
   * @returns Total fiat deposited as number
   */
  GetTotalFiatDeposited() {
    return this.#m_fTotalFiatDeposited;
  }

  /**
   *
   * @returns Total crypto deposited as number
   */
  GetTotalCryptoDeposited() {
    return this.#m_fTotalCryptoDeposited;
  }

  /**
   *
   * @returns Total interest earned in usd as number
   */
  GetTotalInterestEarnedAsUSD() {
    return this.#m_fTotalInterestEarnedAsUSD;
  }

  /**
   * Delays a call to method `x` by `ms` milliseconds
   * @param {*} x Method to call
   * @param {*} ms Milliseconds to wait
   * @returns a new promise
   */
  DelayFetch(x, ms) {
    return new Promise((resolve) =>
      setTimeout(function () {
        resolve(x);
      }, ms)
    );
  }

  /**
   * Get current depot value in USD
   * @returns Total depot value in USD
   */
  GetCurrentDepotValueInUSD() {
    let value = 0.0;
    this.#m_arrCurrency.forEach((e) => {
      value += e.GetUSDEquivalent();
    });

    if (isNaN(value)) value = -1;

    return value;
  }

  /**
   * Get CCurrency object
   * @returns CCurrency object
   */
  GetCCurrency(cur) {
    if (this.#m_arrCurrency.get(cur)) return this.#m_arrCurrency.get(cur);
    else return null;
  }

  /**
   * Get current nexo loyality level
   * @returns Loyality level of type `LoyalityLevel`
   */
  GetLoyalityLevel() {
    // No nexo tokens
    if (!this.#m_arrCurrency.has(CurrencyType.ERC20.NEXO)) {
      return LoyalityLevel.BASE;
    }

    const e = this.GetCurrentDepotValueInUSD();

    // Percentage of NEXO Tokens in portfolio
    const p = (100 / e) * this.#m_arrCurrency.get(CurrencyType.ERC20.NEXO).GetUSDEquivalent();

    if (p < 1) return LoyalityLevel.BASE;
    else if (p >= 1 && p < 5) return LoyalityLevel.SILVER;
    else if (p >= 5 && p < 10) return LoyalityLevel.GOLD;
    else if (p >= 10) return LoyalityLevel.PLATINUM;

    // Just in case..
    // This actually HITS when the CSV is messed up!
    alert("CSV file is invalid. Unknown loyality level ${p}. Stopping execution.");
    throw new Error(`Unknown loyality level p= ${p}`);
  }

  /**
   * Does the user have crypto in its portfolio?
   * @returns true if he has
   */
  HasCrypto() {
    let found = false;

    this.#m_arrCurrency.forEach((element) => {
      if (element.IsCrypto() || element.IsStableCoin()) {
        found = true;
      }
    });

    return found;
  }

  /**
   * Does the user have euro in its portfolio?
   * @returns true if he has
   */
  HasEUR() {
    let found = false;
    this.#m_arrCurrency.forEach((element) => {
      if (element.GetType() == CurrencyType.FIAT.EUR) found = true;
    });

    return found;
  }

  /**
   * Does the user have gbp in its portfolio?
   * @returns true if he has
   */
  HasGBP() {
    let found = false;
    this.#m_arrCurrency.forEach((element) => {
      if (element.GetType() == CurrencyType.FIAT.GBP) found = true;
    });

    return found;
  }
}
