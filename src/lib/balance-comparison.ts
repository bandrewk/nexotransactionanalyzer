import type { FlowTotals, TypeSummary } from "./csv-diagnostics";
import { fixFiatX } from "../data/currencies";

/** Most comparison rows a report renders. */
export const MAX_COMPARISON_ROWS = 100;
/** Most type hints listed for one asset. */
export const MAX_HINTS_PER_ASSET = 3;
/** Most hint lines a report renders in total. */
export const MAX_HINT_LINES = 30;
/** Longest asset symbol accepted from the user. */
export const MAX_SYMBOL_LENGTH = 16;

export type ParsedAmount =
  | { kind: "empty" }
  | { kind: "invalid"; reason: "format" | "ambiguous" }
  | { kind: "value"; value: number };

/**
 * Reads an amount typed by the user, with an optional leading `-`, in any form whose
 * meaning is unambiguous:
 * - `60.62`, `60,62`: a single separator is the decimal separator;
 * - `9,800.17`, `9.800,17`: with both, the last one is the decimal separator and the
 *   other groups thousands;
 * - `1,234,567`: a separator repeated in the whole part groups thousands.
 * Grouping must come in threes. A single separator followed by exactly three digits
 * after a 1–3 digit, non-zero whole part (`2,800`, `1.500`) could be either, so it is
 * rejected as ambiguous.
 */
export function parseUserAmount(text: string): ParsedAmount {
  const trimmed = text.trim();
  if (trimmed === "") return { kind: "empty" };
  const invalid: ParsedAmount = { kind: "invalid", reason: "format" };
  const signMatch = /^(-?)([\d.,]+)$/.exec(trimmed);
  if (!signMatch) return invalid;
  const [, sign, body] = signMatch;

  const lastDot = body.lastIndexOf(".");
  const lastComma = body.lastIndexOf(",");
  let whole = body;
  let fraction = "";

  if (lastDot !== -1 && lastComma !== -1) {
    const decimal = lastDot > lastComma ? "." : ",";
    const group = decimal === "." ? "," : ".";
    const at = body.lastIndexOf(decimal);
    whole = body.slice(0, at);
    fraction = body.slice(at + 1);
    if (!new RegExp(`^\\d{1,3}(?:\\${group}\\d{3})+$`).test(whole) || !/^\d+$/.test(fraction)) return invalid;
    whole = whole.split(group).join("");
  } else if (lastDot !== -1 || lastComma !== -1) {
    const separator = lastDot !== -1 ? "." : ",";
    const parts = body.split(separator);
    if (parts.length > 2) {
      if (!new RegExp(`^\\d{1,3}(?:\\${separator}\\d{3})+$`).test(body)) return invalid;
      whole = parts.join("");
    } else {
      [whole, fraction] = parts;
      if (!/^\d+$/.test(whole) || !/^\d+$/.test(fraction)) return invalid;
      if (fraction.length === 3 && /^[1-9]\d{0,2}$/.test(whole)) return { kind: "invalid", reason: "ambiguous" };
    }
  } else if (!/^\d+$/.test(body)) {
    return invalid;
  }

  const value = Number(`${sign}${whole}${fraction ? `.${fraction}` : ""}`);
  return Number.isFinite(value) ? { kind: "value", value } : invalid;
}

/**
 * The analyzer's symbol for an asset symbol typed by the user: upper case, FIATx
 * spellings folded to fiat (USDX -> USD). Credit-line units keep their lower-case x (xUSD).
 */
export function normaliseSymbol(text: string): string {
  const trimmed = text.trim().slice(0, MAX_SYMBOL_LENGTH);
  if (/^x(usd|eur|gbp)$/i.test(trimmed) || /^x[A-Z]{3}$/.test(trimmed)) {
    return `x${trimmed.slice(1).toUpperCase()}`;
  }
  return fixFiatX(trimmed.toUpperCase());
}

/** Credit-line units (xUSD, xEUR, …) are loan accounting, not holdings Nexo lists. */
export function isComparableSymbol(symbol: string): boolean {
  return !/^x[A-Z]{3}$/.test(symbol);
}

const NEXO_SPELLING: Record<string, string> = { USD: "USDx", EUR: "EURx", GBP: "GBPx" };

/**
 * Nexo shows fiat and FIATx to two decimals and truncates rather than rounds: a holding of
 * 0.00687503 EURx displays as 0.00, where rounding would give 0.01. So anything below a
 * whole cent is invisible there, and a difference that small is what the display drops, not
 * a disagreement. Reporting it as a finding sends the reader after nothing.
 */
export const NEXO_FIAT_DISPLAY_STEP = 0.01;

export function belowNexoDisplayPrecision(symbol: string, difference: number): boolean {
  if (!(symbol in NEXO_SPELLING)) return false;
  const d = Math.abs(difference);
  return d > 0 && d < NEXO_FIAT_DISPLAY_STEP;
}

/** The asset label shown to the user, with Nexo's spelling where it differs. */
export function assetLabel(symbol: string): string {
  const nexo = NEXO_SPELLING[symbol];
  return nexo ? `${symbol} (Nexo: ${nexo})` : symbol;
}

export type ComparisonRow = {
  symbol: string;
  label: string;
  analyzer: number;
  nexo: number;
  /** nexo - analyzer */
  difference: number;
  /** difference as a percentage of |nexo|; null when nexo is 0 */
  relativePercent: number | null;
};

export type ComparisonInput = { rows: ComparisonRow[]; appliedOn: string };

export function buildComparison(
  holdings: { symbol: string; amount: number }[],
  entered: { symbol: string; value: number }[]
): ComparisonRow[] {
  const bySymbol = new Map(holdings.map((h) => [h.symbol, h.amount]));
  return entered
    .filter((e) => isComparableSymbol(e.symbol))
    .map((e) => {
      const analyzer = bySymbol.get(e.symbol) ?? 0;
      const difference = e.value - analyzer;
      return {
        symbol: e.symbol,
        label: assetLabel(e.symbol),
        analyzer,
        nexo: e.value,
        difference,
        relativePercent: e.value === 0 ? null : (difference / Math.abs(e.value)) * 100,
      };
    });
}

export type TypeHint = {
  /** The type total the hint refers to, as it appears in the breakdown. */
  total: number;
  /** |the difference a match would account for - the actual difference| */
  deviation: number;
  text: string;
};

/** Below this, a difference is not worth explaining. */
const MIN_DIFFERENCE = 1e-6;

function rowsText(count: number): string {
  return `${count} row${count === 1 ? "" : "s"}`;
}

function tolerance(difference: number): number {
  return Math.max(1e-6, 0.001 * Math.abs(difference));
}

/**
 * Transaction-type totals in the row's currency that have the same size as its
 * difference (nexo - analyzer):
 * - a counted total c where -c matches: the analyzer would be closer to Nexo without it;
 * - an ignored movement m where m matches: same size, no claim that it should count;
 * - credit-line interest charges where the charge total matches.
 * Positive-only and negative-only parts are checked when a total has both signs; each
 * type and bucket contributes at most its closest match. `formatName` shortens type names.
 */
export function findTypeHints(
  row: ComparisonRow,
  types: TypeSummary[],
  formatName: (name: string) => string = (name) => name
): TypeHint[] {
  const d = row.difference;
  if (!Number.isFinite(d) || Math.abs(d) <= MIN_DIFFERENCE) return [];
  const tol = tolerance(d);
  const cur = row.symbol;
  const best = new Map<string, TypeHint>();

  const consider = (key: string, target: number, total: number, text: string) => {
    const deviation = Math.abs(target - d);
    if (!Number.isFinite(deviation) || deviation > tol) return;
    const current = best.get(key);
    if (!current || deviation < current.deviation) best.set(key, { total, deviation, text });
  };

  const parts = (flows: FlowTotals) => {
    const net = flows.posSum + flows.negSum;
    const list: { total: number; rows: number; what: string }[] = [
      { total: net, rows: flows.posCount + flows.negCount, what: "total" },
    ];
    if (flows.posCount > 0 && flows.negCount > 0) {
      list.push({ total: flows.posSum, rows: flows.posCount, what: "incoming rows" });
      list.push({ total: flows.negSum, rows: flows.negCount, what: "outgoing rows" });
    }
    return list;
  };

  for (const t of types) {
    const name = formatName(t.name);
    const counted = t.countedFlows[cur];
    if (counted) {
      for (const p of parts(counted)) {
        consider(`${t.name}::counted`, -p.total, p.total, `matches the counted \`${name}\` ${p.what} (${rowsText(p.rows)})`);
      }
    }
    const ignored = t.ignoredFlows[cur];
    if (ignored) {
      for (const p of parts(ignored)) {
        consider(`${t.name}::ignored`, p.total, p.total, `same size as the ignored \`${name}\` ${p.what} (${rowsText(p.rows)})`);
      }
    }
    const charges = t.creditLineChargeFlows[cur];
    if (charges) {
      const total = charges.posSum + charges.negSum;
      consider(
        `${t.name}::charges`,
        total,
        total,
        `same size as the credit-line interest charges (${rowsText(charges.posCount + charges.negCount)}), which are not taken from holdings`
      );
    }
  }

  return [...best.values()].sort((a, b) => a.deviation - b.deviation).slice(0, MAX_HINTS_PER_ASSET);
}
