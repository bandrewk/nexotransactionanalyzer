import { TransactionType } from "../data/transaction-types";

const EXPLORER_MAP: Record<string, string> = {
  BTC: "https://www.blockchain.com/btc/tx/",
  XRP: "https://xrpscan.com/tx/",
  DOGE: "https://blockchair.com/dogecoin/transaction/",
  BCH: "https://blockchair.com/bitcoin-cash/transaction/",
  LTC: "https://blockchair.com/litecoin/transaction/",
  EOS: "https://bloks.io/transaction/",
  BNB: "https://binance.mintscan.io/txs/",
  XLM: "https://stellarchain.io/tx/",
  TRX: "https://tronscan.org/#/transaction/",
  ADA: "https://explorer.cardano.org/de/transaction?id=",
  DOT: "https://polkascan.io/polkadot/transaction/",
  KSM: "https://polkascan.io/kusama/transaction/",
  MATIC: "https://polygonscan.com/tx/",
  POL: "https://polygonscan.com/tx/",
  NEAR: "https://explorer.near.org/transactions/",
  SOL: "https://solscan.io/tx/",
  AVAX: "https://snowtrace.io/tx/",
  FIL: "https://filfox.info/en/message/",
  ATOM: "https://www.mintscan.io/cosmos/tx/",
  TON: "https://tonscan.org/tx/",
};

// Default for ETH and all ERC-20 tokens
const DEFAULT_EXPLORER = "https://etherscan.io/tx/";

/**
 * Get the blockchain explorer URL for a transaction hash.
 * Returns null if the transaction type doesn't have a TX hash.
 */
export function getExplorerUrl(
  type: string,
  currency: string,
  details: string
): { prefix: string; txHash: string; url: string } | null {
  if (type !== TransactionType.DEPOSIT && type !== TransactionType.TOPUPCRYPTO) {
    return null;
  }

  const slashIdx = details.indexOf("/");
  if (slashIdx === -1) return null;

  const txHash = details.substring(slashIdx + 1).trim();
  if (!txHash) return null;

  const prefix = details.substring(0, slashIdx + 2);
  const explorer = EXPLORER_MAP[currency] ?? DEFAULT_EXPLORER;

  return {
    prefix,
    txHash,
    url: `${explorer}${txHash}`,
  };
}

/**
 * Get all supported explorer currencies for testing.
 */
export function getSupportedExplorers(): Record<string, string> {
  return { ...EXPLORER_MAP };
}
