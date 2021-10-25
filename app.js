`use strict`;

import { TransactionType, Transaction } from "./Transaction.js";
import { LoyalityLevel, Statistics } from "./statistics.js";
import { SettingsType, Settings } from "./settings.js";

const AppState = {
  UPLOAD: 0,
  OVERVIEW: 1,
  COINLIST: 2,
  TRANSACTIONS: 3,
  EXIT: 4,
};

/////////////////////////////////////////////////////
/// Entry point
/////////////////////////////////////////////////////
class App {
  // Query elements
  #m_eDropZone;
  #m_eOverviewContainer;
  #m_eCoinListContainer;
  #m_eCoinListEarnedContainer;

  // Header
  #m_eHeaderMenu;
  #m_btnOverview;
  #m_btnCoinlist;
  #m_btnTransactions;

  // Pages
  #m_pTransactions;
  #m_pOverview;
  #m_pCoinlist;
  #m_pUpload;

  // File and data array
  #m_File; // TODO check & remove
  #m_transactions;

  // Settings
  #m_Settings;
  #m_appState; // TODO is this really needed doe?

  // Statistics
  #m_Stats;

  constructor() {
    this.Initiaize();
  }

  Initiaize() {
    this.QueryDocument();

    this.#m_Stats = new Statistics();
    this.#m_Settings = new Settings();
    this.#m_appState = AppState.UPLOAD;
  }

  QueryDocument() {
    // Start
    this.#m_eDropZone = document.querySelector(".start-drop-zone");
    this.#m_eDropZone.addEventListener("drop", this.DropHandler.bind(this));
    this.#m_eDropZone.addEventListener("dragover", this.DragOver);

    // Header
    this.#m_eHeaderMenu = document.querySelector(".header-menu");
    this.#m_btnOverview = document.querySelector("#btn-overview");
    this.#m_btnCoinlist = document.querySelector("#btn-coinlist");

    this.#m_btnTransactions = document.querySelector("#btn-transactions");
    this.#m_btnTransactions.addEventListener(
      "click",
      this.ShowTransactions.bind(this)
    );
    this.#m_btnCoinlist.addEventListener("click", this.ShowCoinlist.bind(this));
    this.#m_btnOverview.addEventListener("click", this.ShowOverview.bind(this));

    // Pages
    this.#m_pTransactions = document.querySelector(".transactions-container");
    this.#m_pOverview = document.querySelector(".overview-container");
    this.#m_pCoinlist = document.querySelector(".coinlist-container");
    this.#m_pUpload = document.querySelector(".start-container");

    // Coinlist
    this.#m_eCoinListContainer = document.querySelector(
      ".coinlist-element-container"
    );

    this.#m_eCoinListEarnedContainer = document.querySelector(
      ".coinlist-element-container-interest"
    );

    this.#m_eOverviewContainer = document.querySelector(
      ".overview-element-container"
    );
  }

  /////////////////////////////////////////////////////
  /// Site navigation
  /// (Header buttons)
  /////////////////////////////////////////////////////
  ShowOverview() {
    if (this.#m_appState === AppState.OVERVIEW) return;

    this.#ShowPage(this.#m_btnOverview, this.#m_pOverview);
  }

  ShowCoinlist() {
    if (this.#m_appState === AppState.COINLIST) return;

    this.#ShowPage(this.#m_btnCoinlist, this.#m_pCoinlist);
  }

  ShowTransactions() {
    if (this.#m_appState === AppState.TRANSACTIONS) return;

    this.#ShowPage(this.#m_btnTransactions, this.#m_pTransactions);
  }

  #ShowPage(btn, page) {
    // Hide everything
    this.#m_btnOverview.classList.remove(`active`);
    this.#m_btnCoinlist.classList.remove(`active`);
    this.#m_btnTransactions.classList.remove(`active`);

    this.#m_pTransactions.classList.add(`hidden`);
    this.#m_pOverview.classList.add(`hidden`);
    this.#m_pCoinlist.classList.add(`hidden`);
    this.#m_pUpload.classList.add(`hidden`);

    // Show active page only
    btn.classList.add(`active`);
    page.classList.remove(`hidden`);
  }

  /////////////////////////////////////////////////////
  /// File Handling
  /////////////////////////////////////////////////////
  // This is needed otherwise the `drop` event won't fire
  DragOver(e) {
    // Prevent default behavior
    e.preventDefault();
  }

  DropHandler(e) {
    // Prevent default behavior and bubbling
    e.preventDefault();
    e.stopImmediatePropagation();

    // We only accept one dropped item of type FILE
    if (e.dataTransfer.items) {
      if (e.dataTransfer.items[0].kind === "file") {
        this.m_File = e.dataTransfer.items[0].getAsFile();

        console.log(`Reading file ${this.m_File.name}..`);

        // Process content
        // prettier-ignore
        this.m_File.text().then((content) => this.FileReady(content));
      }
    }
  }

  /////////////////////////////////////////////////////
  /// CSV file is ready to read
  /////////////////////////////////////////////////////
  FileReady(content) {
    console.log(`file is ready!`);

    // init array
    this.#m_transactions = [];

    // split by line
    let arr = content.split("\n");

    // Get headers
    let headers = arr[0].split(",");

    // Go through data line by line
    for (let i = 1; i < arr.length; i++) {
      let data = arr[i].split(",");
      let obj = {};
      for (let j = 0; j < data.length; j++) {
        obj[headers[j].trim()] = data[j].trim();
      }

      this.#m_transactions.push(
        new Transaction(
          obj.Transaction,
          obj.Type,
          obj.Currency,
          obj.Amount,
          obj[`USD Equivalent`],
          obj.Details,
          obj[`Outstanding Loan`],
          obj[`Date / Time`].substr(0, 10)
        )
      );
    }

    this.#m_transactions.map((t) => this.UpdateStatistics(t));
    this.#m_transactions.map((t) => this.RenderTransaction(t));

    this.#m_Stats.GetExchangeRates();

    console.log(`Loading complete`);

    // TODO Move Graph generation to extra method
    let depositDates = [];
    let depositAmounts = [];
    let withdrawDates = [];
    let withdrawAmounts = [];

    let dates = [];
    this.#m_transactions.forEach((e) => {
      if (
        e.GetType() === TransactionType.DEPOSIT ||
        e.GetType() === TransactionType.DEPOSITTOEXCHANGE
      ) {
        depositDates.push(e.GetDateTime().substr(0, 10));
      }

      if (
        e.GetType() === TransactionType.WITHDRAWAL ||
        e.GetType() === TransactionType.WITHDRAWEXCHANGED
      ) {
        withdrawDates.push(e.GetDateTime().substr(0, 10));
      }
    });

    let amounts = [];
    this.#m_transactions.forEach((e) => {
      if (
        e.GetType() === TransactionType.DEPOSIT ||
        e.GetType() === TransactionType.DEPOSITTOEXCHANGE
      ) {
        depositAmounts.push(e.GetUSDEquivalent());
      }

      if (
        e.GetType() === TransactionType.WITHDRAWAL ||
        e.GetType() === TransactionType.WITHDRAWEXCHANGED
      ) {
        withdrawAmounts.push(-e.GetUSDEquivalent());
      }
    });

    // console.log(amounts);
    let depositsPerDay = this.GroupTransactionsPerDay(
      depositDates,
      depositAmounts
    );

    let withdrawalsPerDay = this.GroupTransactionsPerDay(
      withdrawDates,
      withdrawAmounts
    );

    let trace1 = {
      x: [...depositsPerDay.keys()],
      y: [...depositsPerDay.values()],
      mode: "lines+markers",
      name: `Deposits`,
      line: {
        dash: "solid",
        width: 2,
      },
    };
    let trace2 = {
      x: [...withdrawalsPerDay.keys()],
      y: [...withdrawalsPerDay.values()],
      mode: "lines+markers",
      name: `Withdrawals`,
      line: {
        dash: "solid",
        width: 2,
      },
    };

    let data = [trace1, trace2];
    let layout = {
      title: "Deposits and Withdrawls (USD)",
    };

    Plotly.newPlot("tester2", data, layout);

    dates = [];

    this.#m_transactions.forEach((e) => {
      if (e.GetType() === TransactionType.INTEREST) {
        dates.push(e.GetDateTime().substr(0, 10));
      }
    });

    amounts = [];
    this.#m_transactions.forEach((e) => {
      if (e.GetType() === TransactionType.INTEREST)
        amounts.push(e.GetUSDEquivalent());
    });

    let interestPerDay = this.GroupTransactionsPerDay(dates, amounts);

    trace1 = {
      x: [...interestPerDay.keys()],
      y: [...interestPerDay.values()],
      type: `scatter`,

      line: {
        dash: "solid",
        width: 2,
      },
    };

    data = [trace1];
    layout = {
      title: "Interest earned (USD)",
    };
    Plotly.newPlot("tester3", data, layout);

    // FIXME This is sometimes too early. Find a better method of doing this! Maybe use a callback.
    setTimeout(() => {
      this.#m_eCoinListContainer.insertAdjacentHTML(
        `beforeend`,
        this.#m_Stats.GetCoinListAsHTML()
      );

      this.#m_eCoinListEarnedContainer.insertAdjacentHTML(
        `beforeend`,
        this.#m_Stats.GetCoinsEarnedAsInterestAsHTML()
      );

      //this.#m_Stats.GeneratePortfolioGraph();
    }, 1000);

    setTimeout(() => {
      this.RenderStatistics();
    }, 1000);

    // Hide start and show data
    this.#ShowPage(this.#m_btnOverview, this.#m_pOverview);

    // Show menu
    this.#m_eHeaderMenu.classList.remove("hidden");

    //////////////////////////////////////////////////////////////////
    /// Portfolio value tries
    //////////////////////////////////////////////////////////////////

    // // DAILY
    // dates = [];
    // this.#m_transactions.forEach((e) => {
    //   if (
    //     e.GetType() === TransactionType.LOCKINGTERMDEPOSIT || // Internal transaction
    //     e.GetType() === TransactionType.UNLOCKINGTERMDEPOSIT || // Internal transaction
    //     e.GetType() === TransactionType.EXCHANGETOWITHDRAW || //FiatX to Fiat
    //     e.GetType() === TransactionType.EXCHANGEDEPOSITEDON // Fiat to FiatX
    //   )
    //     return;
    //   dates.push(e.GetDateTime().substr(0, 10));
    // });

    // //console.log(dates);

    // amounts = [];
    // this.#m_transactions.forEach((e) => {
    //   if (
    //     e.GetType() === TransactionType.LOCKINGTERMDEPOSIT || // Internal transaction
    //     e.GetType() === TransactionType.UNLOCKINGTERMDEPOSIT || // Internal transaction
    //     e.GetType() === TransactionType.EXCHANGETOWITHDRAW || //FiatX to Fiat
    //     e.GetType() === TransactionType.EXCHANGEDEPOSITEDON // Fiat to FiatX
    //   )
    //     return;
    //   if (
    //     e.GetType() === TransactionType.WITHDRAWAL ||
    //     e.GetType() === TransactionType.WITHDRAWEXCHANGED
    //   )
    //     amounts.push(-e.GetUSDEquivalent());
    //   else amounts.push(e.GetUSDEquivalent());
    // });

    // let portfolioValue = this.GroupTransactionsPerMonth(dates, amounts);

    // let lastValue = 0;
    // portfolioValue.forEach((v, k, m) => {
    //   m.set(k, m.get(k) + lastValue);

    //   lastValue = v;
    // });

    // console.log(portfolioValue);

    // fetch(`https://api.coinbase.com/v2/prices/BTC-USD/spot?date=2021-10-10`)
    //   .then((response) => response.json())
    //   .then((data) => console.log(data));
    // fetch(`https://api.coinbase.com/v2/prices/BTC-USD/spot`)
    //   .then((response) => response.json())
    //   .then((data) => console.log(data));

    // trace1 = {
    //   x: [...interestPerDay.keys()],
    //   y: [...interestPerDay.values()],
    //   type: `scatter`,

    //   line: {
    //     dash: "solid",
    //     width: 2,
    //   },
    // };

    // data = [trace1];
    // layout = {
    //   title: "Interest earned (USD)",
    // };
    // Plotly.newPlot("tester3", data, layout);

    //console.log(this.GroupTransactionsPerMonth(dates, amounts));
  }

  GroupTransactionsPerDay(dates, amounts) {
    let groupedbyday = new Map();

    dates.forEach((e, i) => {
      if (!groupedbyday.has(e)) {
        groupedbyday.set(e, 0);
      }
      groupedbyday.set(
        e,
        parseFloat(groupedbyday.get(e)) + parseFloat(amounts[i])
      );
    });

    return groupedbyday;
  }

  GroupTransactionsPerMonth(dates, amounts) {
    let groupedbyday = new Map();

    dates.forEach((e, i) => {
      if (!groupedbyday.has(e)) {
        groupedbyday.set(e, 0);
      }
      groupedbyday.set(
        e,
        parseFloat(groupedbyday.get(e)) + parseFloat(amounts[i])
      );
    });

    return groupedbyday;
  }

  /////////////////////////////////////////////////////
  /// Count statistics
  /////////////////////////////////////////////////////
  UpdateStatistics(t) {
    this.#m_Stats.AddTransaction(t);
  }

  /////////////////////////////////////////////////////
  /// Render statistics
  /////////////////////////////////////////////////////
  RenderStatistics() {
    this.#m_Stats.DrawPieCharts();

    let html = ``;

    html += `
    <div class="overview-element">
    <h2>${this.#m_Stats.GetCurrentDepotValueInFiat().toFixed(2)}$</h2>
    Depot value
    </div>`;
    html += `
    <div class="overview-element">
    <h2>${this.#m_transactions.length + 1}</h2>
    Transactions
    </div>`;
    html += `
    <div class="overview-element">
    <h2>${this.#m_Stats.m_fEarnedInterestSum.toFixed(2)}$</h2>
    Interest earned
    </div>`;
    html += `
    <div class="overview-element-disabled">
    <h2>0$</h2>
    Outstanding loans
    </div>`;
    html += `
    <div class="overview-element">
    <h2>${this.#m_Stats.GetLoyalityLevel()}</h2>
    Membership level
    </div>`;

    this.#m_eOverviewContainer.insertAdjacentHTML(`beforeend`, html);
  }

  /////////////////////////////////////////////////////
  /// Render table transactions
  /////////////////////////////////////////////////////
  RenderTransaction(t) {
    let table = document.querySelector(".transactions-table");

    let html;

    if (this.#m_Settings.GetSetting(SettingsType.SHOWICONS)) {
      // Add icons to non-pair currencies
      let currency = t.GetCurrency();
      if (currency.search(`/`) === -1) {
        currency =
          `<img style="width: 24px; height: 24px" src="https://cryptoicon-api.vercel.app/api/icon/${currency.toLowerCase()}" /> ` +
          currency;
      }

      // Details
      let details = t.GetDetails();
      if (details.substr(0, 8) === `approved`) details = `✅ ` + details;
      else details = `❌ ` + details;

      // Transaction type
      let type = t.GetType();

      // Fixed term
      if (type === TransactionType.LOCKINGTERMDEPOSIT) type = `🔐 ` + type;
      if (type === TransactionType.UNLOCKINGTERMDEPOSIT) type = `🔓 ` + type;

      // Interest
      if (type === TransactionType.INTEREST) type = `💸 ` + type;

      if (type === TransactionType.FIXEDTERMINTEREST) {
        type = `🔓💸 ` + type;
      }

      // Deposits of any kind
      if (
        type === TransactionType.DEPOSITTOEXCHANGE ||
        type === TransactionType.EXCHANGEDEPOSITEDON ||
        type === TransactionType.DEPOSIT
      )
        type = `⏫ ` + type;

      // Exchange
      if (type === TransactionType.EXCHANGE) type = `🔀 ` + type;

      // Withdrawal of any kind
      if (
        type === TransactionType.WITHDRAWEXCHANGED ||
        type === TransactionType.EXCHANGETOWITHDRAW ||
        type === TransactionType.WITHDRAWAL
      )
        type = `⏬ ` + type;

      html = `<tr>
    <td>${t.GetId()}</td>
    <td>${type}</td>
    <td>${currency}</td>
    <td>${t.GetAmount(this.#m_Settings.GetSetting(false))}</td>
    <td>$ ${t.GetUSDEquivalent(
      this.#m_Settings.GetSetting(SettingsType.PRETTYNUMBERS)
    )}</td>
    <td>${this.LinkTXsToExplorer(t, details)}</td>
    <td>$ ${t.GetOutstandingLoan()}</td>
    <td>${t.GetDateTime()}</td>
  </tr>`;
    } else {
      // No icons
      html = `<tr>
    <td>${t.GetId()}</td>
    <td>${t.GetType()}</td>
    <td>${t.GetCurrency()}</td>
    <td>${t.GetAmount(
      this.#m_Settings.GetSetting(SettingsType.PRETTYNUMBERS)
    )}</td>
    <td>$ ${t.GetUSDEquivalent(
      this.#m_Settings.GetSetting(SettingsType.PRETTYNUMBERS)
    )}</td>
    <td>${this.LinkTXsToExplorer(t, t.GetDetails())}</td>
    <td>$ ${t.GetOutstandingLoan()}</td>
    <td>${t.GetDateTime()}</td>
  </tr>`;
    }

    table.insertAdjacentHTML(`beforeend`, html);
  }

  /////////////////////////////////////////////////////
  /// Hyperlinks a blockchain tx to it's explorer website and readds the original detail phrase
  /////////////////////////////////////////////////////
  LinkTXsToExplorer(t, details) {
    let detailshtml = details;

    // Exit here if disabled
    if (!this.#m_Settings.GetSetting(SettingsType.LINKTRANSACTIONS))
      return detailshtml;

    // ERC-20
    if (
      (t.GetCurrency() === `ETH` || t.GetCurrency() === `LINK`) &&
      t.GetType() === TransactionType.DEPOSIT
    ) {
      let tx = details.substr(details.search(`/`) + 1, details.length).trim();
      detailshtml =
        details.substr(0, details.search(`/`) + 2) +
        `<a href="https://etherscan.io/tx/` +
        tx +
        `">` +
        tx +
        `</a>`;
    }

    // BTC
    if (t.GetCurrency() === `BTC` && t.GetType() === TransactionType.DEPOSIT) {
      let tx = details.substr(details.search(`/`) + 1, details.length).trim();
      detailshtml =
        details.substr(0, details.search(`/`) + 2) +
        `<a href="https://www.blockchain.com/btc/tx/` +
        tx +
        `">` +
        tx +
        `</a>`;
    }

    // XRP
    if (t.GetCurrency() === `XRP` && t.GetType() === TransactionType.DEPOSIT) {
      let tx = details.substr(details.search(`/`) + 1, details.length).trim();
      detailshtml =
        details.substr(0, details.search(`/`) + 2) +
        `<a href="https://xrpscan.com/tx/` +
        tx +
        `">` +
        tx +
        `</a>`;
    }
    return detailshtml;
  }
}

// Let's go =)
let app = new App();

// Chats.JS
// data = {
//   labels: [...interestPerDay.keys()].reverse(),
//   datasets: [
//     {
//       label: "Interest in USD",
//       backgroundColor: "rgb(255, 99, 132)",
//       borderColor: "rgb(255, 99, 132)",
//       data: [...interestPerDay.values()].reverse(),
//     },
//   ],
// };
// let config = {
//   type: "line",
//   data: data,
//   options: {
//     responsive: true,
//     maintainAspectRatio: false,
//   },
// };
// var myChart = new Chart(document.getElementById("myChart"), config);

// data = {
//   labels: [...transactionsPerDay.keys()].reverse(),
//   datasets: [
//     {
//       label: "Deposits and Withdrawls",
//       backgroundColor: "rgb(255, 99, 132)",
//       borderColor: "rgb(255, 99, 132)",
//       data: [...transactionsPerDay.values()].reverse(),
//     },
//   ],
// };
// config = {
//   type: "line",
//   data: data,
//   options: {
//     responsive: true,
//     maintainAspectRatio: false,
//   },
// };
// var myChart2 = new Chart(document.getElementById("myChart2"), config);
