const State = {
  HOME: 0,
  OVERVIEW: 1,
  COINLIST: 2,
  TRANSACTIONS: 3,
  EXIT: 4,
};

/**
 * Page navigator module
 */
class Navigator {
  #m_state;
  #m_mButton;
  #m_mPage;

  constructor() {
    this.#ParseDocument();

    this.#m_state = State.EXIT;
    this.ShowPage(State.HOME);
  }

  #ParseDocument() {
    let bFailed = false;

    this.#m_mButton = new Map();
    this.#m_mPage = new Map();

    // Load pages
    this.#m_mPage.set(State.HOME, document.querySelector("#PageHome"));
    this.#m_mPage.set(State.COINLIST, document.querySelector("#PageCoinlist"));
    this.#m_mPage.set(State.OVERVIEW, document.querySelector("#PageOverview"));
    this.#m_mPage.set(
      State.TRANSACTIONS,
      document.querySelector("#PageTransactions")
    );

    this.#m_mPage.forEach((element) => {
      if (!element) bFailed = true;
    });

    // Load buttons
    this.#m_mButton.set(State.HOME, document.querySelector("#btn-home"));
    this.#m_mButton.set(
      State.COINLIST,
      document.querySelector("#btn-coinlist")
    );
    this.#m_mButton.set(
      State.OVERVIEW,
      document.querySelector("#btn-overview")
    );
    this.#m_mButton.set(
      State.TRANSACTIONS,
      document.querySelector("#btn-transactions")
    );

    this.#m_mButton.forEach((element) => {
      if (!element) bFailed = true;
    });

    if (!bFailed) {
      this.#m_mButton.forEach((element) => {
        element.addEventListener("click", this.Clicked.bind(this));
      });
    } else {
      console.log(
        "Failed parsing document: Unable to catch all handles. Please verify that the script is loaded as module and the HTML is intact."
      );
    }
  }

  Clicked(e) {
    console.log(`Pressed ${e.target.id}`);

    switch (e.target.id) {
      case this.#m_mButton.get(State.HOME).id:
        {
          if (this.#m_state === State.HOME) return;
          this.ShowPage(State.HOME);
        }
        break;
      case this.#m_mButton.get(State.COINLIST).id:
        {
          if (this.#m_state === State.COINLIST) return;
          this.ShowPage(State.COINLIST);
        }
        break;
      case this.#m_mButton.get(State.OVERVIEW).id:
        {
          if (this.#m_state === State.OVERVIEW) return;
          this.ShowPage(State.OVERVIEW);
        }
        break;
      case this.#m_mButton.get(State.TRANSACTIONS).id:
        {
          if (this.#m_state === State.TRANSACTIONS) return;
          this.ShowPage(State.TRANSACTIONS);
        }
        break;
    }
  }

  ShowPage(state) {
    this.#m_mButton.forEach((element) => {
      element.parentNode.classList.remove(`pure-menu-selected`);
    });

    this.#m_mPage.forEach((element) => {
      element.classList.add(`hidden`);
    });

    this.#m_mButton.get(state).parentNode.classList.add(`pure-menu-selected`);
    this.#m_mPage.get(state).classList.remove(`hidden`);
  }
}

export { Navigator, State as AppState };
