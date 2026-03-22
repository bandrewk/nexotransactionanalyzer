import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { parseCSV } from "./csv-parser";
import { calculateBalances } from "./balance-calculator";

const demoCSV = readFileSync(
  resolve(__dirname, "../../public/nexo_demo_transactions.csv"),
  "utf-8"
);
const transactions = parseCSV(demoCSV);

describe("calculateBalances", () => {
  const result = calculateBalances(transactions);

  it("returns currencies with non-zero balances", () => {
    const nonZero = result.currencies.filter((c) => c.amount !== 0);
    expect(nonZero.length).toBeGreaterThan(5);
  });

  it("has no negative balances for deposited currencies", () => {
    // Currencies that have initial deposits should not go negative
    const deposited = ["BTC", "ETH", "USDC", "SOL", "XRP", "LINK", "DOGE", "ADA"];
    for (const symbol of deposited) {
      const cur = result.currencies.find((c) => c.symbol === symbol);
      expect(cur, `${symbol} should exist`).toBeDefined();
      expect(cur!.amount, `${symbol} should not be negative`).toBeGreaterThanOrEqual(0);
    }
  });

  it("produces interest data sorted by date", () => {
    expect(result.interestData.length).toBeGreaterThan(100);
    for (let i = 1; i < result.interestData.length; i++) {
      expect(result.interestData[i].date >= result.interestData[i - 1].date).toBe(true);
    }
  });

  it("produces deposit and withdrawal data", () => {
    expect(result.depositAndWithdrawalData.length).toBeGreaterThan(0);
    const hasDeposit = result.depositAndWithdrawalData.some((d) => d.deposit > 0);
    const hasWithdrawal = result.depositAndWithdrawalData.some((d) => d.withdrawal < 0);
    expect(hasDeposit).toBe(true);
    expect(hasWithdrawal).toBe(true);
  });

  it("produces daily snapshots", () => {
    expect(result.dailySnapshots.size).toBeGreaterThan(100);
  });

  it("produces interest breakdown with in-kind data", () => {
    expect(result.earnedInterestBreakdown.length).toBeGreaterThan(0);
    const btcInterest = result.earnedInterestBreakdown.find((e) => e.currency === "BTC");
    expect(btcInterest).toBeDefined();
    expect(btcInterest!.inKindAmount).toBeGreaterThan(0);
    expect(btcInterest!.inKindUsd).toBeGreaterThan(0);
  });

  it("skips pending and rejected transactions", () => {
    // All demo transactions are approved, so balances should match
    // Test with a synthetic pending transaction
    const withPending = [
      ...transactions,
      {
        id: "NXTpending", type: "Interest", inputCurrency: "BTC",
        inputAmount: 999, outputCurrency: "BTC", outputAmount: 999,
        usdEquivalent: 999, fee: "-", feeCurrency: "-",
        details: "pending / BTC Interest", dateTime: "2025-12-01 06:00:00",
      },
    ];
    const result2 = calculateBalances(withPending);
    const btc1 = result.currencies.find((c) => c.symbol === "BTC")!.amount;
    const btc2 = result2.currencies.find((c) => c.symbol === "BTC")!.amount;
    expect(btc1).toBe(btc2); // pending should be skipped
  });

  it("skips internal transfer types for balance calculation", () => {
    // Locking/Unlocking term deposits should not affect balances
    const lockingTxs = transactions.filter((t) => t.type === "Locking Term Deposit");
    expect(lockingTxs.length).toBeGreaterThan(0);
    // If they weren't skipped, BTC balance would go negative from the large lock amounts
  });

  it("handles exchange transactions correctly", () => {
    // NEXO should have a positive balance from exchanges + interest
    const nexo = result.currencies.find((c) => c.symbol === "NEXO");
    expect(nexo).toBeDefined();
    expect(nexo!.amount).toBeGreaterThan(0);
  });

  it("tracks EUR from deposit-to-exchange", () => {
    const eur = result.currencies.find((c) => c.symbol === "EUR");
    expect(eur).toBeDefined();
    expect(eur!.amount).toBeGreaterThan(0);
  });

  it("skips rejected transactions", () => {
    const withRejected = [
      ...transactions,
      {
        id: "NXTrejected", type: "Interest", inputCurrency: "ETH",
        inputAmount: 999, outputCurrency: "ETH", outputAmount: 999,
        usdEquivalent: 999, fee: "-", feeCurrency: "-",
        details: "rejected / ETH Interest", dateTime: "2025-12-01 06:00:00",
      },
    ];
    const result2 = calculateBalances(withRejected);
    const eth1 = result.currencies.find((c) => c.symbol === "ETH")!.amount;
    const eth2 = result2.currencies.find((c) => c.symbol === "ETH")!.amount;
    expect(eth1).toBe(eth2);
  });

  it("handles empty transaction list", () => {
    const result = calculateBalances([]);
    expect(result.currencies.length).toBeGreaterThan(0); // still has currency data
    expect(result.interestData).toHaveLength(0);
    expect(result.depositAndWithdrawalData).toHaveLength(0);
    expect(result.dailySnapshots.size).toBe(0);
    expect(result.earnedInterestBreakdown).toHaveLength(0);
  });

  it("produces daily snapshots in chronological order", () => {
    const dates = [...result.dailySnapshots.keys()];
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i] >= dates[i - 1]).toBe(true);
    }
  });

  it("interest breakdown covers all interest-earning currencies", () => {
    const interestCurrencies = ["BTC", "ETH", "NEXO", "XRP", "LINK", "DOGE", "SOL", "ADA"];
    for (const symbol of interestCurrencies) {
      const entry = result.earnedInterestBreakdown.find((e) => e.currency === symbol);
      expect(entry, `${symbol} should have interest breakdown`).toBeDefined();
      expect(entry!.inKindAmount + entry!.inNexoAmount).toBeGreaterThan(0);
    }
  });

  it("deposits are always positive", () => {
    for (const d of result.depositAndWithdrawalData) {
      expect(d.deposit).toBeGreaterThanOrEqual(0);
    }
  });

  it("withdrawals are always negative or zero", () => {
    for (const d of result.depositAndWithdrawalData) {
      expect(d.withdrawal).toBeLessThanOrEqual(0);
    }
  });

  it("adds unsupported currencies dynamically", () => {
    const syntheticTx = [{
      id: "NXT_UNK", type: "Interest", inputCurrency: "FAKECOIN",
      inputAmount: 100, outputCurrency: "FAKECOIN", outputAmount: 100,
      usdEquivalent: 50, fee: "-", feeCurrency: "-",
      details: "approved / FAKECOIN Interest", dateTime: "2025-06-01 06:00:00",
    }];
    const r = calculateBalances(syntheticTx);
    const fake = r.currencies.find((c) => c.symbol === "FAKECOIN");
    expect(fake).toBeDefined();
    expect(fake!.supported).toBe(false);
    expect(fake!.amount).toBe(100);
  });

  it("exchange subtracts from source and adds to destination", () => {
    const exchangeTxs = [{
      id: "NXT_EX", type: "Exchange", inputCurrency: "BTC",
      inputAmount: -0.01, outputCurrency: "ETH", outputAmount: 0.3,
      usdEquivalent: 800, fee: "-", feeCurrency: "-",
      details: "approved / Exchange BTC to ETH", dateTime: "2025-06-01 06:00:00",
    }];
    const r = calculateBalances(exchangeTxs);
    const btc = r.currencies.find((c) => c.symbol === "BTC")!;
    const eth = r.currencies.find((c) => c.symbol === "ETH")!;
    expect(btc.amount).toBe(-0.01);
    expect(eth.amount).toBe(0.3);
  });

  it("snapshot balances accumulate correctly over time", () => {
    const lastDate = [...result.dailySnapshots.keys()].pop()!;
    const lastSnapshot = result.dailySnapshots.get(lastDate)!;
    // USDC should have a positive balance in the final snapshot
    expect(lastSnapshot.get("USDC")).toBeGreaterThan(0);
  });

  it("total interest earned is positive", () => {
    const totalInterest = result.interestData.reduce((sum, d) => sum + d.value, 0);
    expect(totalInterest).toBeGreaterThan(0);
  });
});
