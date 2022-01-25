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

/////////////////////////////////////////////////////
/// Statistics helper module
/////////////////////////////////////////////////////
export const LoyalityLevel = {
  BASE: `BASE`, // <1% nexo tokens
  SILVER: `<span style="color: #c0c0c0">🥈 SILVER</span>`, // >1-5%
  GOLD: `<span style="color: #ffd700">🥇 GOLD</span>`, // >5-10%
  PLATINUM: `<span style="color: #e5e4e2">🔥 PLATINUM</span>`, // >10%
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

  constructor() {
    this.#m_fTotalCryptoDeposited = 0;
    this.#m_fTotalFiatDeposited = 0;
    this.#m_fTotalInterestEarnedAsUSD = 0;

    this.#m_arrCurrency = new Map();
  }

  /**
   * Adds a new transaction to the stats
   */
  AddTransaction(t) {
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

    if (t.GetType() === TransactionType.INTEREST) {
      // Keep track of interest earned per coin
      this.#m_arrCurrency.get(t.GetCurrency()).AddInterestEarnedInKind(t.GetAmount());
    }
  }

  GetExchangeRates(finishedCallback = null) {
    let urls = [];

    this.#m_arrCurrency.forEach((e) => {
      urls.push(e.GetExchangeRateAsAPIString());
    });

    // Make promises resolve to their final value
    // let apiRequests = urls.map((url) => fetch(url).then((res) => res.json()));
    // go easy with the APIs and delay the calls a little (5 calls per sec max)
    let i = 0;
    let apiRequests = urls.map((url) =>
      this.DelayFetch(url, (i += 200)).then((url) => fetch(url).then((res) => res.json()))
    );
    console.log(`~Load time ~${i}ms`);

    // Wait for all promises to settle
    Promise.allSettled(apiRequests).then((responses) => {
      responses.forEach((response, index) => {
        // Loop through all responses
        if (response.status === "fulfilled") {
          const currency = response.value.data.currency;
          // Success
          if (this.#m_arrCurrency.has(currency)) {
            // USD value
            const value = parseFloat(response.value.data.rates.USD);

            // Look up currency and set the fiat value
            this.#m_arrCurrency
              .get(currency)
              .SetFiatEquivalent(value * parseFloat(this.#m_arrCurrency.get(currency).GetAmount()));

            // Set interest earned in-coin value
            this.#m_arrCurrency
              .get(currency)
              .SetInterestEarnedInFiat(
                value * this.#m_arrCurrency.get(currency).GetInterestEarnedInKind()
              );
          }
        } else if (response.status === "rejected") {
          // Failed
          console.log(`GetExchangeRate failed for: ${urls[index]} - ${response.reason}`);
        }
      });

      this.#m_fTotalInterestEarnedAsUSD = 0;

      this.#m_arrCurrency.forEach((v, k, m) => {
        this.#m_fTotalInterestEarnedAsUSD += v.GetInterestEarnedInFiat();
      });

      // We're ready !
      if (finishedCallback) finishedCallback();
    });
  }

  /**
   * Get full Coinlist portfolio as html string
   * @returns html ready for injection
   */
  GetCoinlistAsHTML() {
    // Start with empty string
    let html = ``;

    // Go through all stored currencies
    this.#m_arrCurrency.forEach((e) => {
      html += `<div class="pure-u-1-4 pure-u-lg-1-8 coinlist-container">
<img class="coinlist-icon" src="https://cryptoicon-api.vercel.app/api/icon/${e
        .GetType()
        .toLowerCase()}" />
<h3>${e.GetType()}</h3>
<h4>${e.GetAmount() % 1 === 0 ? e.GetAmount().toFixed(2) : e.GetAmount().toFixed(8)}</h4>
<p>~$${e.GetFiatEquivalent().toFixed(2)}</p>
</div>`;
    }); //

    return html;
  }

  /**
   * Get full Coinlist earned in kind stats as html string
   * @returns html ready for injection
   */
  GetCoinlistEarnedInKindAsHTML() {
    // Start with empty string
    let html = ``;

    // Go through all stored currencies
    this.#m_arrCurrency.forEach((e) => {
      if (e.GetInterestEarnedInKind() === 0) return;

      html += `<div class="pure-u-1-4 pure-u-lg-1-8 coinlist-container">
<img class="coinlist-icon" src="https://cryptoicon-api.vercel.app/api/icon/${e
        .GetType()
        .toLowerCase()}" />
<h3>${e.GetType()}</h3>
<h4>${
        e.GetInterestEarnedInKind() % 1 === 0
          ? e.GetInterestEarnedInKind().toFixed(2)
          : e.GetInterestEarnedInKind().toFixed(8)
      }</h4>
<p>~$${e.GetInterestEarnedInFiat().toFixed(2)}</p>
</div>`;
    });

    return html;
  }

  AddCurrency(t = null, cur = null, amount = null) {
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
      const errormsg =
        "Transaction file is invalid! Stopping execution. Could not receive exchange values (Look at exchange transactions there probably a value missing).";
      alert(errormsg);

      // It makes no sense to continue execution after we failed here
      throw new Error(errormsg);
    }

    // Add curreny and amount
    if (!this.#m_arrCurrency.has(cur)) {
      this.#m_arrCurrency.set(cur, new CCurrency(cur));
    }
    this.#m_arrCurrency.get(cur).AddAmount(amount);

    //

    this.#m_arrCurrency.get(cur).AddTXDate(t.GetDateTime().substr(0, 7));
    this.#m_arrCurrency.get(cur).AddTXAmount(amount);
  }

  DelayFetch(x, ms) {
    return new Promise((resolve) =>
      setTimeout(function () {
        resolve(x);
      }, ms)
    );
  }

  /**
   * TODO, CHECK, REVISE
   */
  /////////////////////////////////////////////////////
  /// Generate portfolio value over time
  /////////////////////////////////////////////////////
  GeneratePortfolioGraph() {
    let urls = [];

    // Collect all fetch promises, we want to send and wait for all of them together
    this.#m_arrCurrency.forEach((v, k, m) => {
      v.SetPortfolioValue(this.GroupTransactionsPerMonth(v.GetTXDates(), v.GetTXAmounts()));

      urls.push(...m.get(k).GetExchangeRate(true));
    });

    // Make promises resolve to their final value
    // go easy with the APIs and delay the calls a little (5 calls per sec max)
    let i = 0;
    let apiRequests = urls.map((url) =>
      this.DelayFetch(url, (i += 200)).then((url) => fetch(url).then((res) => res.json()))
    );

    console.log(`~Load time ~${i}ms`);

    let month, year;
    let currency, value;

    // Wait for all promises to settle
    Promise.allSettled(apiRequests).then((responses) => {
      responses.forEach((response, index) => {
        // Loop through all responses
        if (response.status === "fulfilled") {
          console.log(response);

          // Process API endpoints..
          if (urls[index].search(`coinbase`) >= 0) {
            /////////////////////////////////////////////////////
            /// Coinbase API
            /////////////////////////////////////////////////////
            // TODO Process coinbase API endpoint
            console.log(`Response from coinbase~`);

            year = urls[index].substr(-10, 4);
            month = urls[index].substr(-5, 2);

            currency = response.value.data.base;

            if (this.#m_arrCurrency.has(currency)) {
              // USD value
              value = parseFloat(response.value.data.amount);

              console.log(`~~${currency + ` - ` + value}$`);
            } else console.log(`~~${currency} not found (${urls[index]})`);
          } else if (urls[index].search(`coingecko`) >= 0) {
            /////////////////////////////////////////////////////
            /// Coingecko API
            /////////////////////////////////////////////////////
            // TODO Process coingecko API endpoint
            console.log(`Response from coingecko~`);
            //console.log(response.value);

            currency = response.value.symbol.toUpperCase();

            // TODO this works just extract the values (year, month)
            // console.log(
            //   `Year: ${urls[index].substr(-4, 4)}, Month: ${urls[index].substr(
            //     -7,
            //     2
            //   )}`
            // );

            if (this.#m_arrCurrency.has(currency)) {
              // USD value
              value = parseFloat(response.value.market_data.current_price.usd);

              console.log(`~~${currency + ` - ` + value}$`);
            } else console.log(`~~${currency} not found (${urls[index]})`);
          } else {
            console.log(
              `Could not identify API response.. stopping portolio graph generation (${urls[index]}).`
            );
            return;
          }
        } else if (response.status === "rejected") {
          // Failed
          console.log(`GetExchangeRate failed for: ${urls[index]} - ${response.reason}`);
        }
      });

      // We're ready !
      //if (finishedCallback) finishedCallback();
    });
  }

  GroupTransactionsPerMonth(dates, amounts) {
    let groupedbyday = new Map();

    dates.forEach((e, i) => {
      if (!groupedbyday.has(e)) {
        groupedbyday.set(e, 0);
      }
      groupedbyday.set(e, parseFloat(groupedbyday.get(e)) + parseFloat(amounts[i]));
    });

    return groupedbyday;
  }

  #AddCurrencyPair(t, cur, amount) {
    // Get exchange pair
    const cur1 = cur.substr(0, cur.search(`/`));
    const cur2 = cur.substr(cur.search(`/`) + 1, cur.length);

    //console.log(`Found ${cur1} and ${cur2} (${cur})`);

    // Get the individual amounts
    const amount1 = amount.substr(0, amount.search(`/`));
    const amount2 = amount.substr(amount.search(`/`) + 1, cur.length);

    if (isNaN(amount1) || isNaN(amount2))
      alert("Transaction file is invalid! Could not find exchange values.");

    // Add them
    this.AddCurrency(t, cur1, amount1);
    this.AddCurrency(t, cur2, amount2);
  }

  /**
   * TODO, CHECK, REVISE
   */
  DrawPieCharts() {
    let names = [];
    this.#m_arrCurrency.forEach((e) => {
      names.push(e.GetType());
    });
    let amounts = [];
    this.#m_arrCurrency.forEach((e) => {
      amounts.push(e.GetFiatEquivalent());
    });
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

    var layout = {
      //margin: { t: 0, b: 0, l: 0, r: 0 },
      showlegend: true,
      title: "Portfolio division",
    };
    Plotly.newPlot("tester", data, layout);

    let fiat = 0;
    let scoin = 0;
    let crypto = 0;

    this.#m_arrCurrency.forEach((e) => {
      if (e.IsFiat()) fiat += e.GetFiatEquivalent();
      else if (e.IsStableCoin()) scoin += e.GetFiatEquivalent();
      else crypto += e.GetFiatEquivalent();
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
      //margin: { t: 0, b: 0, l: 0, r: 0 },
      showlegend: true,
      title: "Asset division",
    };
    Plotly.newPlot("tester4", data, layout);
  }

  GetCurrentDepotValueInFiat() {
    let value = 0.0;
    this.#m_arrCurrency.forEach((e) => {
      value += e.GetFiatEquivalent();
    });

    return value;
  }

  GetLoyalityLevel() {
    // No nexo tokens
    if (!this.#m_arrCurrency.has(CurrencyType.NEXO)) {
      return LoyalityLevel.BASE;
    }

    const e = this.GetCurrentDepotValueInFiat();

    // Percentage of NEXO Tokens in portfolio
    const p = (100 / e) * this.#m_arrCurrency.get(CurrencyType.NEXO).GetFiatEquivalent();

    if (p < 1) return LoyalityLevel.BASE;
    else if (p >= 1 && p < 5) return LoyalityLevel.SILVER;
    else if (p >= 5 && p < 10) return LoyalityLevel.GOLD;
    else if (p >= 10) return LoyalityLevel.PLATINUM;

    // Just in case..
    // This actually HITS when the CSV is messed up!
    alert("CSV file is invalid. Stopping execution.");
    throw new Error(`Unknown loyality level p=${p}`);
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
}
