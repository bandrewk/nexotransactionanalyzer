import React from "react";
import classes from "./App.module.css";
import "./App.css";
import { Link } from "react-router-dom";

function App() {
  return (
    <>
      <div className={`${classes["content-area"]} hide-scrollbar`}>
        {/* <!-- Content --> */}
        <div className="content">
          {/* <!-- Heading --> */}
          <header className={classes.header}>
            <h1 className="heading-primary margin-bottom--xl">nexo-ta.com</h1>
            <p className="subheading">
              An analytical tool for the nexo.io lending plattform.
            </p>
          </header>

          {/*<!-- Main content --> */}
          <main className={classes.main}>
            {/* Upload section */}
            <section className="section-upload">
              <p className="subheading">Upload</p>
              <div className={classes["content-upload-area"]}>
                <p>Drop your transactions CSV here</p>
              </div>
              <div className={classes["content-upload-area--btns"]}>
                <button className="btn--primary subheading">Choose file</button>
                <button className="btn--primary subheading">Upload</button>
              </div>
            </section>

            {/* Wallet warning */}

            <section className={classes["section-wallet-warning"]}>
              <p className="subheading">Friendly warning</p>
              <p className={classes["section-wallet-warning--text"]}>
                Do not share your nexo.io login or any wallet details. This app
                only uses the exported transactions .csv file.
              </p>
            </section>

            {/* Features */}

            <section className={classes["features-section"]}>
              <p className="subheading">Features</p>
              <div className={classes["features--lists"]}>
                <ul className={`${classes["features--list"]} card`}>
                  <li className={classes["features-list--item"]}>
                    <i className="ph-check-light"></i>
                    <span>Historic portfolio value graph generation</span>
                  </li>
                  <li className={classes["features-list--item"]}>
                    <i className="ph-check-light"></i>
                    <span>Transaction tracking</span>
                  </li>
                  <li className={classes["features-list--item"]}>
                    <i className="ph-check-light"></i>
                    <span>
                      Transaction linkage to blockchain explorer (TX linkage)
                    </span>
                  </li>
                  <li className={classes["features-list--item"]}>
                    <i className="ph-check-light"></i>
                    <span>Overview and graph generation</span>
                  </li>
                  <li className={classes["features-list--item"]}>
                    <i className="ph-check-light"></i>
                    <span>Open source</span>
                  </li>
                </ul>
                <ul className={`${classes["features--list"]} card`}>
                  <li className={classes["features-list--item"]}>
                    <i className="ph-check-light"></i>
                    <span>Coinlist, including earned in-kind</span>
                  </li>
                  <li className={classes["features-list--item"]}>
                    <i className="ph-check-light"></i>
                    <span>
                      Portfolio value determination using exchange APIs
                    </span>
                  </li>
                  <li className={classes["features-list--item"]}>
                    <i className="ph-check-light"></i>
                    <span>Referral Bonus</span>
                  </li>
                  <li className={classes["features-list--item"]}>
                    <i className="ph-check-light"></i>
                    <span>Pending transactions</span>
                  </li>
                  <li className={classes["features-list--item"]}>
                    <i className="ph-check-light"></i>
                    <span>...and more to come</span>
                  </li>
                </ul>
              </div>
            </section>
          </main>
          <Link to={"/platform"} className="btn--primary subheading">
            SKIP
          </Link>
        </div>
      </div>
    </>
  );
}

export default App;
