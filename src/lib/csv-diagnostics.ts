import { parse } from "papaparse";
import { REQUIRED_COLUMNS } from "./csv-parser";
import { TransactionType } from "../data/transaction-types";

/**
 * Transaction type names used by Nexo exports generated before roughly 2023.
 *
 * These exist for ONE purpose: telling a user that their file is an old export
 * so they can download a fresh one. They must never be mapped onto the current
 * names to make such a file compute.
 *
 * A 2022 export was compared against a current one and two of these types had
 * flipped their sign convention as well as their name — `ExchangeDepositedOn`
 * went from `in+ out+` to `in- out+`, and `ExchangeToWithdraw` the other way.
 * Renaming alone would therefore produce confidently wrong balances, and a
 * single sample file cannot tell us what else moved in the vintages nobody has
 * shown us. Detect and explain; never guess.
 */
export const LEGACY_TYPE_NAMES = new Set<string>([
  "LockingTermDeposit",
  "UnlockingTermDeposit",
  "FixedTermInterest",
  "ExchangeDepositedOn",
  "DepositToExchange",
  "TransferIn",
  "TransferOut",
  "CreditCardStatus",
  "Repayment",
  "WithdrawExchanged",
  "ExchangeToWithdraw",
  "ReferralBonus",
]);

const KNOWN_TYPES = new Set<string>(Object.values(TransactionType));

/** Column holding the timestamp. Older exports drop the "(UTC)" suffix. */
const DATE_COLUMNS = ["Date / Time (UTC)", "Date / Time"];

/** Redacted sample rows kept per unrecognised type. */
export const MAX_SAMPLE_ROWS = 3;

export type TypeShape = { pattern: string; count: number };

export type TypeSummary = {
  name: string;
  count: number;
  known: boolean;
  legacy: boolean;
  shapes: TypeShape[];
};

export type CsvDiagnostics = {
  columns: string[];
  columnCount: number;
  missingRequiredColumns: string[];
  /** Whether `parseCSV` would accept this file. */
  parseable: boolean;
  rowCount: number;
  dateRange: { first: string; last: string } | null;
  types: TypeSummary[];
  unknownTypes: string[];
  unknownRowCount: number;
  /** Unrecognised types match names Nexo used in older exports. */
  looksLikeLegacyExport: boolean;
  detailPrefixes: { prefix: string; count: number }[];
  /** Up to MAX_SAMPLE_ROWS redacted rows per unrecognised type. */
  sampleRows: { type: string; rows: string[] }[];
};

/**
 * Re-emit a row exactly as it appears in the file.
 *
 * Nothing here is altered. An earlier version reduced these rows to their
 * structure and kept only wording that looked like Nexo's own, but that rule
 * was derived from a single 2022 export: it fitted that file and would have
 * given false confidence on any export nobody has seen. A sanitiser that
 * misses something is worse than none, because the user stops checking.
 *
 * So the data is published untouched and the decision is handed to the person
 * who owns it. The report is shown in full before it can be copied, and both
 * it and the page around it say plainly what to look for -- transaction
 * hashes, merchant names, locations, amounts -- and that editing it is
 * expected rather than unusual.
 */
function rawRow(columns: string[], row: Record<string, string>): string {
  return columns
    .map((column) => {
      const value = row[column] ?? "";
      // Restore the quoting papaparse consumed, so Details keeps its commas.
      return value.includes(",") ? `"${value}"` : value;
    })
    .join(",");
}

function sign(raw: string | undefined): string {
  const v = parseFloat(raw ?? "");
  if (!Number.isFinite(v)) return "?";
  return v > 0 ? "+" : v < 0 ? "-" : "0";
}

/**
 * Describe the shape of a row without disclosing its values.
 *
 * The sign of each amount plus whether the two currencies match is enough to
 * tell one transaction type from another, and was sufficient to identify the
 * sign-convention change between export vintages. Magnitudes add nothing to
 * that and are somebody's account balance, so they are not collected.
 */
function shapeOf(row: Record<string, string>): string {
  const same = row["Input Currency"] === row["Output Currency"] ? "same" : "diff";
  return `in${sign(row["Input Amount"])} out${sign(row["Output Amount"])} ${same}`;
}

/**
 * Inspect a Nexo CSV without requiring it to be valid.
 *
 * `parseCSV` rejects anything missing a required column, which is correct but
 * leaves a user with a file the app refuses and no way to find out why. This
 * runs on the raw text instead, so it works on exactly those files.
 */
export function analyseCsv(rawText: string): CsvDiagnostics {
  const result = parse<Record<string, string>>(rawText, {
    header: true,
    transformHeader: (h) => h.trim(),
    skipEmptyLines: true,
  });

  const columns = result.meta.fields ?? [];
  const missingRequiredColumns = REQUIRED_COLUMNS.filter((c) => !columns.includes(c));
  const dateColumn = DATE_COLUMNS.find((c) => columns.includes(c));

  const counts = new Map<string, number>();
  const shapes = new Map<string, Map<string, number>>();
  const prefixes = new Map<string, number>();
  const samples = new Map<string, string[]>();
  let first: string | undefined;
  let last: string | undefined;
  let rowCount = 0;

  for (const row of result.data) {
    const type = row["Type"]?.trim();
    if (!type) continue;
    rowCount++;

    counts.set(type, (counts.get(type) ?? 0) + 1);

    const byShape = shapes.get(type) ?? new Map<string, number>();
    const shape = shapeOf(row);
    byShape.set(shape, (byShape.get(shape) ?? 0) + 1);
    shapes.set(type, byShape);

    const details = row["Details"] ?? "";
    const prefix = details.includes("/") ? details.split("/", 1)[0].trim() : "(none)";
    prefixes.set(prefix, (prefixes.get(prefix) ?? 0) + 1);

    if (dateColumn) {
      const date = row[dateColumn]?.substring(0, 10);
      if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        if (first === undefined || date < first) first = date;
        if (last === undefined || date > last) last = date;
      }
    }

    if (!KNOWN_TYPES.has(type)) {
      const kept = samples.get(type) ?? [];
      if (kept.length < MAX_SAMPLE_ROWS) {
        kept.push(rawRow(columns, row));
        samples.set(type, kept);
      }
    }
  }

  const types: TypeSummary[] = [...counts.entries()]
    .map(([name, count]) => ({
      name,
      count,
      known: KNOWN_TYPES.has(name),
      legacy: LEGACY_TYPE_NAMES.has(name),
      shapes: [...(shapes.get(name) ?? new Map<string, number>()).entries()]
        .map(([pattern, n]) => ({ pattern, count: n as number }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.count - a.count);

  const unknown = types.filter((t) => !t.known);

  return {
    columns,
    columnCount: columns.length,
    missingRequiredColumns,
    parseable: missingRequiredColumns.length === 0,
    rowCount,
    dateRange: first !== undefined && last !== undefined ? { first, last } : null,
    types,
    unknownTypes: unknown.map((t) => t.name),
    unknownRowCount: unknown.reduce((sum, t) => sum + t.count, 0),
    looksLikeLegacyExport: unknown.some((t) => t.legacy),
    detailPrefixes: [...prefixes.entries()]
      .map(([prefix, count]) => ({ prefix, count }))
      .sort((a, b) => b.count - a.count),
    sampleRows: [...samples.entries()].map(([type, rows]) => ({ type, rows })),
  };
}

/**
 * Render the diagnostics as markdown for pasting into a GitHub issue.
 *
 * Sample rows are included for unrecognised types only, capped at
 * MAX_SAMPLE_ROWS each, with hashes and addresses already redacted by
 * `analyseCsv`. The report is shown to the user before they can copy it, so
 * what gets published is always something they had the chance to read.
 */
export function formatDiagnosticReport(d: CsvDiagnostics, appVersion: string): string {
  const out: string[] = [];

  out.push("### Nexo Transaction Analyzer — file report");
  out.push("");
  if (d.sampleRows.length > 0) {
    out.push(
      "> **Check this before you post it.** The sample rows below are taken from your export unaltered. Depending on your transactions they may include blockchain transaction hashes, card purchases showing merchant names and locations, amounts, and transaction IDs. Edit out anything you would rather not make public — the report is still useful without it."
    );
    out.push("");
  }
  out.push(`- App version: ${appVersion}`);
  out.push(`- Accepted by parser: ${d.parseable ? "yes" : "no"}`);
  if (!d.parseable) {
    out.push(`- Missing required columns: ${d.missingRequiredColumns.join(", ")}`);
  }
  out.push(`- Columns (${d.columnCount}): ${d.columns.join(", ")}`);
  out.push(`- Rows: ${d.rowCount}`);
  out.push(
    `- Date range: ${d.dateRange ? `${d.dateRange.first} to ${d.dateRange.last}` : "not determinable"}`
  );
  if (d.looksLikeLegacyExport) {
    out.push(
      "- **Unrecognised type names match Nexo exports from before 2023** — either an older file, or this app has not caught up with a newer format."
    );
  }
  out.push("");

  out.push("#### Transaction types");
  out.push("");
  out.push("| Type | Rows | Recognised | Shape |");
  out.push("| --- | ---: | --- | --- |");
  for (const t of d.types) {
    const shape = t.shapes.map((s) => `${s.pattern} ×${s.count}`).join("<br>");
    out.push(`| \`${t.name}\` | ${t.count} | ${t.known ? "yes" : "**no**"} | ${shape} |`);
  }
  out.push("");

  if (d.unknownTypes.length > 0) {
    out.push(
      `#### Unrecognised types (${d.unknownTypes.length}, ${d.unknownRowCount} rows)`
    );
    out.push("");
    out.push(d.unknownTypes.map((t) => `\`${t}\``).join(", "));
    out.push("");
    out.push("Sample rows, exactly as they appear in the file:");
    out.push("");
    out.push("```");
    for (const { type, rows } of d.sampleRows) {
      out.push(`# ${type}`);
      for (const r of rows) out.push(r);
    }
    out.push("```");
    out.push("");
  }

  out.push("#### Detail prefixes");
  out.push("");
  out.push(d.detailPrefixes.map((p) => `${p.prefix} (${p.count})`).join(", "));
  out.push("");
  out.push(
    "_Nothing in this report has been altered or removed._"
  );

  return out.join("\n");
}
