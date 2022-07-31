import HeadingPrimary from "../UI/Text/HeadingPrimary";
import classes from "./Coinlist.module.css";

const Coinlist = () => {
  return (
    <>
      <HeadingPrimary text="Coinlist" />
      <p>Your portfolio at a glance!</p>
      <br />
      <div className={classes["coinlist-container"]}>
        <div className={classes["coinlist-item"]}>
          <div className={classes["coinlist-content"]}>
            <img
              src="http://static.nexo-ta.com/currencies/eth.svg"
              alt="ETH Icon"
            />
            <div>
              <h2>ETH</h2>
              <p>4.6566454</p>
            </div>
          </div>
        </div>
        <div className={classes["coinlist-item"]}>
          <div className={classes["coinlist-content"]}>
            <img
              src="http://static.nexo-ta.com/currencies/btc.svg"
              alt="ETH Icon"
            />
            <div>
              <h2>BTC</h2>
              <p>4.6566454</p>
            </div>
          </div>
        </div>
        <div className={classes["coinlist-item"]}>
          <div className={classes["coinlist-content"]}>
            <img
              src="http://static.nexo-ta.com/currencies/link.svg"
              alt="link Icon"
            />
            <div>
              <h2>ETH</h2>
              <p>4.6566454</p>
            </div>
          </div>
        </div>
        <div className={classes["coinlist-item"]}>
          <div className={classes["coinlist-content"]}>
            <img
              src="http://static.nexo-ta.com/currencies/eur.svg"
              alt="EUR Icon"
            />
            <div>
              <h2>EUR</h2>
              <p>4.6566454</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Coinlist;
