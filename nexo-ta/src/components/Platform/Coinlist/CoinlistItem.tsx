import { BatteryWarning, Warning } from "phosphor-react";
import classes from "./CoinlistItem.module.css";

type CoinlistItemProps = {
  symbol: string;
  amount: number;
  supported: boolean;
};

const CoinlistItem = ({ symbol, amount, supported }: CoinlistItemProps) => {
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
          <p>{amount.toFixed(8)}</p>
        </div>
      </div>
    </div>
  );
};

export default CoinlistItem;
