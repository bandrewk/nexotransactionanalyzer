import HeadingPrimary from "../../UI/Text/HeadingPrimary";
import classes from "./index.module.css";
import CoinlistItem from "./CoinlistItem";
import { useAppSelector } from "../../../hooks";

const Coinlist = () => {
  const currencies = useAppSelector((state) => state.currencies);

  return (
    <>
      <HeadingPrimary text="Coinlist" />
      <p>Your portfolio at a glance!</p>
      <br />

      <div className={classes["coinlist-container"]}>
        {currencies.map((cur) => {
          return (
            <CoinlistItem
              symbol={cur.symbol}
              amount={cur.amount}
              key={Math.random()}
              supported={cur.supported}
            />
          );
        })}
      </div>
    </>
  );
};

export default Coinlist;
