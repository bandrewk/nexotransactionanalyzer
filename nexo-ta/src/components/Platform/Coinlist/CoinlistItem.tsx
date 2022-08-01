import classes from "./CoinlistItem.module.css";

type CoinlistItemProps = {
  symbol: string;
  amount: number;
  supported: boolean;
};

const CoinlistItem = ({ symbol, amount, supported }: CoinlistItemProps) => {
  return (
    <div className={classes["coinlist-item"]}>
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
