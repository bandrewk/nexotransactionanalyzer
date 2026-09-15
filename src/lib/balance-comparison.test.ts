import { describe, it, expect } from "vitest";
import {
  assetLabel,
  buildComparison,
  findTypeHints,
  isComparableSymbol,
  MAX_HINTS_PER_ASSET,
  normaliseSymbol,
  parseUserAmount,
} from "./balance-comparison";
import { analyseCsv } from "./csv-diagnostics";

const HEADER =
  "Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC)";
const line = (id: string, type: string, ic: string, ia: string, oc: string, oa: string, details = "approved / x") =>
  `${id},${type},${ic},${ia},${oc},${oa},$1.00,-,-,"${details}",2026-01-15 00:00:00`;
const csv = (...rows: string[]) => [HEADER, ...rows].join("\n");

describe("parseUserAmount", () => {
  it.each([
    ["0", 0],
    ["0.00", 0],
    ["60,62", 60.62],
    ["60.62", 60.62],
    ["-5", -5],
    ["  2800 ", 2800],
    ["0,500", 0.5],
    ["0.69043308", 0.69043308],
    ["1.5", 1.5],
    ["1500", 1500],
    ["9,800.16617572", 9800.16617572],
    ["9.800,17", 9800.17],
    ["1,234,567", 1234567],
    ["1.234.567", 1234567],
    ["1,234,567.5", 1234567.5],
    ["-2,800.00", -2800],
  ])("reads %s as %s", (text, value) => {
    expect(parseUserAmount(text)).toEqual({ kind: "value", value });
  });

  it("treats blank input as not compared", () => {
    expect(parseUserAmount("")).toEqual({ kind: "empty" });
    expect(parseUserAmount("   ")).toEqual({ kind: "empty" });
  });

  it.each(["2,800", "1.500", "999,999"])("rejects %s as ambiguous", (text) => {
    expect(parseUserAmount(text)).toEqual({ kind: "invalid", reason: "ambiguous" });
  });

  it.each(["1 234", "abc", "1e3", "--1", "1.", ".5", "$5", "Infinity", "1,23,456.7", "12,34,56", "1.234,56.7", "1,234.5,6", "1,2345.6", ",5", "1,,000", "2,800."])(
    "rejects %s as malformed",
    (text) => {
      expect(parseUserAmount(text)).toEqual({ kind: "invalid", reason: "format" });
    }
  );
});

describe("symbols and labels", () => {
  it("folds FIATx spellings and keeps credit-line units", () => {
    expect(normaliseSymbol("usdx")).toBe("USD");
    expect(normaliseSymbol(" EURx ")).toBe("EUR");
    expect(normaliseSymbol("xUSD")).toBe("xUSD");
    expect(normaliseSymbol("xusd")).toBe("xUSD");
    expect(normaliseSymbol("xaut")).toBe("XAUT");
    expect(isComparableSymbol(normaliseSymbol("xaut"))).toBe(true);
    expect(normaliseSymbol("neth")).toBe("NETH");
    expect(normaliseSymbol("A".repeat(40))).toHaveLength(16);
  });

  it("marks credit-line units as not comparable", () => {
    expect(isComparableSymbol("xUSD")).toBe(false);
    expect(isComparableSymbol("USD")).toBe(true);
    expect(isComparableSymbol("NETH")).toBe(true);
  });

  it("shows Nexo's spelling for fiat", () => {
    expect(assetLabel("USD")).toBe("USD (Nexo: USDx)");
    expect(assetLabel("EUR")).toBe("EUR (Nexo: EURx)");
    expect(assetLabel("BTC")).toBe("BTC");
  });
});

describe("buildComparison", () => {
  const holdings = [
    { symbol: "USDT", amount: 60.6171236 },
    { symbol: "USDC", amount: 2800 },
  ];

  it("computes the difference as Nexo minus analyzer, in both directions", () => {
    const rows = buildComparison(holdings, [
      { symbol: "USDT", value: 0 },
      { symbol: "USDC", value: 2900 },
    ]);
    expect(rows[0]).toMatchObject({ symbol: "USDT", analyzer: 60.6171236, nexo: 0, relativePercent: null });
    expect(rows[0].difference).toBeCloseTo(-60.6171236, 10);
    expect(rows[1]).toMatchObject({ symbol: "USDC", difference: 100 });
    expect(rows[1].relativePercent).toBeCloseTo((100 / 2900) * 100, 10);
  });

  it("uses 0 for assets the analyzer does not hold and skips credit-line units", () => {
    const rows = buildComparison(holdings, [
      { symbol: "SOL", value: 3 },
      { symbol: "xUSD", value: 10 },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ symbol: "SOL", analyzer: 0, nexo: 3, difference: 3, label: "SOL" });
  });
});

describe("findTypeHints", () => {
  // A booster loan whose borrowed USDT the analyzer credits.
  const d = analyseCsv(
    csv(
      line("NXT1", "Top up Crypto", "USDT", "100.00000000", "USDT", "100.00000000"),
      line("NXT2", "Exchange", "USDT", "-100.00000000", "BTC", "0.00100000"),
      line("NXT3", "Loan Withdrawal", "USD", "-60.48073607", "USDT", "60.61712460"),
      line("NXT4", "Exchange Booster", "USDT", "-60.01695505", "ETH", "0.02799203"),
      line("NXT5", "Transfer Out", "USDC", "-250.00000000", "USDC", "250.00000000"),
      line("NXT6", "Interest", "USDX", "-0.17000000", "-", "0.00000000", "approved / 1 days interest for tid: NXT0"),
      line("NXT7", "Interest", "USDX", "-0.03000000", "-", "0.00000000", "approved / Interest"),
      line("NXT8", "Cashback", "NEXO", "5.00000000", "NEXO", "5.00000000"),
      line("NXT9", "Cashback", "NEXO", "-2.00000000", "NEXO", "2.00000000")
    )
  );
  const row = (symbol: string, analyzer: number, nexo: number) =>
    buildComparison([{ symbol, amount: analyzer }], [{ symbol, value: nexo }])[0];

  it("names a counted type total that matches the difference", () => {
    // Analyzer USDT: 100 - 100 + 60.6171246 - 60.01695505; Nexo shows the booster loan never arrived.
    const analyzer = 100 - 100 + 60.6171246 - 60.01695505;
    const hints = findTypeHints(row("USDT", analyzer, analyzer - 60.6171246), d.types);
    expect(hints[0].text).toContain("counted `Loan Withdrawal` total (1 row)");
    expect(hints[0].total).toBeCloseTo(60.6171246, 10);
    expect(hints[0].deviation).toBeLessThan(1e-9);
  });

  it("uses neutral wording for an ignored movement of the same size", () => {
    const hints = findTypeHints(row("USDC", 0, -250), d.types);
    expect(hints).toHaveLength(1);
    expect(hints[0].text).toBe("same size as the ignored `Transfer Out` total (1 row)");
  });

  it("matches the credit-line interest charges without calling them counted", () => {
    const hints = findTypeHints(row("USD", 0, -0.2), d.types);
    expect(hints).toHaveLength(1);
    expect(hints[0].text).toContain("credit-line interest charges (2 rows)");
  });

  it("checks incoming and outgoing parts of a total with both signs", () => {
    const outgoing = findTypeHints(row("NEXO", 3, 5), d.types);
    expect(outgoing.map((h) => h.text)).toContain(
      "matches the counted `Cashback` outgoing rows (1 row)"
    );
    const incoming = findTypeHints(row("NEXO", 3, -2), d.types);
    expect(incoming.map((h) => h.text)).toContain(
      "matches the counted `Cashback` incoming rows (1 row)"
    );
  });

  it("gives no hint outside the tolerance, and none for a zero difference", () => {
    expect(findTypeHints(row("USDC", 0, -250.5), d.types)).toEqual([]);
    expect(findTypeHints(row("USDT", 5, 5), d.types)).toEqual([]);
  });

  it("accepts a difference within 0.1%", () => {
    expect(findTypeHints(row("USDC", 0, -250.2), d.types)).toHaveLength(1);
  });

  it("caps hints per asset and orders them by deviation", () => {
    const many = analyseCsv(
      csv(
        ...Array.from({ length: 6 }, (_, i) =>
          line(`NXT${i}`, ["Top up Crypto", "Cashback", "Dividend", "Referral Bonus", "Exchange Cashback", "Fixed Term Interest"][i], "BTC", (1 + i * 0.0001).toFixed(8), "BTC", "1")
        )
      )
    );
    const hints = findTypeHints(row("BTC", 7, 6), many.types);
    expect(hints).toHaveLength(MAX_HINTS_PER_ASSET);
    expect(hints[0].deviation).toBeLessThanOrEqual(hints[1].deviation);
    expect(hints[1].deviation).toBeLessThanOrEqual(hints[2].deviation);
  });

  it("keeps only the closest match per type and bucket, so other types are not crowded out", () => {
    const mixed = analyseCsv(
      csv(
        line("NXT1", "Top up Crypto", "BTC", "1000.00000000", "BTC", "1000.00000000"),
        line("NXT2", "Top up Crypto", "BTC", "-0.00010000", "BTC", "0.00010000"),
        line("NXT3", "Cashback", "BTC", "999.99950000", "BTC", "999.99950000"),
        line("NXT4", "Dividend", "BTC", "999.99920000", "BTC", "999.99920000")
      )
    );
    // Top up Crypto matches twice (incoming rows and total); only its closest match may count.
    const hints = findTypeHints(row("BTC", 2999.999, 1999.999), mixed.types);
    expect(hints.filter((h) => h.text.includes("`Top up Crypto`"))).toHaveLength(1);
    expect(hints.some((h) => h.text.includes("`Cashback`"))).toBe(true);
    expect(hints.some((h) => h.text.includes("`Dividend`"))).toBe(true);
  });

  it("shortens type names with the given formatter", () => {
    const long = analyseCsv(csv(line("NXT1", "X".repeat(500), "BTC", "1.00000000", "BTC", "1.00000000")));
    const [hint] = findTypeHints(row("BTC", 1, 0), long.types, (name) => name.slice(0, 8) + "…");
    expect(hint.text).toBe("matches the counted `XXXXXXXX…` total (1 row)");
  });

  it("matches FIATx rows under the fiat symbol", () => {
    const fiat = analyseCsv(csv(line("NXT1", "Deposit To Exchange", "EURX", "200.00", "EURX", "200.00")));
    const hints = findTypeHints(row("EUR", 200, 0), fiat.types);
    expect(hints[0].text).toContain("counted `Deposit To Exchange` total");
  });
});
