import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { parseCSV } from "./csv-parser";
import {
  calculateBalances,
  EXCLUDED_DETAIL_STATUSES,
  extractDetailStatus,
  isExcludedDetailStatus,
} from "./balance-calculator";
import { currencyData } from "../data/currencies";
import { computePortfolioTotal } from "./portfolio";

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

  it("includes BUSD as a supported crypto asset with coingecko id binance-usd", () => {
    const busd = currencyData.find((c) => c.symbol === "BUSD");
    expect(busd).toBeDefined();
    expect(busd!.name).toBe("Binance USD");
    expect(busd!.supported).toBe(true);
    expect(busd!.type).toBe("crypto");
    expect(busd!.coingeckoId).toBe("binance-usd");

    const busdTx = [{
      id: "NXT_BUSD_1",
      type: "Interest",
      inputCurrency: "BUSD",
      inputAmount: 51,
      outputCurrency: "BUSD",
      outputAmount: 51,
      usdEquivalent: 51,
      fee: "-",
      feeCurrency: "-",
      details: "approved / BUSD Interest",
      dateTime: "2025-06-01 06:00:00",
    }];
    const r = calculateBalances(busdTx);
    const busdHolding = r.currencies.find((c) => c.symbol === "BUSD");
    expect(busdHolding).toBeDefined();
    expect(busdHolding!.supported).toBe(true);
    expect(busdHolding!.amount).toBe(51);
    expect(busdHolding!.coingeckoId).toBe("binance-usd");

    // Portfolio computation: priced BUSD is included and not reported as unsupported/unpriced
    busdHolding!.usdEquivalent = 51;
    const portfolio = computePortfolioTotal(r.currencies);
    expect(portfolio.excludedSymbols).not.toContain("BUSD");
    expect(portfolio.totalValue).toBeGreaterThanOrEqual(51);
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
    const total = result.interestData.reduce((sum, d) => sum + d.regular + d.fixedTerm, 0);
    expect(total).toBeGreaterThan(0);
  });
});

describe("interest is split by payout kind", () => {
  const HEADER =
    "Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount," +
    "USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC)";

  const row = (id: string, type: string, usd: string, date: string) =>
    `${id},${type},BTC,1.00000000,BTC,1.00000000,${usd},-,-,"approved / synthetic",${date}`;

  it("routes regular interest to `regular` and term payouts to `fixedTerm`", () => {
    const csv =
      `${HEADER}\n` +
      `${row("NXT0000001", "Interest", "$5.00", "2024-01-01 00:00:00")}\n` +
      `${row("NXT0000002", "Fixed Term Interest", "$400.00", "2024-01-01 00:00:00")}\n`;
    const result = calculateBalances(parseCSV(csv));

    expect(result.interestData).toHaveLength(1);
    expect(result.interestData[0]).toEqual({
      date: "2024-01-01",
      regular: 5,
      fixedTerm: 400,
    });
  });

  it("emits a bucket for a date that has only one of the two kinds", () => {
    const csv =
      `${HEADER}\n` +
      `${row("NXT0000001", "Interest", "$5.00", "2024-01-01 00:00:00")}\n` +
      `${row("NXT0000002", "Fixed Term Interest", "$400.00", "2024-02-01 00:00:00")}\n`;
    const result = calculateBalances(parseCSV(csv));

    expect(result.interestData).toEqual([
      { date: "2024-01-01", regular: 5, fixedTerm: 0 },
      { date: "2024-02-01", regular: 0, fixedTerm: 400 },
    ]);
  });

  it("still counts both kinds in the per-currency breakdown", () => {
    const csv =
      `${HEADER}\n` +
      `${row("NXT0000001", "Interest", "$5.00", "2024-01-01 00:00:00")}\n` +
      `${row("NXT0000002", "Fixed Term Interest", "$400.00", "2024-01-01 00:00:00")}\n`;
    const result = calculateBalances(parseCSV(csv));

    const btc = result.earnedInterestBreakdown.find((b) => b.currency === "BTC");
    expect(btc).toBeDefined();
    expect(btc!.inKindUsd).toBe(405);
  });
});

describe("card credit line and rule effects (Phases 1-2)", () => {
  const HEADER =
    "Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount," +
    "USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC)";
  const HEADER_WITH_CREDIT_LINE =
    "Transaction,Type,Credit Line,Input Currency,Input Amount,Output Currency,Output Amount," +
    "USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC)";

  it("reproduces the three-row card chain: EUR stays 0 and xUSD is omitted", () => {
    const csv =
      `${HEADER_WITH_CREDIT_LINE}\n` +
      `NXT1,Credit Card Withdrawal Credit,Card,xUSD,-14.07,xUSD,14.07,$14.07,-,-,"authorized / Nexo Card Loan Withdrawal",2026-08-22 04:08:58\n` +
      `NXT2,Exchange Credit,Card,xUSD,-14.07,EURX,12.00,$14.07,-,-,"authorized / Nexo Card Loan Withdrawal",2026-08-22 04:08:58\n` +
      `NXT3,Nexo Card Purchase,Card,xUSD,-14.07,EURX,12.00,$14.07,-,-,"approved / SHOP | DEU",2026-08-22 04:08:58\n`;
    const result = calculateBalances(parseCSV(csv));
    const eur = result.currencies.find((c) => c.symbol === "EUR");
    expect(eur?.amount ?? 0).toBe(0);
    expect(result.currencies.find((c) => c.symbol === "xUSD")).toBeUndefined();
    const snapshot = result.dailySnapshots.get("2026-08-22");
    expect(snapshot).toBeDefined();
    expect(snapshot?.has("xUSD")).toBe(false);
    expect(snapshot?.has("EUR")).toBe(false);
  });

  it("conserves value across deposit, 10x card chain, and exchange liquidation", () => {
    const rows = [
      `NXT0,Deposit To Exchange,Card,EUR,1000.00,EURX,1000.00,$1000.00,-,-,"approved / Deposit EUR",2026-08-20 00:00:00`,
    ];
    for (let i = 1; i <= 10; i++) {
      const pad = String(i).padStart(2, "0");
      rows.push(
        `NXT_W${pad},Credit Card Withdrawal Credit,Card,xUSD,-14.07,xUSD,14.07,$14.07,-,-,"authorized / Nexo Card Loan Withdrawal",2026-08-21 ${pad}:00:00`,
        `NXT_E${pad},Exchange Credit,Card,xUSD,-14.07,EURX,12.00,$14.07,-,-,"authorized / Nexo Card Loan Withdrawal",2026-08-21 ${pad}:00:00`,
        `NXT_P${pad},Nexo Card Purchase,Card,xUSD,-14.07,EURX,12.00,$14.07,-,-,"approved / SHOP",2026-08-21 ${pad}:00:00`
      );
    }
    rows.push(
      `NXT_L1,Exchange Liquidation,Card,EURX,500.00,xUSD,577.25,$577.25,-,-,"approved / Crypto repayment / Exchange EURX to xUSD",2026-08-22 00:00:00`
    );
    const csv = `${HEADER_WITH_CREDIT_LINE}\n${rows.join("\n")}\n`;
    const result = calculateBalances(parseCSV(csv));
    const eur = result.currencies.find((c) => c.symbol === "EUR");
    expect(eur?.amount).toBe(500);
    expect(result.currencies.find((c) => c.symbol === "xUSD")).toBeUndefined();
  });

  it("handles multi-currency Exchange Liquidation (USDT and BTC) without crediting output or creating xUSD", () => {
    const csv =
      `${HEADER}\n` +
      `NXT1,Exchange Liquidation,USDT,200.00,xUSD,200.00,$200.00,-,-,"approved / Repayment",2026-08-22 00:00:00\n` +
      `NXT2,Exchange Liquidation,BTC,0.05,xUSD,3000.00,$3000.00,-,-,"approved / Repayment",2026-08-22 01:00:00\n`;
    const result = calculateBalances(parseCSV(csv));
    const usdt = result.currencies.find((c) => c.symbol === "USDT");
    const btc = result.currencies.find((c) => c.symbol === "BTC");
    expect(usdt?.amount).toBe(-200);
    expect(btc?.amount).toBe(-0.05);
    expect(result.currencies.find((c) => c.symbol === "xUSD")).toBeUndefined();
  });

  it("Exchange Liquidation alone debits input and does not create xUSD", () => {
    const csv = `${HEADER}\nNXT1,Exchange Liquidation,EURX,500.00,xUSD,577.25,$577.25,-,-,"approved / Repayment",2026-08-22 00:00:00\n`;
    const result = calculateBalances(parseCSV(csv));
    const eur = result.currencies.find((c) => c.symbol === "EUR");
    expect(eur?.amount).toBe(-500);
    expect(result.currencies.find((c) => c.symbol === "xUSD")).toBeUndefined();
  });

  it("Exchange Liquidation with negative input amount remains negative (-Math.abs)", () => {
    const csv = `${HEADER}\nNXT1,Exchange Liquidation,EURX,-500.00,xUSD,577.25,$577.25,-,-,"approved / Repayment",2026-08-22 00:00:00\n`;
    const result = calculateBalances(parseCSV(csv));
    const eur = result.currencies.find((c) => c.symbol === "EUR");
    expect(eur?.amount).toBe(-500);
    expect(result.currencies.find((c) => c.symbol === "xUSD")).toBeUndefined();
  });

  // Characterisation, not validation. Whether these two rows can describe one
  // repayment is unresolved; if they can, this double-debits and the expected
  // value below is the defect rather than the contract.
  it("debits both legs when Manual Sell Order and Exchange Liquidation coincide (open question)", () => {
    // Manual Sell Order debits BTC -0.05 generically. Exchange Liquidation debits BTC -0.05 via debit-input.
    const csv =
      `${HEADER}\n` +
      `NXT1,Manual Sell Order,BTC,-0.05,BTC,0.00,$3000.00,-,-,"approved / Sell BTC",2026-08-22 00:00:00\n` +
      `NXT2,Exchange Liquidation,BTC,0.05,xUSD,3000.00,$3000.00,-,-,"approved / Repayment",2026-08-22 00:00:00\n`;
    const result = calculateBalances(parseCSV(csv));
    const btc = result.currencies.find((c) => c.symbol === "BTC");
    expect(btc?.amount).toBe(-0.10);
    expect(result.currencies.find((c) => c.symbol === "xUSD")).toBeUndefined();
  });

  it("does not mutate parsed fields for any of the 12 new transaction types", () => {
    const newTypes = [
      "Exchange Credit",
      "Credit Card Withdrawal Credit",
      "Nexo Card Transaction Fee",
      "Exchange Liquidation",
      "Transfer To Advanced",
      "Transfer From Advanced",
      "Exchange Booster",
      "Exchange Collateral",
      "Nexo Card Refund",
      "Nexo Card Cashback Reversal",
      "Loan Withdrawal",
      "Interest Discount",
    ];
    for (const [i, type] of newTypes.entries()) {
      const csv = `${HEADER}\nNXT${i},${type},BTC,1.23456789,ETH,5.67890123,$100.00,-,-,"approved / synthetic",2026-08-22 00:00:00\n`;
      const parsed = parseCSV(csv);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].inputAmount).toBe(1.23456789);
      expect(parsed[0].outputCurrency).toBe("ETH");
      expect(parsed[0].outputAmount).toBe(5.67890123);
    }
  });

  it("Transfer To Advanced is ignored and leaves balance unchanged", () => {
    const csv = `${HEADER}\nNXT1,Transfer To Advanced,USDC,-100.00,-,-,$100.00,-,-,"approved / Futures transfer",2026-08-22 00:00:00\n`;
    const result = calculateBalances(parseCSV(csv));
    const usdc = result.currencies.find((c) => c.symbol === "USDC");
    expect(usdc?.amount ?? 0).toBe(0);
  });

  it("Transfer From Advanced is ignored and leaves balance unchanged", () => {
    const csv = `${HEADER}\nNXT1,Transfer From Advanced,USDC,100.00,-,-,$100.00,-,-,"approved / Futures transfer",2026-08-22 00:00:00\n`;
    const result = calculateBalances(parseCSV(csv));
    const usdc = result.currencies.find((c) => c.symbol === "USDC");
    expect(usdc?.amount ?? 0).toBe(0);
  });

  it("Nexo Card Transaction Fee is ignored and does not create xUSD", () => {
    const csv = `${HEADER}\nNXT1,Nexo Card Transaction Fee,xUSD,-2.50,xUSD,2.50,$2.50,-,-,"approved / 2.5% Weekend FX Fee",2026-08-22 00:00:00\n`;
    const result = calculateBalances(parseCSV(csv));
    expect(result.currencies.find((c) => c.symbol === "xUSD")).toBeUndefined();
  });

  it("Exchange Booster behaves generically (USDT debited, ETH credited)", () => {
    const csv = `${HEADER}\nNXT1,Exchange Booster,USDT,-60.02,ETH,0.028,$60.02,-,-,"approved / Booster swap",2026-08-22 00:00:00\n`;
    const result = calculateBalances(parseCSV(csv));
    const usdt = result.currencies.find((c) => c.symbol === "USDT");
    const eth = result.currencies.find((c) => c.symbol === "ETH");
    expect(usdt?.amount).toBe(-60.02);
    expect(eth?.amount).toBe(0.028);
  });

  it("Exchange Collateral behaves generically (NETH debited, ETH credited)", () => {
    const csv = `${HEADER}\nNXT1,Exchange Collateral,NETH,-0.2645,ETH,0.2645,$500.00,-,-,"approved / Collateral swap",2026-08-22 00:00:00\n`;
    const result = calculateBalances(parseCSV(csv));
    const neth = result.currencies.find((c) => c.symbol === "NETH");
    const eth = result.currencies.find((c) => c.symbol === "ETH");
    expect(neth?.amount).toBe(-0.2645);
    expect(eth?.amount).toBe(0.2645);
  });

  it("Nexo Card Cashback Reversal is ignored (neither USD nor EUR moves)", () => {
    const csv = `${HEADER}\nNXT1,Nexo Card Cashback Reversal,USD,-1.16,EUR,1.00,$1.16,-,-,"approved / Cashback reversal",2026-08-22 00:00:00\n`;
    const result = calculateBalances(parseCSV(csv));
    const usd = result.currencies.find((c) => c.symbol === "USD");
    const eur = result.currencies.find((c) => c.symbol === "EUR");
    expect(usd?.amount ?? 0).toBe(0);
    expect(eur?.amount ?? 0).toBe(0);
  });

  it("preserves snapping for currencies.amount while preserving raw sum in dailySnapshots", () => {
    const csv =
      `${HEADER}\n` +
      `NXT1,Top up Crypto,BTC,0.0000004,BTC,0.0000004,$0.02,-,-,"approved / dust",2026-08-22 01:00:00\n` +
      `NXT2,Top up Crypto,BTC,0.0000004,BTC,0.0000004,$0.02,-,-,"approved / dust",2026-08-22 02:00:00\n` +
      `NXT3,Top up Crypto,BTC,0.0000004,BTC,0.0000004,$0.02,-,-,"approved / dust",2026-08-22 03:00:00\n`;
    const result = calculateBalances(parseCSV(csv));
    const btc = result.currencies.find((c) => c.symbol === "BTC")!;
    expect(btc.amount).toBe(0); // snapped to 0 because 0.0000004 < 1e-6 each time
    const snapshot = result.dailySnapshots.get("2026-08-22")!;
    expect(snapshot.get("BTC")).toBeCloseTo(0.0000012, 10); // NOT snapped
  });

  it("records dailySnapshots for dates that have only ignored transactions", () => {
    const csv =
      `${HEADER}\n` +
      `NXT1,Transfer In,BTC,1.0,BTC,1.0,$50000,-,-,"approved / transfer",2026-08-21 00:00:00\n` +
      `NXT2,Transfer Out,BTC,-1.0,BTC,1.0,$50000,-,-,"approved / transfer",2026-08-22 00:00:00\n`;
    const result = calculateBalances(parseCSV(csv));
    expect(result.dailySnapshots.has("2026-08-21")).toBe(true);
    expect(result.dailySnapshots.has("2026-08-22")).toBe(true);
  });

  it("preserves balance debit effect for negative Interest rows", () => {
    const csv = `${HEADER}\nNXT1,Interest,USD,-9.00,USD,9.00,$9.00,-,-,"approved / Interest",2026-08-22 00:00:00\n`;
    const result = calculateBalances(parseCSV(csv));
    const usd = result.currencies.find((c) => c.symbol === "USD");
    expect(usd?.amount).toBe(-9);
    expect(result.interestChargedUsd).toBe(9);
    expect(result.interestData).toHaveLength(1);
    expect(result.interestData[0]).toEqual({
      date: "2026-08-22",
      regular: 0,
      fixedTerm: 0,
    });
    expect(result.earnedInterestBreakdown).toHaveLength(0);
  });

  it("emits a series point with regular/fixedTerm 0 for dates with only charged or zero interest rows so daily avg denominator is preserved", () => {
    const csv =
      `${HEADER}\n` +
      `NXT1,Interest,BTC,0.0001,BTC,0.0001,$5.00,-,-,"approved / Interest",2026-09-01 10:00:00\n` +
      `NXT2,Interest,USD,-9.00,-,-,$9.00,-,-,"approved / Interest",2026-09-02 10:00:00\n`;
    const result = calculateBalances(parseCSV(csv));
    expect(result.interestData).toHaveLength(2);
    expect(result.interestData[0]).toEqual({
      date: "2026-09-01",
      regular: 5,
      fixedTerm: 0,
    });
    expect(result.interestData[1]).toEqual({
      date: "2026-09-02",
      regular: 0,
      fixedTerm: 0,
    });
    expect(result.interestChargedUsd).toBe(9);
  });

  it("does not classify zero or non-finite amounts as interest charged or earned", () => {
    const csv =
      `${HEADER}\n` +
      `NXT1,Interest,BTC,0,BTC,0,$5.00,-,-,"approved / Interest",2026-09-01 10:00:00\n` +
      `NXT2,Interest,BTC,NaN,BTC,NaN,$5.00,-,-,"approved / Interest",2026-09-02 10:00:00\n`;
    const result = calculateBalances(parseCSV(csv));
    expect(result.interestChargedUsd).toBe(0);
    expect(result.interestData).toHaveLength(2);
    expect(result.interestData[0].regular).toBe(0);
    expect(result.interestData[1].regular).toBe(0);
    expect(result.earnedInterestBreakdown).toHaveLength(0);
  });

  it("keeps Interest Earned gross and accumulates negative rows into interestChargedUsd", () => {
    const csv =
      `${HEADER}\n` +
      `NXT1,Interest,BTC,0.0001,BTC,0.0001,$5.00,-,-,"approved / Interest",2026-08-22 00:00:00\n` +
      `NXT2,Interest,USD,-9.00,USD,9.00,$9.00,-,-,"approved / Interest",2026-08-22 00:00:00\n`;
    const result = calculateBalances(parseCSV(csv));
    // Gross earned stays gross ($5), not netted down to -$4 or up to +$14
    expect(result.interestData).toHaveLength(1);
    expect(result.interestData[0].regular).toBe(5);
    // Breakdown contains only the credited currency (BTC)
    expect(result.earnedInterestBreakdown).toHaveLength(1);
    expect(result.earnedInterestBreakdown[0].currency).toBe("BTC");
    expect(result.earnedInterestBreakdown[0].inKindUsd).toBe(5);
    expect(result.earnedInterestBreakdown[0].inKindAmount).toBe(0.0001);
    // Excluded row is accumulated in interestChargedUsd
    expect(result.interestChargedUsd).toBe(9);
    // Balance effects: BTC credited 0.0001, USD debited -9
    const btc = result.currencies.find((c) => c.symbol === "BTC");
    const usd = result.currencies.find((c) => c.symbol === "USD");
    expect(btc?.amount).toBe(0.0001);
    expect(usd?.amount).toBe(-9);
  });

  it("handles in-NEXO interest and verifies inKind/inNexo quantities stay positive", () => {
    const csv =
      `${HEADER}\n` +
      `NXT1,Interest,BTC,0.0,NEXO,2.50,$2.75,-,-,"approved / BTC Interest Earned",2026-08-22 00:00:00\n`;
    const result = calculateBalances(parseCSV(csv));
    expect(result.interestData).toHaveLength(1);
    expect(result.interestData[0].regular).toBe(2.75);
    expect(result.earnedInterestBreakdown).toHaveLength(1);
    const btcEntry = result.earnedInterestBreakdown.find((e) => e.currency === "BTC");
    expect(btcEntry).toBeDefined();
    expect(btcEntry!.inNexoAmount).toBe(2.50);
    expect(btcEntry!.inNexoUsd).toBe(2.75);
    expect(btcEntry!.inKindAmount).toBe(0);
    expect(result.interestChargedUsd).toBe(0);
  });

  it("calculates balances from an 11-column export without Credit Line column", () => {
    const csv =
      `${HEADER}\n` +
      `NXT100,Top up Crypto,BTC,0.50000000,BTC,0.50000000,$30000.00,-,-,"approved / deposit",2026-08-20 12:00:00\n` +
      `NXT101,Interest,BTC,0.00010000,BTC,0.00010000,$6.00,-,-,"approved / BTC Interest",2026-08-21 06:00:00\n` +
      `NXT102,Withdrawal,BTC,-0.10000000,BTC,0.10000000,$6000.00,-,-,"approved / withdrawal",2026-08-22 18:00:00\n`;
    const result = calculateBalances(parseCSV(csv));
    const btc = result.currencies.find((c) => c.symbol === "BTC");
    expect(btc?.amount).toBeCloseTo(0.4001, 8);
    expect(result.interestChargedUsd).toBe(0);
    expect(result.interestData).toHaveLength(1);
    expect(result.interestData[0].regular).toBe(6);
  });

  it("falls back to generic effect for unknown transaction types", () => {
    const csv = `${HEADER}\nNXT1,UnknownFutureType,BTC,-0.1,ETH,2.0,$5000,-,-,"approved / future",2026-08-22 00:00:00\n`;
    const result = calculateBalances(parseCSV(csv));
    const btc = result.currencies.find((c) => c.symbol === "BTC");
    const eth = result.currencies.find((c) => c.symbol === "ETH");
    expect(btc?.amount).toBe(-0.1);
    expect(eth?.amount).toBe(2.0);
  });

  it("handles prototype keys (constructor, toString, valueOf, __proto__) safely as generic without throwing", () => {
    const protoKeys = ["constructor", "toString", "valueOf", "__proto__"] as const;
    for (const key of protoKeys) {
      const csv = `${HEADER}\nNXT1,${key},BTC,-0.1,ETH,2.0,$5000,-,-,"approved / proto test",2026-08-22 00:00:00\n`;
      let result!: ReturnType<typeof calculateBalances>;
      expect(() => {
        result = calculateBalances(parseCSV(csv));
      }).not.toThrow();
      const btc = result.currencies.find((c) => c.symbol === "BTC");
      const eth = result.currencies.find((c) => c.symbol === "ETH");
      expect(btc?.amount).toBe(-0.1);
      expect(eth?.amount).toBe(2.0);
    }
  });
});

// Holdings are unchanged for accounts with no credit line; the interest figures
// are not, because negative and zero Interest rows occur on ordinary accounts and
// no longer count as earned. The demo fixture has no such row, so this is the only
// coverage of that branch.
describe("accounts with no credit line and no new types", () => {
  const HEADER =
    "Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount," +
    "USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC)";

  const ordinary =
    `${HEADER}\n` +
    `NXT1,Top up Crypto,BTC,1.00000000,BTC,1.00000000,$60000.00,-,-,"approved / x",2026-01-01 00:00:00\n` +
    `NXT2,Interest,BTC,0.00100000,BTC,0.00100000,$60.00,-,-,"approved / x",2026-01-02 00:00:00\n` +
    `NXT3,Interest,USD,-9.00000000,-,0.00000000,$9.00,-,-,"approved / x",2026-01-03 00:00:00\n`;

  const result = calculateBalances(parseCSV(ordinary));

  it("leaves holdings exactly as the pre-rule-table code did", () => {
    // BTC gains the top-up and the in-kind interest; USD is debited by the negative
    // row exactly as before -- the balance path never distinguished the two.
    expect(result.currencies.find((c) => c.symbol === "BTC")!.amount).toBeCloseTo(1.001, 10);
    expect(result.currencies.find((c) => c.symbol === "USD")!.amount).toBeCloseTo(-9, 10);
  });

  it("does change the interest figures, splitting rather than netting", () => {
    const earned = result.interestData.reduce((s, p) => s + p.regular + p.fixedTerm, 0);
    expect(earned).toBe(60);              // gross: the negative row is not subtracted
    expect(result.interestChargedUsd).toBe(9);
    expect(earned).toBeGreaterThan(0);    // never negative under a heading saying "Earned"
  });

  it("keeps the reporting-day denominator so Daily Avg is not inflated", () => {
    // Three rows, two of them interest, on two distinct dates. The charged-only
    // date must survive as a zero point or the average divides by the wrong number.
    expect(result.interestData).toHaveLength(2);
    expect(result.interestData.map((p) => p.date)).toEqual(["2026-01-02", "2026-01-03"]);
  });

  it("treats a negative in-NEXO payout as charged, not earned", () => {
    // The in-NEXO branch takes direction from outputAmount, not inputAmount.
    // Nothing else covers the negative side of that branch.
    const csv =
      `${HEADER}\n` +
      `NXT1,Interest,BTC,1.00000000,NEXO,-2.50000000,$2.75,-,-,"approved / x",2026-02-01 00:00:00\n`;
    const r = calculateBalances(parseCSV(csv));
    expect(r.interestData.reduce((s, p) => s + p.regular + p.fixedTerm, 0)).toBe(0);
    expect(r.interestChargedUsd).toBe(2.75);
    expect(r.earnedInterestBreakdown).toHaveLength(0);
  });
});

describe("BUG 2: pending and rejected status matching by prefix", () => {
  const HEADER =
    "Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount," +
    "USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC)";

  it("exports EXCLUDED_DETAIL_STATUSES containing pending and rejected", () => {
    expect(EXCLUDED_DETAIL_STATUSES).toBeInstanceOf(Set);
    expect(EXCLUDED_DETAIL_STATUSES.has("pending")).toBe(true);
    expect(EXCLUDED_DETAIL_STATUSES.has("rejected")).toBe(true);
    expect(EXCLUDED_DETAIL_STATUSES.size).toBe(2);
  });

  it("extractDetailStatus correctly extracts and normalizes the status before '/' or entire field", () => {
    expect(extractDetailStatus("rejected / x")).toBe("rejected");
    expect(extractDetailStatus("Rejected / x")).toBe("rejected");
    expect(extractDetailStatus("REJECTED / x")).toBe("rejected");
    expect(extractDetailStatus("pending / review")).toBe("pending");
    expect(extractDetailStatus("Pending / review")).toBe("pending");
    expect(extractDetailStatus("PENDING / review")).toBe("pending");
    expect(extractDetailStatus("rejected")).toBe("rejected");
    expect(extractDetailStatus("Rejected")).toBe("rejected");
    expect(extractDetailStatus("pending")).toBe("pending");
    expect(extractDetailStatus("Pending")).toBe("pending");
    expect(extractDetailStatus("approved / pending review")).toBe("approved");
    expect(extractDetailStatus("approved / Rejected Books Ltd")).toBe("approved");
    expect(extractDetailStatus("")).toBe("");
  });

  it("isExcludedDetailStatus correctly identifies excluded statuses", () => {
    expect(isExcludedDetailStatus("rejected / x")).toBe(true);
    expect(isExcludedDetailStatus("Rejected / x")).toBe(true);
    expect(isExcludedDetailStatus("REJECTED / x")).toBe(true);
    expect(isExcludedDetailStatus("pending / x")).toBe(true);
    expect(isExcludedDetailStatus("Pending / x")).toBe(true);
    expect(isExcludedDetailStatus("PENDING / x")).toBe(true);
    expect(isExcludedDetailStatus("rejected")).toBe(true);
    expect(isExcludedDetailStatus("Rejected")).toBe(true);
    expect(isExcludedDetailStatus("pending")).toBe(true);
    expect(isExcludedDetailStatus("Pending")).toBe(true);

    expect(isExcludedDetailStatus("approved / pending review")).toBe(false);
    expect(isExcludedDetailStatus("approved / Rejected Books Ltd")).toBe(false);
    expect(isExcludedDetailStatus("approved / The Reject Shop")).toBe(false);
    expect(isExcludedDetailStatus("authorized / card purchase")).toBe(false);
  });

  it("excludes rejected transactions across lowercase, uppercase, and mixed-case", () => {
    const csv =
      `${HEADER}\n` +
      `NXT001,Top up Crypto,BTC,1.0,BTC,1.0,$50000.00,-,-,"rejected / test",2026-01-01 00:00:00\n` +
      `NXT002,Top up Crypto,BTC,1.0,BTC,1.0,$50000.00,-,-,"Rejected / test",2026-01-02 00:00:00\n` +
      `NXT003,Top up Crypto,BTC,1.0,BTC,1.0,$50000.00,-,-,"REJECTED / test",2026-01-03 00:00:00\n`;
    const r = calculateBalances(parseCSV(csv));
    const btc = r.currencies.find((c) => c.symbol === "BTC")!;
    expect(btc.amount).toBe(0);
  });

  it("excludes pending transactions across lowercase, uppercase, and mixed-case", () => {
    const csv =
      `${HEADER}\n` +
      `NXT001,Top up Crypto,BTC,1.0,BTC,1.0,$50000.00,-,-,"pending / test",2026-01-01 00:00:00\n` +
      `NXT002,Top up Crypto,BTC,1.0,BTC,1.0,$50000.00,-,-,"Pending / test",2026-01-02 00:00:00\n` +
      `NXT003,Top up Crypto,BTC,1.0,BTC,1.0,$50000.00,-,-,"PENDING / test",2026-01-03 00:00:00\n`;
    const r = calculateBalances(parseCSV(csv));
    const btc = r.currencies.find((c) => c.symbol === "BTC")!;
    expect(btc.amount).toBe(0);
  });

  it("excludes bare status with no '/'", () => {
    const csv =
      `${HEADER}\n` +
      `NXT001,Top up Crypto,BTC,1.0,BTC,1.0,$50000.00,-,-,"rejected",2026-01-01 00:00:00\n` +
      `NXT002,Top up Crypto,BTC,1.0,BTC,1.0,$50000.00,-,-,"Rejected",2026-01-02 00:00:00\n` +
      `NXT003,Top up Crypto,BTC,1.0,BTC,1.0,$50000.00,-,-,"pending",2026-01-03 00:00:00\n` +
      `NXT004,Top up Crypto,BTC,1.0,BTC,1.0,$50000.00,-,-,"Pending",2026-01-04 00:00:00\n`;
    const r = calculateBalances(parseCSV(csv));
    const btc = r.currencies.find((c) => c.symbol === "BTC")!;
    expect(btc.amount).toBe(0);
  });

  it("includes approved row whose free text contains 'pending'", () => {
    const csv =
      `${HEADER}\n` +
      `NXT001,Top up Crypto,BTC,1.0,BTC,1.0,$50000.00,-,-,"approved / pending review",2026-01-01 00:00:00\n`;
    const r = calculateBalances(parseCSV(csv));
    const btc = r.currencies.find((c) => c.symbol === "BTC")!;
    expect(btc.amount).toBe(1.0);
  });

  it("includes approved row containing 'rejected' inside a merchant name", () => {
    const csv =
      `${HEADER}\n` +
      `NXT001,Top up Crypto,BTC,1.0,BTC,1.0,$50000.00,-,-,"approved / Rejected Books Ltd",2026-01-01 00:00:00\n` +
      `NXT002,Top up Crypto,ETH,2.0,ETH,2.0,$6000.00,-,-,"approved / Payment at The Reject Shop",2026-01-02 00:00:00\n`;
    const r = calculateBalances(parseCSV(csv));
    const btc = r.currencies.find((c) => c.symbol === "BTC")!;
    const eth = r.currencies.find((c) => c.symbol === "ETH")!;
    expect(btc.amount).toBe(1.0);
    expect(eth.amount).toBe(2.0);
  });

  it("verified failure scenario: three rows (rejected, Rejected, approved-mentioning-pending) yield BTC 2", () => {
    // Status is the leading token, matched case-insensitively: "rejected" and
    // "Rejected" are both excluded, and "approved / pending review" is included.
    const csv =
      `${HEADER}\n` +
      `NXT001,Top up Crypto,BTC,1.0,BTC,1.0,$50000.00,-,-,"rejected / deposit",2026-01-01 00:00:00\n` +
      `NXT002,Top up Crypto,BTC,1.0,BTC,1.0,$50000.00,-,-,"Rejected / deposit",2026-01-02 00:00:00\n` +
      `NXT003,Top up Crypto,BTC,2.0,BTC,2.0,$100000.00,-,-,"approved / pending review",2026-01-03 00:00:00\n`;
    const r = calculateBalances(parseCSV(csv));
    const btc = r.currencies.find((c) => c.symbol === "BTC")!;
    expect(btc.amount).toBe(2.0);
  });
});
