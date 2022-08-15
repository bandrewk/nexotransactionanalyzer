import HeadingPrimary from "../../UI/Text/HeadingPrimary";
import classes from "./index.module.css";
import CoinlistItem from "./CoinlistItem";
import { useAppSelector } from "../../../hooks";
import { useState } from "react";
import { BatteryWarning } from "phosphor-react";

const Coinlist = () => {
  const currencies = useAppSelector((state) => state.currencies);

  const [hideSmallBalances, setHideSmallBalances] = useState(true);

  return (
    <>
      <HeadingPrimary text="Coinlist" />
      <p>Your portfolio at a glance!</p>
      <br />
      <div className={classes.settings}>
        <label className={classes.inputLabel}>
          <input
            type="checkbox"
            checked={hideSmallBalances}
            onChange={setHideSmallBalances.bind(null, !hideSmallBalances)}
          />
          Hide small balances
        </label>
      </div>
      <div className={classes["coinlist-container"]}>
        {currencies.map((cur) => {
          if (hideSmallBalances) {
            if (cur.amount >= 0 && cur.amount < 0.1) return;
            if (cur.amount < 0 && cur.amount > -0.1) return;
          }
          return (
            <CoinlistItem
              symbol={cur.symbol}
              amount={cur.amount}
              key={Math.random()}
              supported={cur.supported}
              usdEquivalent={cur.usdEquivalent}
            />
          );
        })}
      </div>
      <br />
      <br />
      <div className={classes.inputLabel}>
        <BatteryWarning size={24} color={"red"} />= Not supported
      </div>
    </>
  );
};

export default Coinlist;
