import HeadingPrimary from "../../UI/Text/HeadingPrimary";
import classes from "./index.module.css";
import CoinlistItem from "./CoinlistItem";

const Coinlist = () => {
  return (
    <>
      <HeadingPrimary text="Coinlist" />
      <p>Your portfolio at a glance!</p>
      <br />
      <div className={classes["coinlist-container"]}>
        <CoinlistItem currency="ETH" amount={23.3123} />
        <CoinlistItem currency="RVN" amount={23.3123} />
        <CoinlistItem currency="BTC" amount={23.3123} />
        <CoinlistItem currency="LINK" amount={23.3123} />
        <CoinlistItem currency="ETC" amount={23.3123} />
        <CoinlistItem currency="EUR" amount={23.3123} />
        <CoinlistItem currency="USD" amount={23.3123} />
        <CoinlistItem currency="GBP" amount={23.3123} />
      </div>
    </>
  );
};

export default Coinlist;
