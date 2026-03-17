import HeadingPrimary from "../../UI/Text/HeadingPrimary";
import classes from "./index.module.css";
import CoinlistItem from "./CoinlistItem";
import { useAppSelector } from "../../../hooks";
import { useState } from "react";
import { BatteryWarning } from "phosphor-react";

const DUST_THRESHOLD = 10; // USD

const Coinlist = () => {
  const currencies = useAppSelector((state) => state.currencies);

  const [showZero, setShowZero] = useState(false);

  // Filter out zero-amount currencies unless toggled
  const nonZero = currencies.filter(
    (cur) => showZero || Math.abs(cur.amount) >= 0.001
  );

  // Split into holdings vs dust (negative balances always go to dust)
  const holdings = nonZero.filter(
    (cur) =>
      Math.abs(cur.amount) >= 0.001 &&
      cur.usdEquivalent >= DUST_THRESHOLD
  );

  const dust = nonZero.filter(
    (cur) =>
      Math.abs(cur.amount) >= 0.001 &&
      (cur.usdEquivalent < DUST_THRESHOLD || cur.amount < 0)
  );

  // Zero-amount entries (only shown when toggled)
  const zeros = showZero
    ? currencies.filter((cur) => Math.abs(cur.amount) < 0.001)
    : [];

  return (
    <>
      <HeadingPrimary text="Coinlist" />
      <p>Your portfolio at a glance!</p>
      <br />

      {/* Main holdings */}
      <div className={classes["coinlist-container"]}>
        {holdings.map((cur) => (
          <CoinlistItem
            symbol={cur.symbol}
            amount={cur.amount}
            key={cur.symbol}
            supported={cur.supported}
            usdEquivalent={cur.usdEquivalent}
          />
        ))}
      </div>

      {/* Dust section */}
      {dust.length > 0 && (
        <>
          <br />
          <details className={classes["dust-section"]}>
            <summary className={classes["dust-summary"]}>
              Dust &amp; residual balances ({dust.length})
            </summary>
            <div className={classes["dust-container"]}>
              {dust.map((cur) => (
                <div key={cur.symbol} className={classes["dust-item"]}>
                  {!cur.supported && (
                    <BatteryWarning
                      size={16}
                      className={classes["dust-warning"]}
                    />
                  )}
                  <span className={classes["dust-symbol"]}>
                    {cur.symbol}
                  </span>
                  <span className={classes["dust-amount"]}>
                    {(Math.abs(cur.amount) < 0.00000001 ? 0 : cur.amount).toFixed(
                      8
                    )}
                  </span>
                  {cur.supported && (
                    <span className={classes["dust-usd"]}>
                      {(isNaN(cur.usdEquivalent) ||
                      Math.abs(cur.usdEquivalent) < 0.01
                        ? 0
                        : cur.usdEquivalent
                      ).toFixed(2)}{" "}
                      $
                    </span>
                  )}
                </div>
              ))}
            </div>
          </details>
        </>
      )}

      {/* Zero balances toggle */}
      {zeros.length > 0 && (
        <>
          <br />
          <details className={classes["dust-section"]}>
            <summary className={classes["dust-summary"]}>
              Zero balances ({zeros.length})
            </summary>
            <div className={classes["dust-container"]}>
              {zeros.map((cur) => (
                <div key={cur.symbol} className={classes["dust-item"]}>
                  <span className={classes["dust-symbol"]}>
                    {cur.symbol}
                  </span>
                  <span className={classes["dust-amount"]}>0.00000000</span>
                  <span className={classes["dust-usd"]}>0.00 $</span>
                </div>
              ))}
            </div>
          </details>
        </>
      )}

      <br />
      <div className={classes.settings}>
        <label className={classes.inputLabel}>
          <input
            type="checkbox"
            checked={showZero}
            onChange={() => setShowZero(!showZero)}
          />
          Show zero balances
        </label>
      </div>

      <div className={classes.inputLabel}>
        <BatteryWarning size={24} color={"red"} />= Not supported
      </div>
    </>
  );
};

export default Coinlist;
