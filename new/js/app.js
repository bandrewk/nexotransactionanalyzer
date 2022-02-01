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

/**
 * Application module
 */
class CApp {
  // Page elements
  #m_eDropZone;
  #m_btnRawData;
  #m_eOverview;

  // Coinlist
  #m_eCoinlistEarnedInCoin;
  #m_eCoinlistPortfolio;

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

    //localStorage.removeItem("info-csv");
    if (!localStorage.getItem("info-csv")) {
      Swal.fire({
        icon: "info",
        title: "Nexo.io CSV export",
        text: `Nexo's export functionality is currently not working as intended. Older exported transactions (before 12/21) will work though.`,
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

    this.#m_eDropZone = document.querySelector(".home-dropzone");

    if (this.#m_eDropZone) {
      this.#m_eDropZone.addEventListener("drop", this.DropHandler.bind(this));
      this.#m_eDropZone.addEventListener("dragover", this.DragOver);
    } else bFailed = true;

    this.#m_btnRawData = document.querySelector("#btnRawData");
    this.#m_btnRawData.addEventListener("click", this.OnBtnRawDataClicked.bind(this));
    if (!this.#m_btnRawData) bFailed = true;

    this.#m_eCoinlistEarnedInCoin = document.querySelector("#coinlist-earnedInCoin");
    this.#m_eCoinlistPortfolio = document.querySelector("#coinlist-portfolio");
    if (!(this.#m_eCoinlistEarnedInCoin && this.#m_eCoinlistPortfolio)) bFailed = true;

    this.#m_eOverview = document.querySelector("#overview");
    if (!this.#m_eOverview) bFailed = true;

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

    // Go through data line by line
    for (let i = 1; i < arr.length; i++) {
      let data = arr[i].split(",");
      let obj = {};
      for (let j = 0; j < data.length; j++) {
        obj[headers[j].trim()] = data[j].trim();
      }

      console.log(obj);
      //
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

    // Render table pretty
    this.RenderTransaction();

    // By default, the pretty table is rendered
    this.#m_bRawTableActive = false;

    // Count statistics
    this.#m_arrTransaction.map((t) => arr.push(this.#m_cStatistics.AddTransaction(t)));

    this.#m_cStatistics.GetCurrentExchangeRates(this.ReceiveCurrentExchangeRates.bind(this));

    // Navigate
    this.#m_cNavigator.ShowPage(Page.OVERVIEW);

    // Register callbacks on navigator module
    this.#m_cNavigator.AddPageChangedCallback(Page.TRANSACTIONS, this.OnPageTransactionsOpened.bind(this));
    this.#m_cNavigator.AddPageChangedCallback(Page.OVERVIEW, this.OnPageOverviewOpened.bind(this));

    // Show menu
    //this.#m_eHeaderMenu.classList.remove("hidden");
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
   * Exchanges rates have arrived, display them.
   */
  ReceiveCurrentExchangeRates() {
    this.#RenderCoinlist();
    this.#RenderOverview();
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
  RenderTransaction(bRaw = false) {
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
    this.RenderTransaction(this.#m_bRawTableActive);
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
      currency =
        `<img style="width: 16px; height: 16px" src="https://cryptoicon-api.vercel.app/api/icon/${currency.toLowerCase()}" /> ` +
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

    // This is prone to XSS attacks
    return [
      t.GetId(),
      type,
      gridjs.html(currency),
      t.GetAmount(true),
      `$${t.GetUSDEquivalent(true)}`,
      gridjs.html(this.LinkTXsToExplorer(t, details)),
      t.GetOutstandingLoan(),
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

  /**
   * Hyperlinks a blockchain tx to it's explorer website
   * @param {*} t Transaction
   * @param {*} details Details string
   * @returns Details with linked tx
   */
  LinkTXsToExplorer(t, details) {
    let detailshtml = details;

    // ERC-20
    if ((t.GetCurrency() === `ETH` || t.GetCurrency() === `LINK`) && t.GetType() === TransactionType.DEPOSIT) {
      let tx = details.substr(details.search(`/`) + 1, details.length).trim();
      detailshtml = details.substr(0, details.search(`/`) + 2) + `<a href="https://etherscan.io/tx/` + tx + `">` + tx + `</a>`;
    }

    // BTC
    if (t.GetCurrency() === `BTC` && t.GetType() === TransactionType.DEPOSIT) {
      let tx = details.substr(details.search(`/`) + 1, details.length).trim();
      detailshtml =
        details.substr(0, details.search(`/`) + 2) + `<a href="https://www.blockchain.com/btc/tx/` + tx + `">` + tx + `</a>`;
    }

    // XRP
    if (t.GetCurrency() === `XRP` && t.GetType() === TransactionType.DEPOSIT) {
      let tx = details.substr(details.search(`/`) + 1, details.length).trim();
      detailshtml = details.substr(0, details.search(`/`) + 2) + `<a href="https://xrpscan.com/tx/` + tx + `">` + tx + `</a>`;
    }
    return detailshtml;
  }
}

// Let's go =)
let app = new CApp();
