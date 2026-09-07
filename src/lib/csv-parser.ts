import { parse } from "papaparse";
import type { Transaction } from "../types";
import { TransactionType } from "../data/transaction-types";

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

function fixFiatX(cur: string): string {
  if (cur === "EURX") return "EUR";
  if (cur === "GBPX") return "GBP";
  if (cur === "USDX") return "USD";
  return cur;
}

/**
 * Parse a Nexo CSV export into an array of Transaction objects.
 * Handles EURX/GBPX/USDX normalization, repayment sign flip, and liquidation output fix.
 */
export function parseCSV(content: string): Transaction[] {
  const result = parse<NexoHeaders>(content, {
    header: true,
    transformHeader: (h) => h.trim(),
  });
  const fields = result.meta.fields ?? [];
  const missing = REQUIRED_COLUMNS.filter((c) => !fields.includes(c));
  if (missing.length > 0) {
    throw new Error(
      `CSV is missing required column(s): ${missing.join(", ")}`
    );
  }

  const allData = result.data;
  const transactions: Transaction[] = [];

  for (const row of allData) {
    // Empty transaction ID means end of data
    if (!row.Transaction) break;

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

    transactions.push({
      id: row.Transaction,
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
    });
  }

  return transactions;
}
