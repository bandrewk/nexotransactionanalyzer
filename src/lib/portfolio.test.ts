import { describe, it, expect } from "vitest";
import { computePortfolioTotal } from "./portfolio";
import type { Currency } from "../types";

const c = (
  symbol: string,
  amount: number,
  usdEquivalent: number,
  supported = true
): Currency => ({
  name: symbol,
  symbol,
  type: supported ? "crypto" : "unknown",
  amount,
  usdEquivalent,
  coingeckoId: supported ? symbol.toLowerCase() : "",
  supported,
});

describe("computePortfolioTotal", () => {
  it("sums priced, supported holdings", () => {
    const result = computePortfolioTotal([c("BTC", 1, 100), c("ETH", 2, 50)]);
    expect(result.totalValue).toBe(150);
    expect(result.excludedSymbols).toEqual([]);
  });

  it("reports a held asset that is not supported instead of dropping it silently", () => {
    const result = computePortfolioTotal([c("BTC", 1, 100), c("WEIRD", 5, 0, false)]);
    expect(result.totalValue).toBe(100);
    expect(result.excludedSymbols).toEqual(["WEIRD"]);
  });

  it("reports a supported asset that never received a price", () => {
    const result = computePortfolioTotal([c("BTC", 1, 100), c("ETHW", 3, 0)]);
    expect(result.totalValue).toBe(100);
    expect(result.excludedSymbols).toEqual(["ETHW"]);
  });

  it("ignores dust balances rather than reporting them as excluded", () => {
    const result = computePortfolioTotal([c("BTC", 1, 100), c("DUST", 0.0000001, 0)]);
    expect(result.totalValue).toBe(100);
    expect(result.excludedSymbols).toEqual([]);
  });

  it("ignores zero balances entirely", () => {
    const result = computePortfolioTotal([c("BTC", 1, 100), c("SOLD", 0, 0)]);
    expect(result.excludedSymbols).toEqual([]);
  });

  it("reports a held, unpriced negative balance as missing a price", () => {
    const result = computePortfolioTotal([c("BTC", 1, 100), c("OWED", -5, 0)]);
    expect(result.excludedSymbols).toEqual(["OWED"]);
  });

  it("does not claim a priced negative position is missing a price", () => {
    // A borrowed position is priced fine; it is left out because this is a
    // value total, not net worth. Calling that "no price available" is untrue.
    const result = computePortfolioTotal([c("BTC", 1, 100), c("USDC", -5, -5)]);
    expect(result.totalValue).toBe(100);
    expect(result.excludedSymbols).toEqual([]);
  });

  it("drops a priced holding below the value threshold without calling it unpriced", () => {
    // Worth half a cent: correctly left out of the total, but it HAS a price,
    // so announcing "no price available" would be false.
    const result = computePortfolioTotal([c("BTC", 1, 100), c("TINY", 1, 0.005)], 0.01);
    expect(result.totalValue).toBe(100);
    expect(result.excludedSymbols).toEqual([]);
  });

  it("still reports a genuinely unpriced holding when a threshold is set", () => {
    const result = computePortfolioTotal([c("BTC", 1, 100), c("NOPRICE", 5, 0)], 0.01);
    expect(result.totalValue).toBe(100);
    expect(result.excludedSymbols).toEqual(["NOPRICE"]);
  });

  it("returns excluded symbols sorted for stable rendering", () => {
    const result = computePortfolioTotal([c("ZZZ", 1, 0), c("AAA", 1, 0), c("MMM", 1, 0)]);
    expect(result.excludedSymbols).toEqual(["AAA", "MMM", "ZZZ"]);
  });

  it("handles an empty currency list", () => {
    expect(computePortfolioTotal([])).toEqual({ totalValue: 0, excludedSymbols: [] });
  });
});
