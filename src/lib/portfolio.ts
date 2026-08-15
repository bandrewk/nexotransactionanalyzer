import type { Currency } from "../types";

/** Balances below this are rounding noise, not holdings. */
const DUST_THRESHOLD = 0.001;

export type PortfolioTotal = {
  totalValue: number;
  /**
   * Symbols the user actually holds that contribute nothing to the total,
   * because they are unsupported or never received a price.
   *
   * These must be surfaced rather than dropped: an excluded holding makes the
   * total read lower than reality, and a quietly understated number is worse
   * than a visibly incomplete one.
   */
  excludedSymbols: string[];
};

/**
 * Sum the USD value of held currencies, reporting what had to be left out.
 *
 * @param minValue values at or below this are treated as unpriced
 */
export function computePortfolioTotal(
  currencies: Currency[],
  minValue = 0
): PortfolioTotal {
  let totalValue = 0;
  const excluded: string[] = [];

  for (const c of currencies) {
    const isHeld = Math.abs(c.amount) >= DUST_THRESHOLD;
    if (!isHeld) continue;

    if (c.supported && c.usdEquivalent > minValue) {
      totalValue += c.usdEquivalent;
      continue;
    }

    // Only report what is missing a PRICE. A negative position is priced fine;
    // it is excluded because this is a value total, not a net-worth figure, and
    // calling that "no price available" would be untrue.
    const hasNoPrice = !c.supported || c.usdEquivalent === 0;
    if (hasNoPrice) excluded.push(c.symbol);
  }

  return { totalValue, excludedSymbols: excluded.sort() };
}
