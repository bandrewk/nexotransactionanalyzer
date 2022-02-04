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
 * Possible application states
 */
export const State = {
  HOME: 0,
  OVERVIEW: 1,
  COINLIST: 2,
  TRANSACTIONS: 3,
  EXIT: 4,
};

/**
 * Page navigator module
 *
 * This class is in control of the page navigation and menu
 */
export class CNavigator {
  #m_state;
  /**
   * Contains menu buttons as DOM elements
   */
  #m_arrButton;

  /**
   * Contains page sections as DOM elements
   */
  #m_arrPage;

  /**
   * Wrapper for all content besides home
   */
  #m_ePageWrap;

  /**
   * Contains registered callbacks for pagechanges
   */
  #m_arrCallback;

  constructor() {
    this.#ParseDocument();

    this.#m_state = State.EXIT;
    this.ShowPage(State.HOME);
  }

  /**
   * Parse document for needed handles
   */
  #ParseDocument() {
    let bFailed = false;

    this.#m_arrButton = new Map();
    this.#m_arrPage = new Map();
    this.#m_arrCallback = new Map();

    // Load pages
    this.#m_arrPage.set(State.HOME, document.querySelector("#PageHome"));
    this.#m_arrPage.set(State.COINLIST, document.querySelector("#PageCoinlist"));
    this.#m_arrPage.set(State.OVERVIEW, document.querySelector("#PageOverview"));
    this.#m_arrPage.set(State.TRANSACTIONS, document.querySelector("#PageTransactions"));

    this.#m_arrPage.forEach((element) => {
      if (!element) bFailed = true;
    });

    // Load buttons
    this.#m_arrButton.set(State.HOME, document.querySelector("#btn-home"));
    this.#m_arrButton.set(State.COINLIST, document.querySelector("#btn-coinlist"));
    this.#m_arrButton.set(State.OVERVIEW, document.querySelector("#btn-overview"));
    this.#m_arrButton.set(State.TRANSACTIONS, document.querySelector("#btn-transactions"));

    this.#m_arrButton.forEach((element) => {
      if (!element) bFailed = true;
    });

    // Page wrap
    this.#m_ePageWrap = document.querySelector("#PageWrap");

    if (!this.#m_ePageWrap) bFailed = true;

    if (!bFailed) {
      this.#m_arrButton.forEach((element) => {
        element.addEventListener("click", this.Clicked.bind(this));
      });
    } else {
      console.log(
        "Failed parsing document: Unable to catch all handles. Please verify that the script is loaded as module and the HTML is intact."
      );
    }
  }

  /**
   * Clicked callback for menu buttons
   * @param {} e event
   */
  Clicked(e) {
    //console.log(`Pressed ${e.target.id}`);

    switch (e.target.id) {
      case this.#m_arrButton.get(State.HOME).id:
        {
          if (this.#m_state === State.HOME) return;
          this.ShowPage(State.HOME);
        }
        break;
      case this.#m_arrButton.get(State.COINLIST).id:
        {
          if (this.#m_state === State.COINLIST) return;
          this.ShowPage(State.COINLIST);
        }
        break;
      case this.#m_arrButton.get(State.OVERVIEW).id:
        {
          if (this.#m_state === State.OVERVIEW) return;
          this.ShowPage(State.OVERVIEW);
        }
        break;
      case this.#m_arrButton.get(State.TRANSACTIONS).id:
        {
          if (this.#m_state === State.TRANSACTIONS) return;
          this.ShowPage(State.TRANSACTIONS);
        }
        break;
    }

    // Fire callback
    if (this.#m_arrCallback.get(this.#m_state)) this.#m_arrCallback.get(this.#m_state)();
  }

  /**
   * Calls the given `callback` when page `state` has been opened
   * @param {*} state State
   * @param {*} callback Callback to call
   */
  AddPageChangedCallback(state, callback) {
    if (this.#m_arrCallback.get(state)) {
      throw new Error(`Callback for ${state} is already registered`);
    } else {
      this.#m_arrCallback.set(state, callback);
    }
  }

  /**
   * Changes the view to another page
   * @param {} state Page to switch to
   */
  ShowPage(state) {
    // Default style all buttons
    this.#m_arrButton.forEach((element) => {
      element.parentNode.classList.remove(`pure-menu-selected`);
    });

    // Hide all pages
    this.#m_arrPage.forEach((element) => {
      element.classList.add(`hidden`);
    });

    // Highlight button and show page
    this.#m_arrButton.get(state).parentNode.classList.add(`pure-menu-selected`);
    this.#m_arrPage.get(state).classList.remove(`hidden`);

    // Hide content wrap in Home
    if (state === State.HOME) {
      this.#m_ePageWrap.classList.add("hidden");
    } else this.#m_ePageWrap.classList.remove("hidden");

    // Register state
    this.#m_state = state;
  }

  /**
   * Shows the full menu
   */
  ShowMenu() {
    this.#m_arrButton.forEach((element) => {
      element.classList.remove(`hidden`);
    });
  }
}
