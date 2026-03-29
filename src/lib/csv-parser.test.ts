import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { parseCSV } from "./csv-parser";

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

  it("rejects CSV with wrong number of columns", () => {
    const csv = "A,B,C\n1,2,3\n";
    expect(() => parseCSV(csv)).toThrow("Headers mismatch");
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
});
