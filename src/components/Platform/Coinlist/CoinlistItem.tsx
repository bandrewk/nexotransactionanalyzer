import { BatteryWarning } from "phosphor-react";
import classes from "./CoinlistItem.module.css";

type CoinlistItemProps = {
  symbol: string;
  amount: number;
  supported: boolean;
  usdEquivalent: number;
};

const CoinlistItem = ({
  symbol,
  amount,
  supported,
  usdEquivalent,
}: CoinlistItemProps) => {
  return (
    <div className={classes["coinlist-item"]}>
      {!supported && (
        <BatteryWarning size={32} className={classes["coinlist-warning"]} />
      )}
      <div className={classes["coinlist-content"]}>
        <img
          src={`http://static.nexo-ta.com/currencies/${
            supported ? symbol.toLocaleLowerCase() : "generic"
          }.svg`}
          alt={`${symbol} Icon`}
        />
        <div>
          <h2>{symbol.toUpperCase()}</h2>
          <p className={classes["coinlist-content-amount"]}>
            {amount.toFixed(8)}
          </p>
          {supported && (
            <p className={classes["coinlist-content-usd"]}>
              {usdEquivalent.toFixed(2)} $
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoinlistItem;
