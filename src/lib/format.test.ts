import { describe, it, expect } from "vitest";
import { formatUSD, formatCryptoAmount, formatPercent } from "./format";

describe("formatUSD", () => {
  it("formats positive values", () => {
    expect(formatUSD(1234.56)).toBe("$1,234.56");
  });

  it("formats zero", () => {
    expect(formatUSD(0)).toBe("$0.00");
  });

  it("formats negative values", () => {
    const result = formatUSD(-500.1);
    expect(result).toContain("500.10");
    expect(result).toContain("-");
  });

  it("formats very large values", () => {
    const result = formatUSD(1000000);
    expect(result).toContain("1,000,000");
  });

  it("formats very small values with 2 decimals", () => {
    expect(formatUSD(0.001)).toBe("$0.00");
  });

  it("handles NaN", () => {
    expect(formatUSD(NaN)).toBe("$0.00");
  });

  it("handles Infinity", () => {
    expect(formatUSD(Infinity)).toBe("$0.00");
  });

  it("handles -Infinity", () => {
    expect(formatUSD(-Infinity)).toBe("$0.00");
  });
});

describe("formatCryptoAmount", () => {
  it("formats regular amounts", () => {
    expect(formatCryptoAmount(1.5)).toBe("1.5");
  });

  it("trims trailing zeros", () => {
    expect(formatCryptoAmount(1.50000000)).toBe("1.5");
  });

  it("formats very small amounts below threshold as 0", () => {
    // 0.00000001 is below the 0.000001 threshold
    expect(formatCryptoAmount(0.00000001)).toBe("0");
  });

  it("formats amounts just above threshold", () => {
    expect(formatCryptoAmount(0.000001)).toBe("0.000001");
  });

  it("returns 0 for near-zero values", () => {
    expect(formatCryptoAmount(0.0000001)).toBe("0");
  });

  it("returns 0 for zero", () => {
    expect(formatCryptoAmount(0)).toBe("0");
  });

  it("handles NaN", () => {
    expect(formatCryptoAmount(NaN)).toBe("0");
  });

  it("handles negative amounts", () => {
    expect(formatCryptoAmount(-0.5)).toBe("-0.5");
  });

  it("formats whole numbers without decimals", () => {
    expect(formatCryptoAmount(100)).toBe("100");
  });
});

describe("formatPercent", () => {
  it("formats a percentage", () => {
    expect(formatPercent(50)).toBe("50.0%");
  });

  it("formats decimal percentages", () => {
    expect(formatPercent(3.14159)).toBe("3.1%");
  });

  it("formats zero", () => {
    expect(formatPercent(0)).toBe("0.0%");
  });

  it("handles NaN", () => {
    expect(formatPercent(NaN)).toBe("0%");
  });

  it("formats 100%", () => {
    expect(formatPercent(100)).toBe("100.0%");
  });
});
