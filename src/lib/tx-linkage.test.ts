import { describe, it, expect } from "vitest";
import { getExplorerUrl, getSupportedExplorers } from "./tx-linkage";
import { TransactionType } from "../data/transaction-types";

describe("getExplorerUrl", () => {
  it("returns null for non-deposit transaction types", () => {
    expect(getExplorerUrl(TransactionType.INTEREST, "BTC", "approved / BTC Interest")).toBeNull();
    expect(getExplorerUrl(TransactionType.EXCHANGE, "BTC", "approved / Exchange")).toBeNull();
    expect(getExplorerUrl(TransactionType.WITHDRAWAL, "BTC", "approved / withdrawal")).toBeNull();
  });

  it("returns explorer URL for BTC deposit", () => {
    const result = getExplorerUrl(
      TransactionType.TOPUPCRYPTO, "BTC",
      "approved / abc123def456"
    );
    expect(result).not.toBeNull();
    expect(result!.url).toBe("https://www.blockchain.com/btc/tx/abc123def456");
    expect(result!.txHash).toBe("abc123def456");
  });

  it("returns explorer URL for ETH deposit (default etherscan)", () => {
    const result = getExplorerUrl(
      TransactionType.DEPOSIT, "ETH",
      "approved / 0xabc123"
    );
    expect(result!.url).toBe("https://etherscan.io/tx/0xabc123");
  });

  it("returns correct explorer for each supported chain", () => {
    const explorers = getSupportedExplorers();
    for (const [currency, baseUrl] of Object.entries(explorers)) {
      const result = getExplorerUrl(
        TransactionType.TOPUPCRYPTO, currency,
        "approved / txhash123"
      );
      expect(result, `${currency} should return explorer`).not.toBeNull();
      expect(result!.url).toBe(`${baseUrl}txhash123`);
    }
  });

  it("uses etherscan as default for unknown ERC-20 tokens", () => {
    const result = getExplorerUrl(
      TransactionType.TOPUPCRYPTO, "LINK",
      "approved / 0xtoken123"
    );
    expect(result!.url).toContain("etherscan.io");
  });

  it("returns null when details have no slash", () => {
    expect(getExplorerUrl(TransactionType.TOPUPCRYPTO, "BTC", "approved")).toBeNull();
  });

  it("returns null when tx hash is empty", () => {
    expect(getExplorerUrl(TransactionType.TOPUPCRYPTO, "BTC", "approved / ")).toBeNull();
  });
});
