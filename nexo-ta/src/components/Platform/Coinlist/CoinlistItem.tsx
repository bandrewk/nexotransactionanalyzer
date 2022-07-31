import classes from "./CoinlistItem.module.css";

type CoinlistItemProps = {
  currency: string;
  amount: number;
};

const CoinlistItem = ({ currency, amount }: CoinlistItemProps) => {
  return (
    <div className={classes["coinlist-item"]}>
      <div className={classes["coinlist-content"]}>
        <img
          src={`http://static.nexo-ta.com/currencies/${currency.toLocaleLowerCase()}.svg`}
          alt={`${currency} Icon`}
        />
        <div>
          <h2>{currency.toUpperCase()}</h2>
          <p>{amount}</p>
        </div>
      </div>
    </div>
  );
};

export default CoinlistItem;
