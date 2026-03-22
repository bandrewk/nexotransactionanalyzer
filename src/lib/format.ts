/**
 * Format a number as USD string with 2 decimal places.
 */
export function formatUSD(value: number): string {
  if (!isFinite(value)) return "$0.00";
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format a crypto amount with up to 8 decimal places, trimming trailing zeros.
 */
export function formatCryptoAmount(value: number): string {
  if (!isFinite(value) || Math.abs(value) < 0.000001) return "0";
  return value.toFixed(8).replace(/\.?0+$/, "");
}

/**
 * Format a percentage with 1 decimal place.
 */
export function formatPercent(value: number): string {
  if (!isFinite(value)) return "0%";
  return `${value.toFixed(1)}%`;
}
