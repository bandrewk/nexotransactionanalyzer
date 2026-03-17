import { BatteryWarning } from "phosphor-react";
import classes from "./CoinlistItem.module.css";
import { useState } from "react";

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
  const [imgError, setImgError] = useState(false);

  return (
    <div className={classes["coinlist-item"]}>
      {!supported && (
        <BatteryWarning size={32} className={classes["coinlist-warning"]} />
      )}
      <div className={classes["coinlist-content"]}>
        {!imgError ? (
          <img
            src={`https://static.nexo-ta.com/currencies/${
              supported ? symbol.toLocaleLowerCase() : "generic"
            }.svg`}
            alt={`${symbol} Icon`}
            onError={() => setImgError(true)}
          />
        ) : (
          <svg
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
            style={{ height: "65%" }}
          >
            <circle cx="16" cy="16" r="16" fill="#6366f1" />
            <text
              x="16"
              y="16"
              textAnchor="middle"
              dominantBaseline="central"
              fill="#fff"
              fontWeight="700"
              fontSize={symbol.length > 4 ? "7" : symbol.length > 3 ? "8" : "10"}
              fontFamily="sans-serif"
            >
              {symbol}
            </text>
          </svg>
        )}
        <div>
          <h2>{symbol.toUpperCase()}</h2>
          <p className={classes["coinlist-content-amount"]}>
            {(Math.abs(amount) < 0.00000001 ? 0 : amount).toFixed(8)}
          </p>
          {supported && (
            <p className={classes["coinlist-content-usd"]}>
              {(isNaN(usdEquivalent) || Math.abs(usdEquivalent) < 0.01
                ? 0
                : usdEquivalent
              ).toFixed(2)}{" "}
              $
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoinlistItem;
