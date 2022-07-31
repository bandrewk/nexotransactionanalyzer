import HeadingPrimary from "../UI/Text/HeadingPrimary";
import classes from "./Transactions.module.css";
import { Grid, UserConfig } from "gridjs";
import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useAppSelector } from "../../hooks";

import "gridjs/dist/theme/mermaid.min.css";

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
        "Details",
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
                  x.details.slice(1, -1), // Remove quotation marks
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
