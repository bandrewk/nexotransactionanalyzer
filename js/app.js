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
import { CNavigator, State as Page } from "/js/navigator.js";
import { CTransaction, TransactionType } from "/js/transaction.js";
import { CStatistics } from "/js/statistics.js";
import { CCurrency, CurrencyType } from "/js/currency.js";

/**
 * Application module
 */
class CApp {
  // Page elements
  #m_eDropZone;
  #m_btnRawData;
  #m_eOverview;

  #m_btnDemo;
  #m_btnCurrencyTest;

  // Coinlist
  #m_eCoinlistEarnedInCoin;
  #m_eCoinlistPortfolio;
  #m_eCoinlistCashback;

  // File handle
  #m_file;

  // Navigator class
  #m_cNavigator;

  // Statistics class
  #m_cStatistics;

  // Transaction storage
  #m_arrTransaction;
  #m_arrRawTransactionData;

  // Transaction table
  #m_cGrid;
  #m_bRawTableActive;

  constructor() {
    this.#Initiaize();
  }

  /**
   * Initialization code
   */
  #Initiaize() {
    this.#StartParticleSystem();
    this.#ParseDocument();

    this.#m_cNavigator = new CNavigator();
    this.#m_cStatistics = new CStatistics();

    this.#DisplayInfo();

    // Use nexo api wherever possible
    window.USE_NEXO_API = true;

    // Demo mode?
    window.DEMO_MODE = false;

    // First and last transaction recorded needed for historical data
    window.FIRST_TRANSACTION = new Date();
    window.LAST_TRANSACTION = new Date();
  }

  /**
   * Display info about broken CSV export on nexo.io
   * Only display it once when confirmed
   */
  #DisplayInfo() {
    //localStorage.removeItem("info-csv");
    if (!localStorage.getItem("info-csv")) {
      Swal.fire({
        icon: "info",
        title: "Nexo.io CSV export",
        text: `Nexo's export functionality is currently not working as intended. Therefore recently exported files won't work. Older exported transactions (before 12/21) will work though.`,
        //footer: '<a href="">Why do I have this issue?</a>',
      }).then((result) => {
        /* Reload page when confirmed */
        if (result.isConfirmed) {
          localStorage.setItem("info-csv", "1");
        }
      });
    }
  }

  /**
   * Parse document for needed handles
   */
  #ParseDocument() {
    let bFailed = false;

    // Drop zone
    this.#m_eDropZone = document.querySelector(".home-dropzone");

    if (this.#m_eDropZone) {
      this.#m_eDropZone.addEventListener("drop", this.DropHandler.bind(this));
      this.#m_eDropZone.addEventListener("dragover", this.DragOver);
    } else bFailed = true;

    // Button raw data
    this.#m_btnRawData = document.querySelector("#btnRawData");

    if (this.#m_btnRawData) {
      this.#m_btnRawData.addEventListener("click", this.OnBtnRawDataClicked.bind(this));
    } else bFailed = true;

    // Coinlist
    this.#m_eCoinlistEarnedInCoin = document.querySelector("#coinlist-earnedInCoin");
    this.#m_eCoinlistPortfolio = document.querySelector("#coinlist-portfolio");
    this.#m_eCoinlistCashback = document.querySelector("#coinlist-cashback");
    if (!(this.#m_eCoinlistEarnedInCoin && this.#m_eCoinlistPortfolio && this.#m_eCoinlistCashback)) bFailed = true;

    // Overview
    this.#m_eOverview = document.querySelector("#overview");
    if (!this.#m_eOverview) bFailed = true;

    // Button demo
    this.#m_btnDemo = document.querySelector("#btnDemo");
    if (this.#m_btnDemo) {
      this.#m_btnDemo.addEventListener("click", this.OnBtnDemoClicked.bind(this));
    } else bFailed = true;

    // Currency test
    this.#m_btnCurrencyTest = document.querySelector("#btnCurrencyTest");
    if (this.#m_btnCurrencyTest) {
      this.#m_btnCurrencyTest.addEventListener("click", this.OnBtnCurrencyTestClicked.bind(this));
    } else bFailed = true;

    if (bFailed) {
      console.log(
        "Failed parsing document: Unable to catch all handles. Please verify that the script is loaded as module and the HTML is intact."
      );
    }
  }

  /////////////////////////////////////////////////////////////////////////////
  /// File Handling
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Prevent default behavior
   * This is needed otherwise the `drop` event won't fire
   * @param {event} e
   */
  DragOver(e) {
    e.preventDefault();
  }

  /**
   * Handle the drop event
   * @param {*} e
   */
  DropHandler(e) {
    // Prevent default behavior and bubbling
    e.preventDefault();
    e.stopImmediatePropagation();

    // Only accept one dropped item of type FILE
    if (e.dataTransfer.items) {
      if (e.dataTransfer.items[0].kind === "file") {
        this.#m_file = e.dataTransfer.items[0].getAsFile();

        console.log(`Reading file ${this.#m_file.name}..`);

        // Process content
        this.#m_file.text().then((content) => this.ProcessFile(content));
      }
    }
  }

  /**
   * Process and load the given file
   * @param {*} content File to process
   */
  ProcessFile(content) {
    // init array
    this.#m_arrTransaction = [];

    // Init raw array
    this.#m_arrRawTransactionData = [];

    // split by line
    let arr = content.split("\n");

    // Get headers
    let headers = arr[0].split(",");

    // Quick check if headers and data are present
    if (headers.length != 8 || arr.length <= 1) {
      const error = "Invalid transaction file. Please reload and try again.";

      // Exit
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: error,
        //footer: '<a href="">Why do I have this issue?</a>',
      }).then((result) => {
        /* Reload page when confirmed */
        if (result.isConfirmed) {
          location.reload();
        }
      });

      throw new Error(error);
    }

    if (!window.DEMO_MODE) arr = arr.reverse();

    // Go through data line by line
    let i = 0;
    if (window.DEMO_MODE) i = 1;

    for (i; i < arr.length - 1; i++) {
      let data = arr[i].split(",");
      let obj = {};

      for (let j = 0; j < data.length; j++) {
        obj[headers[j].trim()] = data[j].trim();
      }

      // Sometimes theres an empty last line
      if (obj.Transaction === "") break;

      // Store transaction data
      this.#m_arrTransaction.push(
        new CTransaction(
          obj.Transaction,
          obj.Type,
          obj.Currency,
          obj.Amount,
          obj[`USD Equivalent`],
          obj.Details,
          obj[`Outstanding Loan`],
          obj[`Date / Time`].substr(0, 10) // Only grab the date
        )
      );

      // Store RAW data as well
      this.#m_arrRawTransactionData.push([
        obj.Transaction,
        obj.Type,
        obj.Currency,
        obj.Amount,
        obj[`USD Equivalent`],
        obj.Details,
        obj[`Outstanding Loan`],
        obj[`Date / Time`],
      ]);
    } //for

    // Setup table with raw data
    // See https://gridjs.io/docs/index
    this.#m_cGrid = new gridjs.Grid({
      columns: headers,
      data: this.#m_arrRawTransactionData,
      pagination: {
        enabled: true,
        limit: 50,
        summary: true,
      },
      search: {
        enabled: true,
      },
      style: {
        table: {
          "white-space": "nowrap",
          //"font-size": "10px",
        },
        td: {
          padding: "10px 10px",
        },
      },
      sort: true,
      width: `100%`,
      resizable: true,
    }).render(document.getElementById("transactionTable"));

    // Sing up for resize messages
    window.addEventListener("resize", this.OnWindowResize.bind(this));

    // By default, the pretty table is rendered
    this.#m_bRawTableActive = false;

    // Count statistics
    this.#m_arrTransaction.map((t) => arr.push(this.#m_cStatistics.AddTransaction(t)));

    this.#m_cStatistics.GetCurrentExchangeRates(this.ReceiveCurrentExchangeRates.bind(this));
    this.#m_cStatistics.GetHistoricalPortfolioData();

    // Navigate
    this.#m_cNavigator.ShowPage(Page.OVERVIEW);
    this.#m_cNavigator.ShowMenu();

    // Register callbacks on navigator module
    this.#m_cNavigator.AddPageChangedCallback(Page.TRANSACTIONS, this.OnPageTransactionsOpened.bind(this));
    this.#m_cNavigator.AddPageChangedCallback(Page.OVERVIEW, this.OnPageOverviewOpened.bind(this));

    // Loading anim
    this.#StartLoadingAnimation();
  }

  /**
   * Exchanges rates have arrived, display them.
   */
  ReceiveCurrentExchangeRates() {
    this.#RenderCoinlist();
    this.#RenderOverview();
    this.#RenderTransaction();
    this.#FreeParticleSystems();
  }

  /////////////////////////////////////////////////////////////////////////////
  // Transactions
  /////////////////////////////////////////////////////////////////////////////
  /**
   * Browser window has been resized
   * Transaction table needs to be redrawn.
   */
  OnWindowResize() {
    this.#m_cGrid.updateConfig({ sort: true }).forceRender();
  }

  /**
   * Renders the transactions table
   * @param {*} bRaw Render raw data?
   */
  #RenderTransaction(bRaw = false) {
    if (bRaw) {
      this.#m_cGrid.updateConfig({ data: this.#m_arrRawTransactionData }).forceRender();
      return;
    }
    let arr = [];

    this.#m_arrTransaction.map((t) => arr.push(this.PrettierTransaction(t)));

    this.#m_cGrid.updateConfig({ data: arr }).forceRender();
  }

  /**
   * Raw data button clicked
   */
  OnBtnRawDataClicked() {
    this.#m_bRawTableActive = !this.#m_bRawTableActive;
    this.#m_btnRawData.classList.toggle(`pure-button-active`);
    this.#RenderTransaction(this.#m_bRawTableActive);
  }

  /**
   * Load demo content
   */
  OnBtnDemoClicked() {
    window.DEMO_MODE = true;

    fetch("demo-data.csv")
      .then((response) => response.text())
      .then((content) => {
        this.ProcessFile(content);

        Swal.fire({
          icon: "info",
          title: "Demo mode",
          text: `This demo contains some sample data to verify functionality. It doesn't necessarily make sense.`,
          //footer: '<a href="">Why do I have this issue?</a>',
        });
      });
  }

  /**
   * Currency test (loads all currencies)
   */
  OnBtnCurrencyTestClicked() {
    window.DEMO_MODE = true;

    fetch("demo-data-all-currencies.csv") // -all-currencies
      .then((response) => response.text())
      .then((content) => {
        this.ProcessFile(content);

        Swal.fire({
          icon: "info",
          title: "Demo mode",
          text: `This demo contains some sample data to verify functionality. It doesn't necessarily make sense.`,
          //footer: '<a href="">Why do I have this issue?</a>',
        });
      });
  }

  /**
   * Styles the transaction to be displayed
   * @param {*} t Transaction
   * @returns A pretty transaction
   */
  PrettierTransaction(t) {
    // Add icons to non-pair currencies
    let currency = t.GetCurrency();

    if (currency.search(`/`) === -1) {
      // Nexo API
      if (window.USE_NEXO_API) {
        currency =
          `<img style="width: 16px; height: 16px" src="https://static.nexo.io/currencies/${currency}${
            CCurrency.IsFiat(currency) ? `X` : ``
          }.svg" /> ` + currency;
      } else {
        // Third-party API
        currency =
          `<img style="width: 16px; height: 16px" src="https://cryptoicon-api.vercel.app/api/icon/${currency.toLowerCase()}" /> ` +
          currency;
      }
    }

    // Details
    let details = t.GetDetails();
    if (details.substr(0, details.search(` `)) === `approved`) details = `✅ ` + details;
    else if (details.substr(0, details.search(` `)) === `pending`) details = `⚠️ ` + details;
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

    if (type === TransactionType.REFERRALBONUS) type = `🫂 ` + type;

    return [
      t.GetId(),
      type,
      gridjs.html(currency),
      parseFloat(t.GetAmount(true)),
      `$${parseFloat(t.GetUSDEquivalent(true))}`,
      gridjs.html(this.LinkTXsToExplorer(t, details)),
      `$${parseFloat(t.GetOutstandingLoan())}`,
      t.GetDateTime(),
    ];
  }

  /**
   * Force table to be redrawn to adjust to any window size changes while it was hidden
   */
  OnPageTransactionsOpened() {
    this.OnWindowResize();
  }

  /**
   * Force all graphs to be redrawn to adjust to any window size changes while it was hidden
   */
  OnPageOverviewOpened() {
    Plotly.update("ov-graph-portfolio");
    Plotly.update("ov-graph-line1");
    Plotly.update("ov-graph-line2");
    Plotly.update("ov-graph-pie1");
    Plotly.update("ov-graph-pie2");
  }

  /////////////////////////////////////////////////////////////////////////////
  // Coinlist
  /////////////////////////////////////////////////////////////////////////////
  /**
   * Render coinlist
   */
  #RenderCoinlist() {
    this.#m_eCoinlistPortfolio.insertAdjacentHTML(`beforeend`, this.#m_cStatistics.GetCoinlistAsHTML());
    this.#m_eCoinlistEarnedInCoin.insertAdjacentHTML(`beforeend`, this.#m_cStatistics.GetCoinlistEarnedInKindAsHTML());
    this.#m_eCoinlistCashback.insertAdjacentHTML(`beforeend`, this.#m_cStatistics.GetCoinlistCashbackEarnedAsHTML());
  }

  /////////////////////////////////////////////////////////////////////////////
  // Overview
  /////////////////////////////////////////////////////////////////////////////
  /**
   * Render overview
   */
  #RenderOverview() {
    let html = `              
    <div class="pure-u-1-2 pure-u-lg-1-8 overview-element">
    <h2>${this.#m_cStatistics.GetCurrentDepotValueInUSD().toFixed(2)}$</h2>
    <p>💰 Depot value</p>
  </div>
  <div class="pure-u-1-2 pure-u-lg-1-8 overview-element">
    <h2>${this.#m_arrTransaction.length + 1}</h2>
    <p>🔂 Transactions</p>
  </div>
  <div class="pure-u-1-2 pure-u-lg-1-8 overview-element">
    <h2> ${this.#m_cStatistics.GetTotalInterestEarnedAsUSD().toFixed(2)}$</h2>
    <p>💸 Interest earned</p>
  </div>
  <div class="pure-u-1-2 pure-u-lg-1-8 overview-element" style="opacity: 0.5">
    <h2>0$</h2> <!-- Not yet implemented. -->
    <p>🙇‍♂️ Outstanding loans</p>
  </div>
  <div class="pure-u-1-2 pure-u-lg-1-8 overview-element">
    <h2>${this.#m_cStatistics.GetLoyalityLevel()}</h2>
    <p>Membership level</p>
  </div>`;

    this.#m_eOverview.insertAdjacentHTML(`afterbegin`, html);

    // Draw charts
    this.#m_cStatistics.DrawPieCharts();
    this.#m_cStatistics.DrawLineCharts(this.#m_arrTransaction);
  }

  /////////////////////////////////////////////////////////////////////////////
  // Etc
  /////////////////////////////////////////////////////////////////////////////
  /**
   * Start header background animation particle system
   */
  #StartParticleSystem() {
    tsParticles
      .loadJSON("tsparticles", "/js/psHeader.json")
      .then((container) => {
        //console.log("callback - tsparticles config loaded");
      })
      .catch((error) => {
        console.error(error);
      });
  }

  /**
   * Stop and destroys unused particle systems to free resources
   */
  #FreeParticleSystems() {
    let particles = tsParticles.domItem(0);
    particles.stop();
    particles.destroy();

    particles = tsParticles.domItem(1);
    particles.stop();
    particles.destroy();
  }

  #StartLoadingAnimation() {
    tsParticles
      .loadJSON("loader", "/js/psHeader.json")
      .then((container) => {
        //console.log("callback - tsparticles config loaded");
      })
      .catch((error) => {
        console.error(error);
      });
  }

  /**
   * Hyperlinks a blockchain tx to it's explorer website
   * @param {*} t Transaction
   * @param {*} details Details string
   * @returns Details with linked tx if successful otherwise will return passed details
   */
  LinkTXsToExplorer(t, details) {
    let detailshtml = details;

    if (t.GetType() != TransactionType.DEPOSIT) return detailshtml;

    const tx = details.substr(details.search(`/`) + 1, details.length).trim();
    let exp = null;

    if (!this.#m_cStatistics.GetCCurrency(t.GetCurrency())) return details;

    // Detect currency
    if (this.#m_cStatistics.GetCCurrency(t.GetCurrency()).IsERC20Token()) {
      //ERC20
      exp = `https://etherscan.io/tx/`;
    } else {
      switch (t.GetCurrency()) {
        case CurrencyType.BTC:
          {
            exp = `https://www.blockchain.com/btc/tx/`;
          }
          break;
        case CurrencyType.XRP:
          {
            exp = `https://xrpscan.com/tx/`;
          }
          break;
        case CurrencyType.DOGE:
          {
            exp = `https://blockchair.com/dogecoin/transaction/`;
          }
          break;
        case CurrencyType.BCH:
          {
            exp = `https://blockchair.com/bitcoin-cash/transaction/`;
          }
          break;
        case CurrencyType.LTC:
          {
            exp = `https://blockchair.com/litecoin/transaction/`;
          }
          break;
        case CurrencyType.EOS:
          {
            exp = `https://bloks.io/transaction/`;
          }
          break;
        case CurrencyType.BNB:
          {
            exp = `https://binance.mintscan.io/txs/`;
          }
          break;
        case CurrencyType.XLM:
          {
            exp = `https://stellarchain.io/tx/`;
          }
          break;
        case CurrencyType.TRX:
          {
            exp = `https://tronscan.org/#/transaction/`;
          }
          break;
        case CurrencyType.ADA:
          {
            exp = `https://explorer.cardano.org/de/transaction?id=`;
          }
          break;
        case CurrencyType.DOT:
          {
            exp = `https://polkascan.io/polkadot/transaction/`;
          }
          break;
        case CurrencyType.MATIC:
          {
            exp = `https://polygonscan.com/tx/`;
          }
          break;
        default:
          {
            // not implemented
            return details;
          }
          break;
      }
    }

    detailshtml =
      details.substr(0, details.search(`/`) + 2) + `<a href="${exp}${tx}" target="_blank" rel="noopener noreferrer">${tx}</a>`;

    return detailshtml;
  }
}

// Let's go =)
let app = new CApp();
