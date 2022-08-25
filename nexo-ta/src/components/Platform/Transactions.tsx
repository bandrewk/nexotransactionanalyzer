import HeadingPrimary from "../UI/Text/HeadingPrimary";
import classes from "./Transactions.module.css";
import { Grid, html, UserConfig } from "gridjs";
import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useAppSelector } from "../../hooks";

import "gridjs/dist/theme/mermaid.min.css";
import { TransactionType } from "../../reducers/transactionReducer";

const Transactions = () => {
  const transactions = useAppSelector((state) => state.transactions);

  const wrapperRef = useRef<HTMLDivElement>(null);

  // User settings
  const [hideTransactionId, setHideTransactionId] = useState(true);
  const [hideOutstandingLoan, setHideOutstandingLoan] = useState(true);
  const [hideTransactionTime, setHideTransactionTime] = useState(true);

  const getGridConfig = useCallback(() => {
    return {
      columns: [
        { name: "Id", hidden: hideTransactionId },
        "Type",
        "Input",
        "Input Amount",
        "Output",
        "Output Amount",
        "USD Equiv.",
        {
          name: "Details",

          // Enable HTML formatter for cell (needed for tx linking)
          // We alter the data later on
          formatter(cell, row, column) {
            return html(`${cell?.toString()}`);
          },
        },
        { name: "Outstanding Loan", hidden: hideOutstandingLoan },

        `${hideTransactionTime ? "Date" : "Date / Time"}`,
      ],
      search: true,
      style: {
        // Table
        table: {
          width: "100%",
        },
        // Data cell
        td: {
          padding: "8px 8px",
          "font-size": "1.2rem",
          overflow: "hidden",
          "max-width": "350px", // Stop "details" column from becoming too large, force a line-break instead
          "overflow-wrap": "break-word",
        },
        // Header cell
        th: {
          padding: "8px 8px",
          "font-size": "1.4rem",
          color: "#091741",
        },
      },
      pagination: {
        enabled: true,
        limit: 50,
        summary: true,
      },
      sort: true,
      resizable: true,

      // Depending on the size of data this could get the whole site stuck for n seconds, so run it async
      data: () => {
        return new Promise((resolve) => {
          setTimeout(
            () =>
              resolve(
                transactions.map((x) => [
                  x.id,
                  x.type,
                  x.inputCurrency,
                  x.inputAmount,
                  x.outputCurrency,
                  x.outputAmount,
                  x.usdEquivalent,
                  TXLinkage(x.type, x.inputCurrency, x.details.slice(1, -1)), // Remove quotation marks and tx link
                  x.outstandingLoan,
                  hideTransactionTime ? x.dateTime.slice(0, 10) : x.dateTime, // Remove time?
                ])
              ),
            1000
          );
        });
      },
    } as UserConfig;
  }, [
    hideOutstandingLoan,
    hideTransactionId,
    hideTransactionTime,
    transactions,
  ]);

  const TXLinkage = (type: string, currency: string, details: string) => {
    // For some reason only desposits have an tx id attached..
    if (type !== TransactionType.DEPOSIT) return details;

    // Ethereum / ERC default
    let explorer = "https://etherscan.io/tx/";

    // Alter explorer for everything else
    switch (currency) {
      case "BTC":
        explorer = `https://www.blockchain.com/btc/tx/`;

        break;
      case "XRP":
        explorer = `https://xrpscan.com/tx/`;

        break;
      case "DOGE":
        explorer = `https://blockchair.com/dogecoin/transaction/`;

        break;
      case "BCH":
        explorer = `https://blockchair.com/bitcoin-cash/transaction/`;

        break;
      case "LTC":
        explorer = `https://blockchair.com/litecoin/transaction/`;

        break;
      case "EOS":
        explorer = `https://bloks.io/transaction/`;

        break;
      case "BNB":
        explorer = `https://binance.mintscan.io/txs/`;

        break;
      case "XLM":
        explorer = `https://stellarchain.io/tx/`;

        break;
      case "TRX":
        explorer = `https://tronscan.org/#/transaction/`;

        break;
      case "ADA":
        explorer = `https://explorer.cardano.org/de/transaction?id=`;

        break;
      case "DOT":
        explorer = `https://polkascan.io/polkadot/transaction/`;

        break;
      case "KSM":
        explorer = `https://polkascan.io/kusama/transaction/`;

        break;
      case "MATIC":
        explorer = `https://polygonscan.com/tx/`;

        break;
      case "NEAR":
        explorer = `https://explorer.near.org/transactions/`;

        break;
    }

    const tx = details.substr(details.search(`/`) + 1, details.length).trim();

    const detailshtml =
      details.substr(0, details.search(`/`) + 2) +
      `<a href="${explorer}${tx}" target="_blank" rel="noopener noreferrer">${tx}</a>`;
    return detailshtml;
  };

  const grid = useMemo(() => new Grid(getGridConfig()), [getGridConfig]);

  useEffect(() => {
    if (wrapperRef && wrapperRef.current) {
      // Remove GridJs error that html element is not empty
      wrapperRef.current.innerHTML = "";

      // Render grid
      grid.render(wrapperRef.current);
    } else {
      console.log(`Transactions wrapper for GridJS is null, unable to render!`);
    }
  });

  useEffect(() => {
    grid.updateConfig(getGridConfig()).forceRender();
  }, [getGridConfig, grid]);

  return (
    <>
      <HeadingPrimary text="Transactions" />
      <p>
        Search, sort or just browse through your transactions. Whether you're
        doing taxes or are just lurking, this is the right place for you. A
        click on the column header toggles sorting. Search will look through all
        cell-contents to find the desired data. Some columns are hidden by
        default. You can enable them below.
      </p>
      <br />

      <div className={classes.settings}>
        <p>Hidden Columns:</p>
        <label className={classes.inputLabel}>
          <input
            type="checkbox"
            checked={!hideTransactionId}
            onChange={setHideTransactionId.bind(null, !hideTransactionId)}
          />
          Transaction ID
        </label>

        <label className={classes.inputLabel}>
          <input
            type="checkbox"
            checked={!hideOutstandingLoan}
            onChange={setHideOutstandingLoan.bind(null, !hideOutstandingLoan)}
          />
          Outstanding Loan
        </label>

        <label className={classes.inputLabel}>
          <input
            type="checkbox"
            checked={!hideTransactionTime}
            onChange={setHideTransactionTime.bind(null, !hideTransactionTime)}
          />
          Transaction Time
        </label>
      </div>
      <div ref={wrapperRef} />
    </>
  );
};

export default Transactions;
