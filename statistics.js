`use strict`;

import { CurrencyType, Currency } from "./currency.js";
import { TransactionType } from "./Transaction.js";

/////////////////////////////////////////////////////
/// Statistics helper class
/////////////////////////////////////////////////////
export const LoyalityLevel = {
  BASE: `BASE`, // <1% nexo tokens
  SILVER: `<span style="color: #c0c0c0">SILVER</span>`, // >1-5%
  GOLD: `<span style="color: #ffd700">GOLD</span>`, // >5-10%
  PLATINUM: `<span style="color: #e5e4e2">PLATINUM</span>`, // >10%
};

export class Statistics {
  m_fCryptoDepositSum;
  m_fWireDepositSum;
  m_fEarnedInterestSum;

  #m_currency;

  constructor() {
    this.m_fCryptoDepositSum = 0;
    this.m_fWireDepositSum = 0;
    this.m_fEarnedInterestSum = 0;

    this.#m_currency = new Map();
  }

  AddTransaction(t) {
    if (t.GetType() === TransactionType.DEPOSIT) {
      this.m_fCryptoDepositSum += parseFloat(t.GetUSDEquivalent(false));
    }

    if (t.GetType() === TransactionType.DEPOSITTOEXCHANGE) {
      this.m_fWireDepositSum += parseFloat(t.GetUSDEquivalent(false));
    }

    // When counting currencies ignore fixed terms  (deposits and withdraws) as the depot value stays the same
    if (
      t.GetType() != TransactionType.LOCKINGTERMDEPOSIT && // Internal transaction
      t.GetType() != TransactionType.UNLOCKINGTERMDEPOSIT && // Internal transaction
      t.GetType() != TransactionType.EXCHANGETOWITHDRAW && //FiatX to Fiat
      t.GetType() != TransactionType.EXCHANGEDEPOSITEDON // Fiat to FiatX
    ) {
      this.AddCurrency(t.GetCurrency(), t.GetAmount());

      // console.log(this.#m_currency);
      // console.log(t);
      // this.#m_currency
      //   .get(t.GetCurrency())
      //   .AddDate(t.GetDateTime().substr(0, 7));
      // this.#m_currency.get(t.GetCurrency()).AddAmount(t.GetAmount());
    }

    if (t.GetType() === TransactionType.INTEREST) {
      this.m_fEarnedInterestSum += parseFloat(t.GetUSDEquivalent(false));

      // Keep track of interest earned per coin
      this.#m_currency.get(t.GetCurrency()).AddInterestEarned(t.GetAmount());
    }
  }

  GetExchangeRates() {
    this.#m_currency.forEach((e) => {
      e.GetExchangeRate();
    });
  }

  // This is used in Coinlist page !
  GetCoinListAsHTML() {
    // Start with empty string
    let html = ``;

    // Go through all stored currencies
    this.#m_currency.forEach((e) => {
      html += `
      <div class="coinlist-element">
      <img
        class="coinlist-icon"
        src="https://cryptoicon-api.vercel.app/api/icon/${e
          .GetType()
          .toLowerCase()}"
      />
      <h3>${e.GetType()}</h3>
      <h4>${
        e.GetAmount() % 1 === 0
          ? e.GetAmount().toFixed(2)
          : e.GetAmount().toFixed(8)
      }</h4>
      <p>($${e.GetFiatEquivalent().toFixed(2)})</p>
    </div>`;
    });

    console.log(this.#m_currency);
    return html;
  }

  GetCoinsEarnedAsInterestAsHTML() {
    // Start with empty string
    let html = ``;

    // Go through all stored currencies
    this.#m_currency.forEach((e) => {
      if (e.GetInterestEarned() === 0) return;

      html += `
          <div class="coinlist-element">
          <img
            class="coinlist-icon"
            src="https://cryptoicon-api.vercel.app/api/icon/${e
              .GetType()
              .toLowerCase()}"
          />
          <h3>${e.GetType()}</h3>
          <h4>${
            e.GetInterestEarned() % 1 === 0
              ? e.GetInterestEarned().toFixed(2)
              : e.GetInterestEarned().toFixed(8)
          }</h4>
          
        </div>`;
    });

    return html;
  }

  AddCurrency(cur, amount) {
    // Process pairs (Coins exchanged on nexo exchange)
    if (amount.search(`/`) >= 0) {
      this.#AddCurrencyPair(cur, amount);
      return;
    }

    amount = parseFloat(amount);

    // Add curreny and amount
    if (!this.#m_currency.has(cur)) {
      this.#m_currency.set(cur, new Currency(cur));
    }
    this.#m_currency.get(cur).AddAmount(amount);
  }

  #AddCurrencyPair(cur, amount) {
    // Get exchange pair
    let cur1 = cur.substr(0, cur.search(`/`));
    let cur2 = cur.substr(cur.search(`/`) + 1, cur.length);

    console.log(`Found ${cur1} and ${cur2} (${cur})`);

    // Get the individual amounts
    let amount1 = amount.substr(0, amount.search(`/`));
    let amount2 = amount.substr(amount.search(`/`) + 1, cur.length);

    // Add them
    this.AddCurrency(cur1, amount1);
    this.AddCurrency(cur2, amount2);
  }

  DrawPieCharts() {
    let names = [];
    this.#m_currency.forEach((e) => {
      names.push(e.GetType());
    });
    let amounts = [];
    this.#m_currency.forEach((e) => {
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

    this.#m_currency.forEach((e) => {
      if (e.IsFiat()) fiat += e.GetFiatEquivalent();
      else if (e.IsStableCoin()) scoin += e.GetFiatEquivalent();
      else crypto += e.GetFiatEquivalent();
    });

    data = [
      {
        type: "pie",
        values: [fiat, scoin, crypto],
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

    console.log(this.#m_currency);
  }

  GetCurrentDepotValueInFiat() {
    let value = 0.0;
    this.#m_currency.forEach((e) => {
      value += e.GetFiatEquivalent();
    });

    return value;
  }

  GetLoyalityLevel() {
    // No nexo tokens
    if (!this.#m_currency.has(CurrencyType.NEXO)) {
      return LoyalityLevel.BASE;
    }

    const e = this.GetCurrentDepotValueInFiat();

    // Percentage of NEXO Tokens in portfolio
    const p =
      (100 / e) * this.#m_currency.get(CurrencyType.NEXO).GetFiatEquivalent();

    if (p < 1) return LoyalityLevel.BASE;
    else if (p >= 1 && p < 5) return LoyalityLevel.SILVER;
    else if (p >= 5 && p < 10) return LoyalityLevel.GOLD;
    else if (p >= 10) return LoyalityLevel.PLATINUM;

    // Just in case..
    throw new Error(`Unknown loyality level p=${p}`);
    return LoyalityLevel.BASE;
  }
}
