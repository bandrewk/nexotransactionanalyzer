import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { parseCSV, parseCSVWithSummary, isNonStrictNumericCell } from "./csv-parser";
import { TransactionType } from "../data/transaction-types";

const demoCSV = readFileSync(
  resolve(__dirname, "../../public/nexo_demo_transactions.csv"),
  "utf-8"
);

describe("parseCSV", () => {
  it("parses the demo CSV without errors", () => {
    const transactions = parseCSV(demoCSV);
    expect(transactions.length).toBeGreaterThan(100);
  });

  it("parses correct number of transactions", () => {
    const transactions = parseCSV(demoCSV);
    // Demo CSV has ~3400 transactions
    expect(transactions.length).toBeGreaterThan(3000);
  });

  it("parses transaction fields correctly", () => {
    const transactions = parseCSV(demoCSV);
    const first = transactions[0];
    expect(first.id).toMatch(/^NXT/);
    expect(first.type).toBeTruthy();
    expect(first.inputCurrency).toBeTruthy();
    expect(typeof first.inputAmount).toBe("number");
    expect(typeof first.usdEquivalent).toBe("number");
    expect(first.dateTime).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it("normalizes EURX to EUR", () => {
    const csv = `Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC),normalizedDisplayDetails
NXT123,Interest,EURX,10.00000000,EURX,10.00000000,$11.00,-,-,approved / EUR Interest,2025-06-01 06:00:00,approved / EUR Interest
`;
    const transactions = parseCSV(csv);
    expect(transactions[0].inputCurrency).toBe("EUR");
    expect(transactions[0].outputCurrency).toBe("EUR");
  });

  it("normalizes GBPX to GBP", () => {
    const csv = `Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC),normalizedDisplayDetails
NXT456,Deposit,GBPX,100.00000000,GBPX,100.00000000,$125.00,-,-,approved / GBP deposit,2025-06-01 06:00:00,approved / GBP deposit
`;
    const transactions = parseCSV(csv);
    expect(transactions[0].inputCurrency).toBe("GBP");
  });

  it("flips repayment amounts from positive to negative", () => {
    const csv = `Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC),normalizedDisplayDetails
NXT789,Manual Repayment,USD,500.00000000,USD,0.00000000,$500.00,-,-,approved / Fiat Repayment,2025-06-01 06:00:00,approved / Fiat Repayment
`;
    const transactions = parseCSV(csv);
    expect(transactions[0].inputAmount).toBe(-500);
  });

  it("fixes liquidation output to USD", () => {
    const csv = `Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC),normalizedDisplayDetails
NXTabc,Liquidation,BTC,-0.01000000,BTC,0.01000000,$800.00,-,-,approved / Liquidation,2025-06-01 06:00:00,approved / Liquidation
`;
    const transactions = parseCSV(csv);
    expect(transactions[0].outputCurrency).toBe("USD");
    expect(transactions[0].outputAmount).toBe(800);
  });

  it("rejects CSV whose headers do not include required columns", () => {
    const csv = "A,B,C\n1,2,3\n";
    expect(() => parseCSV(csv)).toThrow(/missing required column/i);
  });

  it("skips empty lines", () => {
    const csv = `Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC),normalizedDisplayDetails
NXT111,Interest,BTC,0.00010000,BTC,0.00010000,$8.00,-,-,approved / BTC Interest,2025-06-01 06:00:00,approved / BTC Interest

`;
    const transactions = parseCSV(csv);
    expect(transactions).toHaveLength(1);
  });

  it("throws on empty file", () => {
    expect(() => parseCSV("")).toThrow();
  });

  it("throws on header-only file", () => {
    const csv = "Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC),normalizedDisplayDetails\n";
    const transactions = parseCSV(csv);
    expect(transactions).toHaveLength(0);
  });

  it("normalizes USDX to USD", () => {
    const csv = `Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC),normalizedDisplayDetails
NXT999,Interest,USDX,50.00000000,USDX,50.00000000,$50.00,-,-,approved / USD Interest,2025-06-01 06:00:00,approved / USD Interest
`;
    const transactions = parseCSV(csv);
    expect(transactions[0].inputCurrency).toBe("USD");
    expect(transactions[0].outputCurrency).toBe("USD");
  });

  it("does not flip already-negative repayment amounts", () => {
    const csv = `Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC),normalizedDisplayDetails
NXT789,Manual Repayment,USD,-500.00000000,USD,0.00000000,$500.00,-,-,approved / Fiat Repayment,2025-06-01 06:00:00,approved / Fiat Repayment
`;
    const transactions = parseCSV(csv);
    expect(transactions[0].inputAmount).toBe(-500);
  });

  it("parses USD equivalent correctly (strips dollar sign)", () => {
    const csv = `Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC),normalizedDisplayDetails
NXT111,Interest,BTC,0.00010000,BTC,0.00010000,$8.50,-,-,approved / BTC Interest,2025-06-01 06:00:00,approved / BTC Interest
`;
    const transactions = parseCSV(csv);
    expect(transactions[0].usdEquivalent).toBe(8.5);
  });

  it("parses fee fields correctly", () => {
    const csv = `Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC),normalizedDisplayDetails
NXT111,Exchange,BTC,-0.01000000,ETH,0.30000000,$800.00,0.00010000,BTC,approved / Exchange BTC to ETH,2025-06-01 06:00:00,approved / Exchange BTC to ETH
`;
    const transactions = parseCSV(csv);
    expect(transactions[0].fee).toBe("0.00010000");
    expect(transactions[0].feeCurrency).toBe("BTC");
  });

  it("parses multiple rows correctly", () => {
    const csv = `Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC),normalizedDisplayDetails
NXT001,Interest,BTC,0.00010000,BTC,0.00010000,$8.00,-,-,approved / BTC Interest,2025-06-01 06:00:00,approved / BTC Interest
NXT002,Interest,ETH,0.00500000,ETH,0.00500000,$15.00,-,-,approved / ETH Interest,2025-06-01 06:00:00,approved / ETH Interest
NXT003,Withdrawal,SOL,-1.00000000,SOL,1.00000000,$140.00,-,-,approved / SOL withdrawal,2025-06-01 06:00:00,approved / SOL withdrawal
`;
    const transactions = parseCSV(csv);
    expect(transactions).toHaveLength(3);
    expect(transactions[0].type).toBe("Interest");
    expect(transactions[1].inputCurrency).toBe("ETH");
    expect(transactions[2].type).toBe("Withdrawal");
    expect(transactions[2].inputAmount).toBe(-1);
  });

  it("handles all 27 transaction types from demo CSV", () => {
    const transactions = parseCSV(demoCSV);
    const types = new Set(transactions.map((t) => t.type));
    // The demo should have at least these core types
    expect(types.has("Interest")).toBe(true);
    expect(types.has("Exchange")).toBe(true);
    expect(types.has("Top up Crypto")).toBe(true);
    expect(types.has("Withdrawal")).toBe(true);
    expect(types.has("Locking Term Deposit")).toBe(true);
    expect(types.has("Unlocking Term Deposit")).toBe(true);
    expect(types.has("Fixed Term Interest")).toBe(true);
    expect(types.has("Deposit To Exchange")).toBe(true);
    expect(types.has("Nexo Card Purchase")).toBe(true);
    expect(types.has("Cashback")).toBe(true);
    expect(types.has("Manual Repayment")).toBe(true);
    expect(types.has("Liquidation")).toBe(true);
    expect(types.has("Referral Bonus")).toBe(true);
    expect(types.has("Dividend")).toBe(true);
  });

  it("demo CSV has no NaN values in parsed amounts", () => {
    const transactions = parseCSV(demoCSV);
    for (const t of transactions) {
      expect(isNaN(t.inputAmount)).toBe(false);
      expect(isNaN(t.outputAmount)).toBe(false);
      expect(isNaN(t.usdEquivalent)).toBe(false);
    }
  });

  it("demo CSV dates are all valid format", () => {
    const transactions = parseCSV(demoCSV);
    const dateRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
    for (const t of transactions) {
      expect(t.dateTime).toMatch(dateRegex);
    }
  });


  it("parses detail fields with `,` as a value correctly; and not as a new column", () => {
    const csv = `Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC),normalizedDisplayDetails
NXT111,Nexo Card Purchase,BTC,-0.01000000,ETH,0.30000000,$800.00,0.00010000,BTC,"approved / lidl, berlin",2025-06-01 06:00:00,approved / Exchange BTC to ETH
`;
    const expectedValue = "approved / lidl, berlin";
    const transactions = parseCSV(csv);
    expect(transactions[0].details).toBe(expectedValue);
  });

  it("continues processing past empty lines rather than stopping at sentinel", () => {
    const csv = `Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC),normalizedDisplayDetails
NXT001,Interest,BTC,0.00010000,BTC,0.00010000,$8.00,-,-,approved / BTC Interest,2025-06-01 06:00:00,approved / BTC Interest
,,,,,,,,,,,
NXT999,Interest,ETH,0.00500000,ETH,0.00500000,$15.00,-,-,approved / ETH Interest,2025-06-02 06:00:00,approved / ETH Interest
`;
    const transactions = parseCSV(csv);
    expect(transactions).toHaveLength(2);
    expect(transactions[0].id).toBe("NXT001");
    expect(transactions[1].id).toBe("NXT999");
  });

  it("throws when a row is missing a required field (no silent swallowing)", () => {
    // Row is missing the USD Equivalent and later columns — substring(1) on
    // undefined would throw. Must propagate, not be swallowed.
    const csv = `Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC),normalizedDisplayDetails
NXT001,Interest,BTC,0.00010000,BTC,0.00010000`;
    expect(() => parseCSV(csv)).toThrow();
  });

  it("parses Nexo's current 11-column schema (no normalizedDisplayDetails)", () => {
    const csv = `Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC)
NXT001,Interest,BTC,0.00010000,BTC,0.00010000,$8.00,-,-,approved / BTC Interest,2025-06-01 06:00:00
`;
    const transactions = parseCSV(csv);
    expect(transactions).toHaveLength(1);
    expect(transactions[0].id).toBe("NXT001");
    expect(transactions[0].usdEquivalent).toBe(8);
  });

  it("accepts whitespace-padded header names (Excel round-trip)", () => {
    const csv = ` Transaction , Type , Input Currency , Input Amount , Output Currency , Output Amount , USD Equivalent , Fee , Fee Currency , Details , Date / Time (UTC)
NXT001,Interest,BTC,0.00010000,BTC,0.00010000,$8.00,-,-,approved / BTC Interest,2025-06-01 06:00:00
`;
    const transactions = parseCSV(csv);
    expect(transactions).toHaveLength(1);
    expect(transactions[0].id).toBe("NXT001");
  });

  it("accepts CSV with extra unknown columns beyond the required 11", () => {
    const csv = `Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC),FutureColumn
NXT001,Interest,BTC,0.00010000,BTC,0.00010000,$8.00,-,-,approved / BTC Interest,2025-06-01 06:00:00,ignored
`;
    const transactions = parseCSV(csv);
    expect(transactions).toHaveLength(1);
    expect(transactions[0].id).toBe("NXT001");
  });
});

describe("Nexo export schema regression", () => {
  const HEADER =
    "Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount," +
    "USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC)";

  /** Build a synthetic row. All values are invented. */
  const row = (id: string, type: string, cur = "BTC", amount = "1.00000000", usd = "$100.00") =>
    `${id},${type},${cur},${amount},${cur},${amount},${usd},-,-,"approved / synthetic",2024-01-01 00:00:00`;

  it("accepts the current 11-column schema", () => {
    const csv = `${HEADER}\n${row("NXT0000001", "Interest")}\n`;
    const transactions = parseCSV(csv);
    expect(transactions).toHaveLength(1);
    expect(transactions[0].type).toBe("Interest");
    expect(transactions[0].usdEquivalent).toBe(100);
  });

  it("parses an 11-column fixture without a Credit Line column (account without credit line)", () => {
    const ELEVEN_COL_HEADER =
      "Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC)";
    const csv =
      `${ELEVEN_COL_HEADER}\n` +
      `NXT100,Top up Crypto,BTC,0.50000000,BTC,0.50000000,$30000.00,-,-,"approved / deposit",2026-08-20 12:00:00\n` +
      `NXT101,Interest,BTC,0.00010000,BTC,0.00010000,$6.00,-,-,"approved / BTC Interest",2026-08-21 06:00:00\n` +
      `NXT102,Withdrawal,BTC,-0.10000000,BTC,0.10000000,$6000.00,-,-,"approved / withdrawal",2026-08-22 18:00:00\n`;
    const txs = parseCSV(csv);
    expect(txs).toHaveLength(3);
    expect(txs[0].type).toBe("Top up Crypto");
    expect(txs[1].type).toBe("Interest");
    expect(txs[2].type).toBe("Withdrawal");
    expect(txs[0].inputAmount).toBe(0.5);
    expect(txs[1].inputAmount).toBe(0.0001);
    expect(txs[2].inputAmount).toBe(-0.1);
    expect(txs[0].outputCurrency).toBe("BTC");
    expect(txs[1].usdEquivalent).toBe(6.00);
    expect(txs[0].creditLine).toBeUndefined();
    expect(txs[1].creditLine).toBeUndefined();
    expect(txs[2].creditLine).toBeUndefined();
  });

  it("populates creditLine on 12-column exports and leaves it undefined on 11-column exports", () => {
    const ELEVEN_COL_HEADER =
      "Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC)";
    const TWELVE_COL_HEADER =
      "Transaction,Type,Credit Line,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC)";

    const csv11 = `${ELEVEN_COL_HEADER}\nNXT1,Interest,BTC,0.001,BTC,0.001,$5.00,-,-,"approved / test",2026-08-22 00:00:00\n`;
    const csv12 = `${TWELVE_COL_HEADER}\nNXT2,Exchange Credit,Card,xUSD,-14.07,EURX,12.00,$14.07,-,-,"authorized / test",2026-08-22 00:00:00\n`;

    const txs11 = parseCSV(csv11);
    const txs12 = parseCSV(csv12);

    expect(txs11[0].creditLine).toBeUndefined();
    expect(txs12[0].creditLine).toBe("Card");
  });

  it("parses every transaction type the app knows about", () => {
    const types = Object.values(TransactionType);
    const rows = types.map((t, i) => row(`NXT${String(i).padStart(7, "0")}`, t));
    const csv = `${HEADER}\n${rows.join("\n")}\n`;

    const transactions = parseCSV(csv);

    expect(transactions).toHaveLength(types.length);
    for (const t of transactions) {
      expect(Number.isNaN(t.usdEquivalent)).toBe(false);
      expect(Number.isNaN(t.inputAmount)).toBe(false);
      expect(Number.isNaN(t.outputAmount)).toBe(false);
      expect(t.dateTime).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    }
    expect(new Set(transactions.map((t) => t.type))).toEqual(new Set(types));
  });

  it("rejects a file that is missing a required column", () => {
    const truncated = HEADER.replace(",Fee Currency", "");
    const csv = `${truncated}\nNXT0000001,Interest,BTC,1.0,BTC,1.0,$100.00,-,"approved / synthetic",2024-01-01 00:00:00\n`;
    expect(() => parseCSV(csv)).toThrow(/missing required column/i);
  });

  it("flips the sign on manual repayments", () => {
    const csv = `${HEADER}\n${row("NXT0000001", TransactionType.REPAYMENT, "USDT", "50.00000000", "$50.00")}\n`;
    const transactions = parseCSV(csv);
    expect(transactions[0].inputAmount).toBe(-50);
  });

  it("rewrites liquidation output to the USD equivalent", () => {
    const csv = `${HEADER}\n${row("NXT0000001", TransactionType.LIQUIDATION, "BTC", "0.50000000", "$250.00")}\n`;
    const transactions = parseCSV(csv);
    expect(transactions[0].outputCurrency).toBe("USD");
    expect(transactions[0].outputAmount).toBe(250);
  });

  it("does not stop at empty lines, parsing all valid rows", () => {
    const csv = `${HEADER}\n${row("NXT0000001", "Interest")}\n,,,,,,,,,,\n${row("NXT0000002", "Interest")}\n`;
    expect(parseCSV(csv)).toHaveLength(2);
  });
});

describe("BUG 1: blank Transaction ID handling", () => {
  const HEADER =
    "Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount," +
    "USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC)";

  it("blank id mid-file: all other rows still parsed and counted", () => {
    const csv =
      `${HEADER}\n` +
      `NXT001,Interest,BTC,0.00010000,BTC,0.00010000,$8.00,-,-,approved / BTC Interest,2025-06-01 06:00:00\n` +
      `,Interest,ETH,0.00500000,ETH,0.00500000,$15.00,-,-,approved / ETH Interest,2025-06-02 06:00:00\n` +
      `NXT003,Interest,SOL,0.02000000,SOL,0.02000000,$3.00,-,-,approved / SOL Interest,2025-06-03 06:00:00\n`;
    const transactions = parseCSV(csv);
    expect(transactions).toHaveLength(2);
    expect(transactions[0].id).toBe("NXT001");
    expect(transactions[1].id).toBe("NXT003");
    expect(transactions.summary.skippedRowCount).toBe(1);
    expect(transactions.summary.skippedBlankIdRowCount).toBe(1);
    expect(transactions.skippedRowCount).toBe(1);
  });

  it("blank id at the end: preserves all prior rows and counts the skipped row", () => {
    const csv =
      `${HEADER}\n` +
      `NXT001,Interest,BTC,0.00010000,BTC,0.00010000,$8.00,-,-,approved / BTC Interest,2025-06-01 06:00:00\n` +
      `,Interest,ETH,0.00500000,ETH,0.00500000,$15.00,-,-,approved / ETH Interest,2025-06-02 06:00:00\n`;
    const transactions = parseCSV(csv);
    expect(transactions).toHaveLength(1);
    expect(transactions[0].id).toBe("NXT001");
    expect(transactions.summary.skippedRowCount).toBe(1);
  });

  it("a fully blank line: ignored and not counted as skipped", () => {
    const csv =
      `${HEADER}\n` +
      `NXT001,Interest,BTC,0.00010000,BTC,0.00010000,$8.00,-,-,approved / BTC Interest,2025-06-01 06:00:00\n` +
      `\n` +
      `NXT002,Interest,BTC,0.00010000,BTC,0.00010000,$8.00,-,-,approved / BTC Interest,2025-06-02 06:00:00\n` +
      `\n`;
    const transactions = parseCSV(csv);
    expect(transactions).toHaveLength(2);
    expect(transactions[0].id).toBe("NXT001");
    expect(transactions[1].id).toBe("NXT002");
    expect(transactions.summary.skippedRowCount).toBe(0);
  });

  it("a fully blank line with commas or spaces: ignored and not counted as skipped", () => {
    const csv =
      `${HEADER}\n` +
      `NXT001,Interest,BTC,0.00010000,BTC,0.00010000,$8.00,-,-,approved / BTC Interest,2025-06-01 06:00:00\n` +
      `,,,,,,,,,,\n` +
      `   \n` +
      `NXT002,Interest,BTC,0.00010000,BTC,0.00010000,$8.00,-,-,approved / BTC Interest,2025-06-02 06:00:00\n`;
    const transactions = parseCSV(csv);
    expect(transactions).toHaveLength(2);
    expect(transactions[0].id).toBe("NXT001");
    expect(transactions[1].id).toBe("NXT002");
    expect(transactions.summary.skippedRowCount).toBe(0);
  });

  it("verified failure scenario: 10-row file with one blank id at row 6 returns 9 transactions", () => {
    const rows: string[] = [];
    for (let i = 1; i <= 10; i++) {
      if (i === 6) {
        rows.push(`,Interest,BTC,0.0001,BTC,0.0001,$8.00,-,-,approved / test,2025-06-0${i} 06:00:00`);
      } else {
        rows.push(`NXT00${i},Interest,BTC,0.0001,BTC,0.0001,$8.00,-,-,approved / test,2025-06-0${i} 06:00:00`);
      }
    }
    const csv = `${HEADER}\n${rows.join("\n")}\n`;
    const transactions = parseCSV(csv);
    expect(transactions).toHaveLength(9);
    expect(transactions.summary.skippedRowCount).toBe(1);
    expect(transactions.map((t) => t.id)).not.toContain("");
  });

  it("parseCSVWithSummary exposes transactions and summary", () => {
    const csv =
      `${HEADER}\n` +
      `NXT001,Interest,BTC,0.0001,BTC,0.0001,$8.00,-,-,approved / test,2025-06-01 06:00:00\n` +
      `,Interest,BTC,0.0001,BTC,0.0001,$8.00,-,-,approved / test,2025-06-02 06:00:00\n`;
    const { transactions, summary } = parseCSVWithSummary(csv);
    expect(transactions).toHaveLength(1);
    expect(summary.skippedRowCount).toBe(1);
  });
});

describe("BUG 3: detect non-strictly parsed numeric cells", () => {
  const HEADER =
    "Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount," +
    "USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC)";

  it("isNonStrictNumericCell correctly flags non-strict values and passes valid ones", () => {
    // Malformed values: counted
    expect(isNonStrictNumericCell("1,234")).toBe(true);
    expect(isNonStrictNumericCell("12 345")).toBe(true);
    expect(isNonStrictNumericCell("abc")).toBe(true);

    // Ignored / valid values: NOT counted
    expect(isNonStrictNumericCell("-")).toBe(false);
    expect(isNonStrictNumericCell("")).toBe(false);
    expect(isNonStrictNumericCell("1.5")).toBe(false);
    expect(isNonStrictNumericCell("-1.5")).toBe(false);
    expect(isNonStrictNumericCell("0.00010000")).toBe(false);

    // USD cells (with optional '$')
    expect(isNonStrictNumericCell("$1,234", true)).toBe(true);
    expect(isNonStrictNumericCell("$1.5", true)).toBe(false);
    expect(isNonStrictNumericCell("$0.00", true)).toBe(false);
    expect(isNonStrictNumericCell("-", true)).toBe(false);
    expect(isNonStrictNumericCell("", true)).toBe(false);
  });

  it("counts '1,234', '12 345', 'abc' and does not count '-', '', '1.5'", () => {
    // 1,234 in Input Amount -> counted (1)
    const csv1 =
      `${HEADER}\n` +
      `NXT001,Interest,BTC,"1,234",BTC,1.0,$10.00,-,-,approved / test,2025-06-01 06:00:00\n`;
    const res1 = parseCSV(csv1);
    expect(res1.summary.nonStrictNumericCount).toBe(1);
    // Parsing is unchanged: parseFloat("1,234") is 1
    expect(res1[0].inputAmount).toBe(1);

    // 12 345 in Output Amount -> counted (1)
    const csv2 =
      `${HEADER}\n` +
      `NXT002,Interest,BTC,1.0,BTC,"12 345",$10.00,-,-,approved / test,2025-06-01 06:00:00\n`;
    const res2 = parseCSV(csv2);
    expect(res2.summary.nonStrictNumericCount).toBe(1);
    expect(res2[0].outputAmount).toBe(12);

    // abc in Fee -> counted (1)
    const csv3 =
      `${HEADER}\n` +
      `NXT003,Interest,BTC,1.0,BTC,1.0,$10.00,abc,BTC,approved / test,2025-06-01 06:00:00\n`;
    const res3 = parseCSV(csv3);
    expect(res3.summary.nonStrictNumericCount).toBe(1);

    // "-", "" and "1.5" are NOT counted
    const csvValid =
      `${HEADER}\n` +
      `NXT004,Interest,BTC,1.5,BTC,1.5,$1.5,-,-,approved / test,2025-06-01 06:00:00\n` +
      `NXT005,Interest,BTC,1.0,BTC,,$0.00,-,-,approved / test,2025-06-02 06:00:00\n`;
    const resValid = parseCSV(csvValid);
    expect(resValid.summary.nonStrictNumericCount).toBe(0);
  });

  it("demo CSV has zero non-strict numeric cells and zero skipped rows", () => {
    const transactions = parseCSV(demoCSV);
    expect(transactions.summary.nonStrictNumericCount).toBe(0);
    expect(transactions.summary.skippedRowCount).toBe(0);
  });
});

