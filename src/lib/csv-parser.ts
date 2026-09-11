import { parse } from "papaparse";
import type { Transaction } from "../types";
import { TransactionType } from "../data/transaction-types";
import { fixFiatX } from "../data/currencies";

export const REQUIRED_COLUMNS = [
  "Transaction",
  "Type",
  "Input Currency",
  "Input Amount",
  "Output Currency",
  "Output Amount",
  "USD Equivalent",
  "Fee",
  "Fee Currency",
  "Details",
  "Date / Time (UTC)",
] as const;

type NexoHeaders = {
  "Credit Line"?: string;
  "Date / Time (UTC)": string;
  "Details": string;
  "Fee": string;
  "Fee Currency": string;
  "Input Amount": string;
  "Input Currency": string;
  "Output Amount": string;
  "Output Currency": string;
  "Transaction": string;
  "Type": string;
  "USD Equivalent": string;
}

const STRICT_NUMBER_REGEX = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;

/**
 * Checks if a numeric cell does not parse strictly:
 * non-empty, not "-", and whose full text is not a valid number.
 * For currency-prefixed cells like USD Equivalent ("$10.00"), optional leading '$' is stripped first.
 */
export function isNonStrictNumericCell(value: string | undefined | null, isUsd = false): boolean {
  if (value === undefined || value === null) return false;
  let text = value.trim();
  if (isUsd && text.startsWith("$")) {
    text = text.slice(1).trim();
  }
  if (text === "" || text === "-") return false;
  return !STRICT_NUMBER_REGEX.test(text);
}

/**
 * Checks whether a CSV row is entirely blank (all cells empty or whitespace-only).
 */
function isRowEntirelyBlank(row: Record<string, string | undefined>): boolean {
  return Object.values(row).every((val) => val === undefined || val.trim() === "");
}

export type ParseSummary = {
  /** Number of data rows skipped due to missing/blank Transaction ID. */
  skippedRowCount: number;
  /** Alias for skippedRowCount */
  skippedBlankIdRowCount: number;
  /** Number of numeric cells whose full text is not a valid number. */
  nonStrictNumericCount: number;
  /** Alias for nonStrictNumericCount */
  nonStrictNumericCellCount: number;
};

export interface ParsedTransactions extends Array<Transaction> {
  summary: ParseSummary;
  skippedRowCount: number;
  nonStrictNumericCount: number;
}

/**
 * Parse a Nexo CSV export into an array of Transaction objects.
 * Handles EURX/GBPX/USDX normalization, repayment sign flip, and liquidation output fix.
 */
export function parseCSV(content: string): ParsedTransactions {
  const result = parse<NexoHeaders>(content, {
    header: true,
    transformHeader: (h) => h.trim(),
    skipEmptyLines: "greedy",
  });
  const fields = result.meta.fields ?? [];
  const missing = REQUIRED_COLUMNS.filter((c) => !fields.includes(c));
  if (missing.length > 0) {
    throw new Error(
      `CSV is missing required column(s): ${missing.join(", ")}`
    );
  }

  const hasCreditLine = fields.includes("Credit Line");
  const allData = result.data;
  const transactions: Transaction[] = [];
  let skippedRowCount = 0;
  let nonStrictNumericCount = 0;

  for (const row of allData) {
    // Ignore genuinely empty trailing or intermediate lines
    if (isRowEntirelyBlank(row)) continue;

    // Detect numeric cells that do not parse strictly (before any field mutations)
    if (isNonStrictNumericCell(row["Input Amount"])) nonStrictNumericCount++;
    if (isNonStrictNumericCell(row["Output Amount"])) nonStrictNumericCount++;
    if (isNonStrictNumericCell(row["USD Equivalent"], true)) nonStrictNumericCount++;
    if (isNonStrictNumericCell(row["Fee"])) nonStrictNumericCount++;

    // A blank Transaction id skips the row; the rest of the file still parses.
    const txId = row.Transaction?.trim();
    if (!txId) {
      skippedRowCount++;
      continue;
    }

    // Fix repayments: Nexo CSV has positive amounts instead of negative
    if (row.Type === TransactionType.REPAYMENT) {
      const amt = parseFloat(row["Input Amount"]);
      if (amt > 0) {
        row["Input Amount"] = (-amt).toString();
      }
    }

    // Fix liquidations: set output to USD equivalent
    if (row.Type === TransactionType.LIQUIDATION) {
      row["Output Currency"] = "USD";
      row["Output Amount"] = row["USD Equivalent"].substring(1);
    }

    const tx: Transaction = {
      id: txId,
      type: row.Type,
      inputCurrency: fixFiatX(row["Input Currency"]),
      inputAmount: parseFloat(row["Input Amount"]),
      outputCurrency: fixFiatX(row["Output Currency"]),
      outputAmount: parseFloat(row["Output Amount"]),
      usdEquivalent: parseFloat(row["USD Equivalent"].substring(1)),
      fee: row.Fee,
      feeCurrency: row["Fee Currency"],
      details: row.Details,
      dateTime: row["Date / Time (UTC)"],
    };
    if (hasCreditLine) {
      tx.creditLine = row["Credit Line"];
    }

    transactions.push(tx);
  }

  const summary: ParseSummary = {
    skippedRowCount,
    skippedBlankIdRowCount: skippedRowCount,
    nonStrictNumericCount,
    nonStrictNumericCellCount: nonStrictNumericCount,
  };

  return Object.assign(transactions, {
    summary,
    skippedRowCount,
    nonStrictNumericCount,
  });
}

/**
 * Helper to parse CSV and explicitly receive transactions and parse summary.
 */
export function parseCSVWithSummary(content: string): {
  transactions: Transaction[];
  summary: ParseSummary;
} {
  const transactions = parseCSV(content);
  return {
    transactions,
    summary: transactions.summary,
  };
}

