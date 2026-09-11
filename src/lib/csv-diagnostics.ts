import { parse } from "papaparse";
import { REQUIRED_COLUMNS, isNonStrictNumericCell } from "./csv-parser";
import {
  TransactionType,
  getTypeRule,
  type CurrencyClass,
} from "../data/transaction-types";
import { currencyData, fixFiatX } from "../data/currencies";
import {
  EXCLUDED_DETAIL_STATUSES,
  extractDetailStatus,
  isExcludedDetailStatus,
} from "./balance-calculator";

/**
 * Transaction type names used by Nexo exports generated before roughly 2023.
 *
 * These exist to tell a user their file is an old export so they can download a
 * fresh one. They must never be mapped onto the current names to make such a
 * file compute: two of them changed sign convention as well as name, so a rename
 * alone produces confidently wrong balances.
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

/** Sample rows kept per unrecognised type. */
export const MAX_SAMPLE_ROWS = 3;

/** Verbatim sample rows kept per unexpected (type, shape). Two is enough to show variation. */
export const MAX_UNEXPECTED_SHAPE_SAMPLE_ROWS = 2;

/** Absolute cap on sample rows kept for any single type across all shapes. */
export const MAX_SAMPLE_ROWS_PER_TYPE = 5;

/** Maximum recurring Details texts shown per unexpected shape. */
export const MAX_RECURRING_DETAILS_PER_SHAPE = 5;

/** Maximum distinct currency pairs shown per unexpected shape. */
export const MAX_CURRENCY_PAIRS_PER_SHAPE = 5;

/** Maximum unexpected shape entries rendered in the report section. */
export const MAX_UNEXPECTED_SHAPES_REPORTED = 20;

/** Maximum character length for detail text strings. */
export const MAX_DETAIL_TEXT_LENGTH = 40;

/** Maximum length for individual string values in the report (currencies, credit lines, etc.). */
export const MAX_FIELD_VALUE_LENGTH = 32;

/**
 * Maximum currency contribution entries shown per transaction type.
 *
 * Set far above the asset count of an ordinary export, so it binds only on
 * pathological or generated files.
 */
export const MAX_CONTRIBUTIONS_PER_TYPE = 100;

/** Maximum distinct Credit Line values shown in the global distribution. */
export const MAX_CREDIT_LINE_VALUES_GLOBAL = 50;

/** Maximum distinct Credit Line values shown per transaction type. */
export const MAX_CREDIT_LINE_VALUES_PER_TYPE = 25;

/** Maximum shape entries shown per transaction type in the report table. */
export const MAX_SHAPES_PER_TYPE = 20;

/** Maximum number of type entries rendered per report section. */
export const MAX_REPORT_SECTION_ENTRIES = 100;

/** Maximum number of detail prefixes shown in the report. */
export const MAX_DETAIL_PREFIXES = 50;

/**
 * Maximum overall size of the formatted diagnostic report in bytes.
 *
 * A backstop against pathological files (thousands of novel types, endless
 * distinct shapes), not a target an ordinary export approaches. The report is
 * downloaded as `nexo-ta-file-report.md` and attached to an issue, so the
 * practical ceiling is GitHub's 25 MB attachment limit.
 */
export const MAX_REPORT_SIZE_BYTES = 100 * 1024; // 100 KB

/** Allow-list of known detail status words. Anything else is bucketed as "(other)". */
export const KNOWN_DETAIL_STATUSES = new Set([
  "approved",
  "rejected",
  "pending",
  "authorized",
  "completed",
  "processed",
  "(none)",
]);

export type ValueCount = { value: string; count: number };

export type TypeShape = {
  pattern: string;
  count: number;
  expected: boolean;
  reason?: string;
  currencyReason?: boolean;
  offendingCurrency?: string;
  currencyPairs?: ValueCount[];
  firstDate?: string;
  lastDate?: string;
  recurringDetails?: ValueCount[];
  otherDetailsCount?: number;
};

export type CreditLineDiagnostics = {
  present: boolean;
  distribution: ValueCount[];
  byType: Record<string, ValueCount[]>;
};

export type TypeSummary = {
  name: string;
  count: number;
  known: boolean;
  legacy: boolean;
  handling: string;
  why?: string;
  confidence?: "observed" | "inferred";
  shapes: TypeShape[];
  creditLines: ValueCount[];
  netContributions: Record<string, number>;
};

export type IngestionDiagnostics = {
  csvRows: number;
  parsed: number;
  skippedBlankIds: number;
  firstSkippedBlankIdRow?: { rowOrdinal: number; column: string };
  unparseableNumbers: number;
  firstUnparseableNumberRow?: { rowOrdinal: number; column: string };
  invalidDates: number;
  firstInvalidDateRow?: { rowOrdinal: number; column: string };
};

export type RelationshipMatch = {
  type1: string;
  type1Rows: number;
  type2: string;
  type2Rows: number;
  matchedCount: number;
  unmatchedCount: number;
  ambiguousGroups: number;
};

export type RelationshipDiagnostics = {
  allRowsShareTimestamp: boolean;
  matches: RelationshipMatch[];
};

export type TypeFeeSummary = {
  count: number;
  total: number;
  currency: string;
  legMatch: string;
};

export type FeeCensusDiagnostics = {
  absent: number;
  zero: number;
  nonzero: number;
  invalid: number;
  byType: Record<string, TypeFeeSummary>;
};

export type StatusDiagnostics = {
  counts: Record<string, number>;
  excludedByCalculator: number;
  disagreements: number;
  disagreementTypes: string[];
};

export type DuplicateDiagnostics = {
  identicalFullRows: number;
  repeatedIds: number;
  repeatedIdsConflicting: number;
  repeatedIdsConflictingTypes: string[];
  identicalIgnoringIdRows: number;
  identicalIgnoringIdGroups: number;
};

export type TemporalTransition = {
  subgroup: string;
  type?: string;
  kind: "started" | "stopped";
  date: string;
  beforeCount: number;
  afterCount: number;
};

export type TemporalDiagnostics = {
  allRowsShareTimestamp: boolean;
  transitions: TemporalTransition[];
};

export type GrossSplit = {
  type: string;
  currency: string;
  posCount: number;
  posSum: number;
  zeroCount: number;
  negCount: number;
  negSum: number;
};

export type UsdEquivalentDiagnostics = {
  missing: number;
  malformed: number;
  conspicuousRepetition?: { value: string; count: number; percentage: number };
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
  /** Unrecognised types match names Nexo exports from before 2023. */
  looksLikeLegacyExport: boolean;
  detailPrefixes: { prefix: string; count: number }[];
  /** Up to MAX_SAMPLE_ROWS reconstructed rows per unrecognised type, plus unexpected shapes. */
  sampleRows: { type: string; rows: string[] }[];
  creditLine: CreditLineDiagnostics;
  netContributions: Record<string, Record<string, number>>;
  ingestion: IngestionDiagnostics;
  relationships: RelationshipDiagnostics;
  feeCensus: FeeCensusDiagnostics;
  status: StatusDiagnostics;
  duplicates: DuplicateDiagnostics;
  temporal: TemporalDiagnostics;
  grossSplits: GrossSplit[];
  usdEquivalent: UsdEquivalentDiagnostics;
};

const KNOWN_CURRENCIES = new Set<string>(currencyData.map((c) => c.symbol));

export type { CurrencyClass };

/**
 * Classify a currency string for diagnostic validation:
 * - normalise with FIATx rule (EURX -> EUR, GBPX -> GBP, USDX -> USD) BEFORE classifying;
 * - "credit-line" = matches /^x[A-Z]{3}$/ (xUSD observed; xEUR/xGBP plausible);
 * - "known"       = present in currencyData (115 assets);
 * - "unknown"     = anything else;
 * - treat "" and "-" as absent, not unknown.
 */
export function classifyCurrency(raw: string | undefined): CurrencyClass {
  const trimmed = (raw ?? "").trim();
  if (!trimmed || trimmed === "-") {
    return "absent";
  }
  const normalized = fixFiatX(trimmed);
  if (/^x[A-Z]{3}$/.test(normalized)) {
    return "credit-line";
  }
  if (KNOWN_CURRENCIES.has(normalized)) {
    return "known";
  }
  return "unknown";
}

/**
 * Check whether a row meets the expected shape and currency constraints for its type.
 * Returns expected: boolean, and if unexpected, a short human-readable reason under 60 chars.
 */
export function checkRowExpectation(
  type: string,
  shape: string,
  rawInputCurrency: string | undefined,
  rawOutputCurrency: string | undefined
): {
  expected: boolean;
  reason?: string;
  currencyReason?: boolean;
  offendingCurrency?: string;
} {
  const rule = getTypeRule(type);
  if (!rule) {
    return { expected: false };
  }

  const rawIc = (rawInputCurrency ?? "").trim();
  const rawOc = (rawOutputCurrency ?? "").trim();
  const icClass = classifyCurrency(rawIc);
  const ocClass = classifyCurrency(rawOc);

  const shapeMatches = rule.expectedShapes.includes(shape);
  const icUnknown = icClass === "unknown";
  const ocUnknown = ocClass === "unknown";

  let inputViolated = false;
  if (rule.expectedCurrencies?.input) {
    if (!rule.expectedCurrencies.input.includes(icClass)) {
      inputViolated = true;
    }
  }

  let outputViolated = false;
  if (rule.expectedCurrencies?.output) {
    if (!rule.expectedCurrencies.output.includes(ocClass)) {
      outputViolated = true;
    }
  }

  if (shapeMatches && !icUnknown && !ocUnknown && !inputViolated && !outputViolated) {
    return { expected: true };
  }

  let reason: string | undefined;
  let offendingCurrency: string | undefined;

  if (icUnknown && ocUnknown) {
    if (rawIc === rawOc) {
      offendingCurrency = truncateValue(rawIc, 25);
      reason = `${offendingCurrency} is not a known asset`;
    } else {
      offendingCurrency = `${truncateValue(rawIc, 15)}->${truncateValue(rawOc, 15)}`;
      reason = `${offendingCurrency} are not known assets`;
    }
  } else if (icUnknown) {
    offendingCurrency = truncateValue(rawIc, 25);
    reason = `${offendingCurrency} is not a known asset`;
  } else if (ocUnknown) {
    offendingCurrency = truncateValue(rawOc, 25);
    reason = `${offendingCurrency} is not a known asset`;
  } else if (inputViolated) {
    offendingCurrency = truncateValue(rawIc, 25);
    if (icClass === "credit-line") {
      reason = `input ${offendingCurrency} is a credit-line unit`;
    } else {
      reason = `input ${offendingCurrency} is not a credit-line unit`;
    }
  } else if (outputViolated) {
    offendingCurrency = truncateValue(rawOc, 25);
    if (ocClass === "credit-line") {
      reason = `output ${offendingCurrency} is a credit-line unit`;
    } else {
      reason = `output ${offendingCurrency} is not a credit-line unit`;
    }
  } else if (!shapeMatches) {
    reason = undefined;
  }

  const currencyReason =
    shapeMatches && (icUnknown || ocUnknown || inputViolated || outputViolated);

  return { expected: false, reason, currencyReason, offendingCurrency };
}

export function truncateValue(val: string, maxLen = MAX_FIELD_VALUE_LENGTH): string {
  if (!val) return "";
  const sanitized = val.replace(/[\r\n\t]+/g, " ").trim();
  if (sanitized.length <= maxLen) return sanitized;
  return sanitized.slice(0, maxLen) + "…";
}

/**
 * Extracts the canonical status of a row from its Details cell.
 *
 * This is the SINGLE definition of "the status of a row" across this module,
 * used consistently by:
 * 1. The Status section (status census and counts)
 * 2. The Detail-prefix extractor
 * 3. The "none beyond the status" detail remainder handling
 *
 * Rules:
 * - Empty or missing Details produces "(none)" (no status could be read).
 * - Reads the status as the leading token: before the first "/", or the whole field when no "/".
 * - If the token is a known status word (case-insensitively), that status is returned.
 * - Any leading token that is not a known status word is bucketed as "(other)"
 *   and never published verbatim.
 */
export function extractRowStatus(rawDetails: string | undefined | null): string {
  const rawStatus = extractDetailStatus(rawDetails);
  if (!rawStatus || rawStatus === "(none)") {
    return "(none)";
  }
  return KNOWN_DETAIL_STATUSES.has(rawStatus) ? rawStatus : "(other)";
}

export const getRowStatus = extractRowStatus;

/**
 * Strips the leading status word (the part before the first "/") from a Details string
 * and returns the remaining text trimmed. When there is no "/", if the field matches
 * a known status word (case-insensitively and after trimming), the whole field is the
 * status and an empty remainder is returned. Otherwise, the field is treated as free
 * text and returned trimmed.
 */
export function extractDetailRemainder(rawDetails: string | undefined | null): string {
  if (!rawDetails) return "";
  const trimmed = rawDetails.trim();
  const slashIdx = trimmed.indexOf("/");
  if (slashIdx !== -1) {
    return trimmed.slice(slashIdx + 1).trim();
  }
  const status = extractRowStatus(trimmed);
  if (status !== "(none)" && status !== "(other)") {
    return "";
  }
  return trimmed;
}

/**
 * Formats and disambiguates detail strings for display so that distinct strings whose
 * prefixes match up to maxLen characters remain distinguishable.
 * If two distinct strings produce the same standard truncation, we keep enough
 * of the differing tail so a reader is not told two different strings are the same one.
 */
export function formatDetailTexts(
  details: ValueCount[],
  maxLen = MAX_DETAIL_TEXT_LENGTH
): string[] {
  const values = details.map((d) => d.value);
  return details.map((d) => {
    const rawVal = d.value;
    const standardTrunc = truncateValue(rawVal, maxLen);
    const hasCollision = values.some(
      (other) => other !== rawVal && truncateValue(other, maxLen) === standardTrunc
    );

    if (!hasCollision) {
      return `"${standardTrunc}" ×${d.count}`;
    }

    // Disambiguate colliding values by preserving enough of the differing tail
    const sanitized = rawVal.replace(/[\r\n\t]+/g, " ").trim();
    let disambiguated = standardTrunc;

    for (let tailLen = 8; tailLen <= 14; tailLen++) {
      if (sanitized.length > tailLen + 2) {
        const headLen = maxLen - 1 - tailLen;
        const candidate = sanitized.slice(0, headLen) + "…" + sanitized.slice(-tailLen);
        const collidesWithCandidate = values.some((other) => {
          if (other === rawVal) return false;
          const otherSan = other.replace(/[\r\n\t]+/g, " ").trim();
          const otherCand =
            otherSan.length > tailLen + 2
              ? otherSan.slice(0, headLen) + "…" + otherSan.slice(-tailLen)
              : truncateValue(other, maxLen);
          return otherCand === candidate;
        });
        if (!collidesWithCandidate) {
          disambiguated = candidate;
          break;
        }
      }
    }

    if (disambiguated === standardTrunc) {
      const idx = values.indexOf(rawVal) + 1;
      const head = sanitized.slice(0, Math.max(1, maxLen - 6));
      disambiguated = `${head}…[#${idx}]`;
    }

    return `"${disambiguated}" ×${d.count}`;
  });
}

export type SampleCandidate = {
  rawRow: string;
  curPair: string;
  detailText: string;
  feePres: string;
  month: string;
  index: number;
};

/**
 * Selects up to maxSamples rows from candidates, preferring rows that differ from each other
 * across currency pair, detail text, fee presence, and month.
 */
export function selectDiverseSamples(
  candidates: SampleCandidate[],
  maxSamples: number
): string[] {
  if (candidates.length <= maxSamples) {
    return candidates.map((c) => c.rawRow);
  }

  const chosen: SampleCandidate[] = [candidates[0]];
  const chosenIndices = new Set<number>([0]);
  const seenPairs = new Set<string>([candidates[0].curPair]);
  const seenDetails = new Set<string>([candidates[0].detailText]);
  const seenFees = new Set<string>([candidates[0].feePres]);
  const seenMonths = new Set<string>([candidates[0].month]);

  while (chosen.length < maxSamples) {
    let bestIdx = -1;
    let bestNovelty = -1;

    for (let i = 0; i < candidates.length; i++) {
      if (chosenIndices.has(i)) continue;
      const c = candidates[i];
      let novelty = 0;
      if (!seenPairs.has(c.curPair)) novelty++;
      if (!seenDetails.has(c.detailText)) novelty++;
      if (!seenFees.has(c.feePres)) novelty++;
      if (!seenMonths.has(c.month)) novelty++;

      if (novelty > bestNovelty) {
        bestNovelty = novelty;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) break;

    const cand = candidates[bestIdx];
    chosen.push(cand);
    chosenIndices.add(bestIdx);
    seenPairs.add(cand.curPair);
    seenDetails.add(cand.detailText);
    seenFees.add(cand.feePres);
    seenMonths.add(cand.month);
  }

  // Preserve original file order
  chosen.sort((a, b) => a.index - b.index);
  return chosen.map((c) => c.rawRow);
}

/**
 * Round a number to 3 significant figures and format without forcing trailing decimals.
 * Small amounts (e.g. 0.00055, 1.23e-7) retain their magnitude and scientific notation,
 * while large values (e.g. 87654.32 -> 87,700) are rounded to 3 sig figs with thousands separators.
 */
export function formatSigFig(n: number): string {
  if (n === 0 || !Number.isFinite(n)) return "0";
  const val = Number(n.toPrecision(3));
  if (val === 0) return "0";
  const str = String(val);
  if (str.includes("e")) {
    return str;
  }
  const isNegative = str.startsWith("-");
  const unsignedStr = isNegative ? str.slice(1) : str;
  const [intPart, fracPart] = unsignedStr.split(".");
  const formattedInt = Number(intPart).toLocaleString("en-US");
  const formatted = fracPart !== undefined ? `${formattedInt}.${fracPart}` : formattedInt;
  return (isNegative ? "-" : "") + formatted;
}

function getHandlingInfo(typeName: string): { handling: string; why?: string } {
  const rule = getTypeRule(typeName);
  if (!rule) {
    return {
      handling: "not recognised — counted as-is",
    };
  }
  if (rule.effect === "ignore") {
    return {
      handling: "ignored",
      why: rule.why,
    };
  }
  if (rule.effect === "debit-input") {
    return {
      handling: "counted, input debited",
      why: rule.why,
    };
  }
  return {
    handling: "counted",
    why: rule.why,
  };
}

/**
 * Reconstruct a row from parsed fields.
 */
function rawRow(columns: string[], row: Record<string, string>): string {
  return columns
    .map((column) => {
      const value = row[column] ?? "";
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
 * Normalises input and output currencies with fixFiatX before comparing same/diff.
 */
export function shapeOf(row: Record<string, string>): string {
  const ic = fixFiatX((row["Input Currency"] ?? "").trim());
  const oc = fixFiatX((row["Output Currency"] ?? "").trim());
  const same = ic === oc ? "same" : "diff";
  return `in${sign(row["Input Amount"])} out${sign(row["Output Amount"])} ${same}`;
}

/**
 * Format a shape's pattern string for display in reports and tables.
 * When a shape is unexpected for a currency reason rather than a shape reason,
 * returns the shape followed by the offending currency or pair so it does not
 * duplicate the expected shape line.
 */
export function formatShapePattern(s: TypeShape): string {
  if (!s.expected && s.currencyReason) {
    const currencyOrPair =
      s.offendingCurrency ||
      (s.currencyPairs && s.currencyPairs.length > 0
        ? (s.pattern.endsWith("same")
            ? s.currencyPairs[0].value.split("->")[0]
            : s.currencyPairs[0].value)
        : undefined);
    if (currencyOrPair) {
      return `${s.pattern} (${currencyOrPair})`;
    }
  }
  return s.pattern;
}

function isRowEntirelyBlank(row: Record<string, string | undefined>): boolean {
  return Object.values(row).every((val) => val === undefined || val.trim() === "");
}

export function isExceptionalType(t: TypeSummary): boolean {
  if (!t.known) return true;
  if (t.confidence === "inferred") return true;
  if (t.shapes.some((s) => !s.expected)) return true;
  return false;
}

/**
 * Inspect a Nexo CSV without requiring it to be valid.
 *
 * Runs on the raw text, so it also works on a file `parseCSV` refuses. Covers
 * ingestion, relationships, fees, exclusions, duplicates, temporal transitions,
 * gross flows and shapes.
 */
export function analyseCsv(rawText: string): CsvDiagnostics {
  const result = parse<Record<string, string>>(rawText, {
    header: true,
    transformHeader: (h) => h.trim(),
    skipEmptyLines: "greedy",
  });

  const columns = result.meta.fields ?? [];
  const hasCreditLine = columns.includes("Credit Line");
  const missingRequiredColumns = REQUIRED_COLUMNS.filter((c) => !columns.includes(c));
  const dateColumn = DATE_COLUMNS.find((c) => columns.includes(c));

  const counts = new Map<string, number>();
  const shapes = new Map<string, Map<string, TypeShape>>();
  const prefixes = new Map<string, number>();

  const unexpectedDetails = new Map<string, Map<string, number>>();
  const unexpectedCurrencyPairs = new Map<string, Map<string, number>>();
  const unexpectedDates = new Map<string, { first: string; last: string }>();
  const sampleCandidates = new Map<string, SampleCandidate[]>();
  const candidateKeysSeen = new Map<string, Set<string>>();

  const globalCreditLineCounts = new Map<string, number>();
  const creditLineByTypeCounts = new Map<string, Map<string, number>>();

  const netContributionsMap = new Map<string, Map<string, number>>();

  // Ingestion metrics
  let csvRows = 0;
  let skippedBlankIds = 0;
  let firstSkippedBlankIdRow: { rowOrdinal: number; column: string } | undefined;
  let unparseableNumbers = 0;
  let firstUnparseableNumberRow: { rowOrdinal: number; column: string } | undefined;
  let invalidDates = 0;
  let firstInvalidDateRow: { rowOrdinal: number; column: string } | undefined;

  // Status metrics
  const statusCounts = new Map<string, number>();
  let excludedByCalculator = 0;
  let statusDisagreements = 0;
  const statusDisagreementTypes = new Set<string>();

  // Fee metrics
  let feeAbsent = 0;
  let feeZero = 0;
  let feeNonzero = 0;
  let feeInvalid = 0;
  const feesByType = new Map<
    string,
    { count: number; total: number; currency: string; legsMatch: Set<string> }
  >();

  // Duplicates tracking
  const fullRowCounts = new Map<string, number>();
  const idToRows = new Map<
    string,
    { type: string; rowWithoutId: string }[]
  >();
  const contentToIds = new Map<string, Set<string>>();

  // Relationship and temporal tracking
  const allTimestamps = new Set<string>();
  const rowsForRelations: {
    index: number;
    type: string;
    timestamp: string;
    amounts: number[];
  }[] = [];

  // Temporal subgroup tracking
  type SubgroupRow = {
    index: number;
    date: string;
    subgroup: string;
    type: string;
  };
  const temporalRows: SubgroupRow[] = [];

  // Gross vs net tracking: (type, currency) -> FlowRecord
  type FlowRecord = {
    posCount: number;
    posSum: number;
    zeroCount: number;
    negCount: number;
    negSum: number;
  };
  const flowMap = new Map<string, FlowRecord>();

  // USD Equivalent tracking
  let usdMissing = 0;
  let usdMalformed = 0;
  const usdValueCounts = new Map<string, number>();

  let first: string | undefined;
  let last: string | undefined;
  let dataRowOrdinal = 0;

  for (const row of result.data) {
    if (isRowEntirelyBlank(row)) continue;
    dataRowOrdinal++;
    csvRows++;

    const txId = row["Transaction"]?.trim();
    if (!txId) {
      skippedBlankIds++;
      if (!firstSkippedBlankIdRow) {
        firstSkippedBlankIdRow = { rowOrdinal: dataRowOrdinal, column: "Transaction" };
      }
    }

    // Ingestion checks: numeric cells
    const numericCols = ["Input Amount", "Output Amount", "USD Equivalent", "Fee"];
    for (const col of numericCols) {
      if (columns.includes(col)) {
        if (isNonStrictNumericCell(row[col], col === "USD Equivalent")) {
          unparseableNumbers++;
          if (!firstUnparseableNumberRow) {
            firstUnparseableNumberRow = { rowOrdinal: dataRowOrdinal, column: col };
          }
        }
      }
    }

    // Ingestion checks: date
    let rawDate: string | undefined;
    let validRowDate = false;
    if (dateColumn) {
      rawDate = row[dateColumn]?.trim();
      if (
        rawDate &&
        /^\d{4}-\d{2}-\d{2}/.test(rawDate) &&
        !isNaN(Date.parse(rawDate.replace(" ", "T")))
      ) {
        validRowDate = true;
        allTimestamps.add(rawDate);
        const day = rawDate.substring(0, 10);
        if (first === undefined || day < first) first = day;
        if (last === undefined || day > last) last = day;
      } else {
        invalidDates++;
        if (!firstInvalidDateRow) {
          firstInvalidDateRow = { rowOrdinal: dataRowOrdinal, column: dateColumn };
        }
      }
    }

    const type = row["Type"]?.trim() || "(empty)";
    counts.set(type, (counts.get(type) ?? 0) + 1);

    const shape = shapeOf(row);
    const {
      expected: isRowExpected,
      reason: unexpectedReason,
      currencyReason: isCurrencyReason,
      offendingCurrency,
    } = checkRowExpectation(
      type,
      shape,
      row["Input Currency"],
      row["Output Currency"]
    );

    const byShape = shapes.get(type) ?? new Map<string, TypeShape>();
    const shapeGroupKey = isRowExpected
      ? `${shape}::expected`
      : `${shape}::unexpected::${unexpectedReason ?? ""}`;
    const existingShape = byShape.get(shapeGroupKey);
    if (existingShape) {
      existingShape.count++;
    } else {
      byShape.set(shapeGroupKey, {
        pattern: shape,
        count: 1,
        expected: isRowExpected,
        reason: unexpectedReason,
        currencyReason: isCurrencyReason,
        offendingCurrency,
      });
    }
    shapes.set(type, byShape);

    // Track evidence and sample candidates for unexpected shapes (and unknown types)
    if (!isRowExpected) {
      const shapeFullKey = `${type}::${shapeGroupKey}`;

      // Detail remainder
      const detailRemainder = extractDetailRemainder(row["Details"]);
      if (detailRemainder.length > 0) {
        const detailMap = unexpectedDetails.get(shapeFullKey) ?? new Map<string, number>();
        detailMap.set(detailRemainder, (detailMap.get(detailRemainder) ?? 0) + 1);
        unexpectedDetails.set(shapeFullKey, detailMap);
      }

      // Normalised currency pair
      const icTrimmed = (row["Input Currency"] ?? "").trim();
      const ocTrimmed = (row["Output Currency"] ?? "").trim();
      const normIc = icTrimmed && icTrimmed !== "-" ? fixFiatX(icTrimmed) : "-";
      const normOc = ocTrimmed && ocTrimmed !== "-" ? fixFiatX(ocTrimmed) : "-";
      const curPair = `${normIc}->${normOc}`;

      const pairMap = unexpectedCurrencyPairs.get(shapeFullKey) ?? new Map<string, number>();
      pairMap.set(curPair, (pairMap.get(curPair) ?? 0) + 1);
      unexpectedCurrencyPairs.set(shapeFullKey, pairMap);

      // Date range
      if (validRowDate && rawDate) {
        const day = rawDate.substring(0, 10);
        const curDates = unexpectedDates.get(shapeFullKey) ?? { first: day, last: day };
        if (day < curDates.first) curDates.first = day;
        if (day > curDates.last) curDates.last = day;
        unexpectedDates.set(shapeFullKey, curDates);
      }

      // Sample candidates
      const rawFee = row["Fee"]?.trim();
      const feePres =
        !rawFee || rawFee === "-"
          ? "fee-none"
          : parseFloat(rawFee) === 0
            ? "fee-zero"
            : "fee-nonzero";
      const month = validRowDate && rawDate ? rawDate.substring(0, 7) : "";
      const candidateKey = `${curPair}::${detailRemainder}::${feePres}::${month}`;

      const seenCandKeys = candidateKeysSeen.get(shapeFullKey) ?? new Set<string>();
      const candidates = sampleCandidates.get(shapeFullKey) ?? [];

      if (!seenCandKeys.has(candidateKey)) {
        seenCandKeys.add(candidateKey);
        candidateKeysSeen.set(shapeFullKey, seenCandKeys);
        if (candidates.length < 50) {
          candidates.push({
            rawRow: rawRow(columns, row),
            curPair,
            detailText: detailRemainder,
            feePres,
            month,
            index: dataRowOrdinal,
          });
        }
        sampleCandidates.set(shapeFullKey, candidates);
      } else if (candidates.length < Math.max(MAX_SAMPLE_ROWS, MAX_UNEXPECTED_SHAPE_SAMPLE_ROWS)) {
        candidates.push({
          rawRow: rawRow(columns, row),
          curPair,
          detailText: detailRemainder,
          feePres,
          month,
          index: dataRowOrdinal,
        });
        sampleCandidates.set(shapeFullKey, candidates);
      }
    }

    // Detail prefix and status analysis
    const details = row["Details"] ?? "";
    const rowStatus = extractRowStatus(details);

    prefixes.set(rowStatus, (prefixes.get(rowStatus) ?? 0) + 1);
    statusCounts.set(rowStatus, (statusCounts.get(rowStatus) ?? 0) + 1);

    // Excluded by calculator
    const isExcluded = isExcludedDetailStatus(details);
    if (isExcluded) {
      excludedByCalculator++;
    }

    // Status disagreement check: leading status implies failure but included, or vice versa
    const rawLeadingStatus = extractDetailStatus(details);
    const isLeadingExcluded =
      EXCLUDED_DETAIL_STATUSES.has(rawLeadingStatus) ||
      ["cancelled", "failed", "declined", "reversed"].includes(rawLeadingStatus);
    const isLeadingApproved = ["approved", "authorized", "completed", "processed"].includes(
      rawLeadingStatus
    );
    if ((isLeadingExcluded && !isExcluded) || (isLeadingApproved && isExcluded)) {
      statusDisagreements++;
      statusDisagreementTypes.add(type);
    }

    // Fee census
    if (columns.includes("Fee")) {
      const rawFee = row["Fee"]?.trim();
      const rawFeeCur = row["Fee Currency"]?.trim();
      if (!rawFee || rawFee === "-") {
        feeAbsent++;
      } else {
        const feeVal = parseFloat(rawFee);
        if (!Number.isFinite(feeVal)) {
          feeInvalid++;
        } else if (feeVal === 0) {
          feeZero++;
        } else {
          feeNonzero++;
          const curFee = feesByType.get(type) ?? {
            count: 0,
            total: 0,
            currency: rawFeeCur || "",
            legsMatch: new Set<string>(),
          };
          curFee.count++;
          curFee.total += feeVal;
          if (!curFee.currency && rawFeeCur) curFee.currency = rawFeeCur;
          const ic = fixFiatX(row["Input Currency"]?.trim() || "-");
          const oc = fixFiatX(row["Output Currency"]?.trim() || "-");
          const normFeeCur = fixFiatX(rawFeeCur || "-");
          const matchIn = normFeeCur === ic && ic !== "-";
          const matchOut = normFeeCur === oc && oc !== "-";
          if (matchIn && matchOut) curFee.legsMatch.add("matches both legs");
          else if (matchIn) curFee.legsMatch.add("matches input leg");
          else if (matchOut) curFee.legsMatch.add("matches output leg");
          else curFee.legsMatch.add("matches neither leg");
          feesByType.set(type, curFee);
        }
      }
    }

    // Credit Line
    let clVal = "(empty)";
    if (hasCreditLine) {
      const rawCl = row["Credit Line"];
      clVal = !rawCl || rawCl.trim() === "" ? "(empty)" : rawCl.trim();
      globalCreditLineCounts.set(clVal, (globalCreditLineCounts.get(clVal) ?? 0) + 1);

      const typeCl = creditLineByTypeCounts.get(type) ?? new Map<string, number>();
      typeCl.set(clVal, (typeCl.get(clVal) ?? 0) + 1);
      creditLineByTypeCounts.set(type, typeCl);
    }

    // USD Equivalent anomalies
    const rawUsd = row["USD Equivalent"]?.trim();
    if (!rawUsd || rawUsd === "-") {
      usdMissing++;
    } else {
      if (isNonStrictNumericCell(rawUsd, true)) {
        usdMalformed++;
      } else {
        usdValueCounts.set(rawUsd, (usdValueCounts.get(rawUsd) ?? 0) + 1);
      }
    }

    // Duplicates tracking
    const fullRowStr = rawRow(columns, row);
    fullRowCounts.set(fullRowStr, (fullRowCounts.get(fullRowStr) ?? 0) + 1);

    const nonIdCols = columns.filter((c) => c !== "Transaction");
    const contentWithoutId = rawRow(nonIdCols, row);

    if (txId) {
      const existingRows = idToRows.get(txId) ?? [];
      existingRows.push({ type, rowWithoutId: contentWithoutId });
      idToRows.set(txId, existingRows);
    }

    const idsWithContent = contentToIds.get(contentWithoutId) ?? new Set<string>();
    if (txId) idsWithContent.add(txId);
    contentToIds.set(contentWithoutId, idsWithContent);

    // Relationships gathering (unrounded positive amounts)
    if (rawDate) {
      const rowAmts = new Set<number>();
      const iaStr = row["Input Amount"]?.trim();
      const oaStr = row["Output Amount"]?.trim();
      const ia = iaStr && iaStr !== "-" ? Math.abs(parseFloat(iaStr)) : NaN;
      const oa = oaStr && oaStr !== "-" ? Math.abs(parseFloat(oaStr)) : NaN;
      if (Number.isFinite(ia) && ia > 1e-8) rowAmts.add(ia);
      if (Number.isFinite(oa) && oa > 1e-8) rowAmts.add(oa);

      if (rowAmts.size > 0) {
        rowsForRelations.push({
          index: dataRowOrdinal,
          type,
          timestamp: rawDate,
          amounts: Array.from(rowAmts),
        });
      }
    }

    // Temporal transition rows
    if (validRowDate && rawDate) {
      temporalRows.push({
        index: dataRowOrdinal,
        date: rawDate.substring(0, 10),
        subgroup: `${type} (${shape})`,
        type,
      });
      if (hasCreditLine && clVal !== "(empty)") {
        temporalRows.push({
          index: dataRowOrdinal,
          date: rawDate.substring(0, 10),
          subgroup: `Credit Line "${clVal}"`,
          type,
        });
      }
    }

    // Net contributions & Gross flows (calculator excludes blank IDs and excluded statuses)
    if (txId && !isExcluded) {
      const rule = getTypeRule(type);
      const effect = rule?.effect ?? "generic";

      const typeContr = netContributionsMap.get(type) ?? new Map<string, number>();

      const recordFlow = (cur: string, delta: number) => {
        const key = `${type}::${cur}`;
        const rec = flowMap.get(key) ?? {
          posCount: 0,
          posSum: 0,
          zeroCount: 0,
          negCount: 0,
          negSum: 0,
        };
        if (delta > 1e-12) {
          rec.posCount++;
          rec.posSum += delta;
        } else if (delta < -1e-12) {
          rec.negCount++;
          rec.negSum += delta;
        } else {
          rec.zeroCount++;
        }
        flowMap.set(key, rec);
      };

      if (effect === "generic" || effect === "ignore") {
        const ic = fixFiatX(row["Input Currency"]?.trim() || "-");
        const oc = fixFiatX(row["Output Currency"]?.trim() || "-");
        const ia = parseFloat(row["Input Amount"] ?? "0");
        const oa = parseFloat(row["Output Amount"] ?? "0");

        if (ic && ic !== "-" && Number.isFinite(ia)) {
          typeContr.set(ic, (typeContr.get(ic) ?? 0) + ia);
          recordFlow(ic, ia);
        }
        if (oc && oc !== "-" && oc !== ic && Number.isFinite(oa)) {
          typeContr.set(oc, (typeContr.get(oc) ?? 0) + oa);
          recordFlow(oc, oa);
        }
      } else if (effect === "debit-input") {
        const ic = fixFiatX(row["Input Currency"]?.trim() || "-");
        const ia = parseFloat(row["Input Amount"] ?? "0");
        if (ic && ic !== "-" && Number.isFinite(ia)) {
          const delta = -Math.abs(ia);
          typeContr.set(ic, (typeContr.get(ic) ?? 0) + delta);
          recordFlow(ic, delta);
        }
      }
      netContributionsMap.set(type, typeContr);
    }

  }

  // Finalize types summaries with exceptional types sorted first
  const types: TypeSummary[] = [...counts.entries()].map(([name, count]) => {
    const { handling, why } = getHandlingInfo(name);
    const rule = getTypeRule(name);

    const typeContrMap = netContributionsMap.get(name) ?? new Map<string, number>();
    const netContributions: Record<string, number> = Object.create(null);
    for (const [cur, amt] of typeContrMap.entries()) {
      const rounded = Math.abs(amt) < 1e-12 ? 0 : amt;
      if (rounded !== 0) {
        netContributions[cur] = rounded;
      }
    }

    const typeClMap = creditLineByTypeCounts.get(name) ?? new Map<string, number>();
    const creditLines: ValueCount[] = [...typeClMap.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);

    const byShapeMap = shapes.get(name) ?? new Map<string, TypeShape>();
    const typeTotalRows = count;
    const recurringThreshold = Math.max(2, Math.min(10, Math.ceil(typeTotalRows * 0.01)));

    const finalizedShapes: TypeShape[] = [];
    for (const [shapeKey, shapeObj] of byShapeMap.entries()) {
      if (!shapeObj.expected) {
        const shapeFullKey = `${name}::${shapeKey}`;

        // Currency pairs
        const pairMap = unexpectedCurrencyPairs.get(shapeFullKey);
        let currencyPairs: ValueCount[] | undefined;
        if (pairMap && pairMap.size > 0) {
          currencyPairs = [...pairMap.entries()]
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
        }

        // Dates
        const dateObj = unexpectedDates.get(shapeFullKey);

        // Recurring details with guarded cardinality:
        // Ensures no Details text that appears in only one row is published in the summary.
        const detailMap = unexpectedDetails.get(shapeFullKey);
        const recurringDetails: ValueCount[] = [];
        let otherDetailsCount = 0;
        if (detailMap && detailMap.size > 0) {
          const distinctCount = detailMap.size;
          const shapeRowCount = shapeObj.count;
          const allAppearMoreThanOnce = [...detailMap.values()].every((c) => c > 1);

          if (distinctCount <= 5 && shapeRowCount >= 10 && allAppearMoreThanOnce) {
            // publish-all
            for (const [text, count] of detailMap.entries()) {
              recurringDetails.push({ value: text, count });
            }
            recurringDetails.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
            otherDetailsCount = 0;
          } else {
            // fallback to today's frequency rule
            for (const [text, count] of detailMap.entries()) {
              if (count >= recurringThreshold) {
                recurringDetails.push({ value: text, count });
              }
            }
            recurringDetails.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
            otherDetailsCount = distinctCount - recurringDetails.length;
          }
        }

        finalizedShapes.push({
          ...shapeObj,
          currencyPairs,
          firstDate: dateObj?.first,
          lastDate: dateObj?.last,
          recurringDetails,
          otherDetailsCount,
        });
      } else {
        finalizedShapes.push(shapeObj);
      }
    }

    return {
      name,
      count,
      known: KNOWN_TYPES.has(name),
      legacy: LEGACY_TYPE_NAMES.has(name),
      handling,
      why,
      confidence: rule?.confidence,
      shapes: finalizedShapes.sort(
        (a, b) =>
          b.count - a.count ||
          a.pattern.localeCompare(b.pattern) ||
          (a.expected === b.expected ? 0 : a.expected ? -1 : 1)
      ),
      creditLines,
      netContributions,
    };
  });

  // Sort exceptional types first, not by frequency
  types.sort((a, b) => {
    const aExc = isExceptionalType(a);
    const bExc = isExceptionalType(b);
    if (aExc && !bExc) return -1;
    if (!aExc && bExc) return 1;
    return b.count - a.count || a.name.localeCompare(b.name);
  });

  // Collect diverse sample rows per type across shapes
  const samples = new Map<string, string[]>();
  for (const t of types) {
    const typeCandRows: string[] = [];
    const isKnown = t.known;

    for (const s of t.shapes) {
      if (!s.expected) {
        const shapeGroupKey = `${s.pattern}::unexpected::${s.reason ?? ""}`;
        const shapeFullKey = `${t.name}::${shapeGroupKey}`;
        const candidates = sampleCandidates.get(shapeFullKey) ?? [];
        if (candidates.length > 0) {
          const maxShapeSamples = isKnown
            ? MAX_UNEXPECTED_SHAPE_SAMPLE_ROWS
            : MAX_SAMPLE_ROWS;
          const chosen = selectDiverseSamples(candidates, maxShapeSamples);
          for (const r of chosen) {
            if (!typeCandRows.includes(r)) {
              typeCandRows.push(r);
            }
          }
        }
      }
    }

    if (typeCandRows.length > 0) {
      samples.set(t.name, typeCandRows.slice(0, MAX_SAMPLE_ROWS_PER_TYPE));
    }
  }

  const unknown = types.filter((t) => !t.known);

  // Ingestion summary
  const parsed =
    missingRequiredColumns.length === 0 ? Math.max(0, csvRows - skippedBlankIds) : 0;
  const ingestion: IngestionDiagnostics = {
    csvRows,
    parsed,
    skippedBlankIds,
    firstSkippedBlankIdRow,
    unparseableNumbers,
    firstUnparseableNumberRow,
    invalidDates,
    firstInvalidDateRow,
  };

  // Relationship detection
  const allRowsShareTimestamp = allTimestamps.size <= 1;
  const relationshipMatches: RelationshipMatch[] = [];

  if (!allRowsShareTimestamp && rowsForRelations.length > 0) {
    const groupKeyMap = new Map<string, { type: string; rowIndex: number }[]>();
    for (const r of rowsForRelations) {
      for (const amt of r.amounts) {
        const key = `${r.timestamp}::${amt}`;
        const list = groupKeyMap.get(key) ?? [];
        list.push({ type: r.type, rowIndex: r.index });
        groupKeyMap.set(key, list);
      }
    }

    const typePairsSeen = new Set<string>();
    for (const group of groupKeyMap.values()) {
      const distinctTypesInGroup = Array.from(new Set(group.map((g) => g.type)));
      if (distinctTypesInGroup.length >= 2) {
        for (let i = 0; i < distinctTypesInGroup.length; i++) {
          for (let j = i + 1; j < distinctTypesInGroup.length; j++) {
            const pairKey = [distinctTypesInGroup[i], distinctTypesInGroup[j]].sort().join("::");
            typePairsSeen.add(pairKey);
          }
        }
      }
    }

    for (const pairKey of typePairsSeen) {
      const [p1, p2] = pairKey.split("::");
      const nP1 = counts.get(p1) ?? 0;
      const nP2 = counts.get(p2) ?? 0;
      const [t1, t2, n1, n2] = nP1 >= nP2 ? [p1, p2, nP1, nP2] : [p2, p1, nP2, nP1];

      const matchedRowsT1 = new Set<number>();
      const matchedRowsT2 = new Set<number>();
      let ambiguousGroups = 0;

      for (const group of groupKeyMap.values()) {
        const t1s = group.filter((g) => g.type === t1);
        const t2s = group.filter((g) => g.type === t2);
        if (t1s.length > 0 && t2s.length > 0) {
          if (t1s.length === 1 && t2s.length === 1) {
            matchedRowsT1.add(t1s[0].rowIndex);
            matchedRowsT2.add(t2s[0].rowIndex);
          } else {
            ambiguousGroups++;
            const matchCount = Math.min(t1s.length, t2s.length);
            for (let k = 0; k < matchCount; k++) {
              matchedRowsT1.add(t1s[k].rowIndex);
              matchedRowsT2.add(t2s[k].rowIndex);
            }
          }
        }
      }

      const matchedCount = Math.min(matchedRowsT2.size, n2);
      const unmatchedCount = n1 - matchedCount;
      const isSignal = matchedCount >= 2 || (matchedCount === 1 && Math.min(n1, n2) <= 2);

      if (isSignal) {
        relationshipMatches.push({
          type1: t1,
          type1Rows: n1,
          type2: t2,
          type2Rows: n2,
          matchedCount,
          unmatchedCount,
          ambiguousGroups,
        });
      }
    }

    relationshipMatches.sort((a, b) => b.matchedCount - a.matchedCount);
  }

  const relationships: RelationshipDiagnostics = {
    allRowsShareTimestamp,
    matches: relationshipMatches,
  };

  // Fee census summary
  const feeByTypeRecord: Record<string, TypeFeeSummary> = Object.create(null);
  for (const [tName, f] of feesByType.entries()) {
    let legMatch = "matches neither leg";
    if (f.legsMatch.has("matches both legs")) legMatch = "matches both legs";
    else if (f.legsMatch.has("matches output leg")) legMatch = "matches output leg";
    else if (f.legsMatch.has("matches input leg")) legMatch = "matches input leg";

    feeByTypeRecord[tName] = {
      count: f.count,
      total: f.total,
      currency: f.currency,
      legMatch,
    };
  }

  const feeCensus: FeeCensusDiagnostics = {
    absent: feeAbsent,
    zero: feeZero,
    nonzero: feeNonzero,
    invalid: feeInvalid,
    byType: feeByTypeRecord,
  };

  // Status diagnostics
  const statusCountsRecord: Record<string, number> = Object.create(null);
  for (const [st, cnt] of statusCounts.entries()) {
    statusCountsRecord[st] = cnt;
  }
  const status: StatusDiagnostics = {
    counts: statusCountsRecord,
    excludedByCalculator,
    disagreements: statusDisagreements,
    disagreementTypes: Array.from(statusDisagreementTypes),
  };

  // Duplicates diagnostics
  let identicalFullRows = 0;
  for (const cnt of fullRowCounts.values()) {
    if (cnt > 1) identicalFullRows += cnt - 1;
  }

  let repeatedIds = 0;
  let repeatedIdsConflicting = 0;
  const conflictingTypes = new Set<string>();
  for (const rows of idToRows.values()) {
    if (rows.length > 1) {
      repeatedIds += rows.length - 1;
      const firstRow = rows[0].rowWithoutId;
      const hasConflict = rows.some((r) => r.rowWithoutId !== firstRow);
      if (hasConflict) {
        repeatedIdsConflicting += rows.length - 1;
        for (const r of rows) conflictingTypes.add(r.type);
      }
    }
  }

  let identicalIgnoringIdRows = 0;
  let identicalIgnoringIdGroups = 0;
  for (const ids of contentToIds.values()) {
    if (ids.size > 1) {
      identicalIgnoringIdGroups++;
      identicalIgnoringIdRows += ids.size;
    }
  }

  const duplicates: DuplicateDiagnostics = {
    identicalFullRows,
    repeatedIds,
    repeatedIdsConflicting,
    repeatedIdsConflictingTypes: Array.from(conflictingTypes),
    identicalIgnoringIdRows,
    identicalIgnoringIdGroups,
  };

  // Temporal transitions
  const transitions: TemporalTransition[] = [];
  if (!allRowsShareTimestamp && temporalRows.length >= 10) {
    const subgroupMap = new Map<string, SubgroupRow[]>();
    for (const tr of temporalRows) {
      const list = subgroupMap.get(tr.subgroup) ?? [];
      list.push(tr);
      subgroupMap.set(tr.subgroup, list);
    }

    const totalT = temporalRows.length;
    for (const [subgroupName, rows] of subgroupMap.entries()) {
      if (rows.length < 5) continue;
      const firstIdx = rows[0].index;
      const lastIdx = rows[rows.length - 1].index;

      if (firstIdx > 15 && firstIdx > totalT * 0.1) {
        transitions.push({
          subgroup: subgroupName,
          type: rows[0].type,
          kind: "started",
          date: rows[0].date,
          beforeCount: 0,
          afterCount: rows.length,
        });
      } else if (lastIdx < totalT - 15 && lastIdx < totalT * 0.9) {
        transitions.push({
          subgroup: subgroupName,
          type: rows[0].type,
          kind: "stopped",
          date: rows[rows.length - 1].date,
          beforeCount: rows.length,
          afterCount: 0,
        });
      }
      if (transitions.length >= 5) break;
    }
  }

  const temporal: TemporalDiagnostics = {
    allRowsShareTimestamp,
    transitions,
  };

  // Gross vs net flows
  const grossSplits: GrossSplit[] = [];
  for (const [key, flow] of flowMap.entries()) {
    const [tName, cur] = key.split("::");
    const isCancelation = flow.posCount > 0 && flow.negCount > 0;
    const isNegativeInterest = tName.toLowerCase().includes("interest") && flow.negCount > 0;
    if (isCancelation || isNegativeInterest) {
      grossSplits.push({
        type: tName,
        currency: cur,
        posCount: flow.posCount,
        posSum: flow.posSum,
        zeroCount: flow.zeroCount,
        negCount: flow.negCount,
        negSum: flow.negSum,
      });
    }
  }
  grossSplits.sort((a, b) => b.negCount - a.negCount);

  // USD Equivalent anomalies
  let conspicuousRepetition:
    | { value: string; count: number; percentage: number }
    | undefined;
  if (csvRows >= 10) {
    for (const [val, cnt] of usdValueCounts.entries()) {
      const pct = Math.round((cnt / csvRows) * 100);
      if (pct >= 50 && cnt >= 10) {
        conspicuousRepetition = { value: val, count: cnt, percentage: pct };
        break;
      }
    }
  }

  const usdEquivalent: UsdEquivalentDiagnostics = {
    missing: usdMissing,
    malformed: usdMalformed,
    conspicuousRepetition,
  };

  const globalCreditDistribution: ValueCount[] = [...globalCreditLineCounts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);

  const creditLineByType: Record<string, ValueCount[]> = Object.create(null);
  for (const t of types) {
    if (t.creditLines.length > 0) {
      creditLineByType[t.name] = t.creditLines;
    }
  }

  const allNetContributions: Record<string, Record<string, number>> = Object.create(null);
  for (const t of types) {
    allNetContributions[t.name] = t.netContributions;
  }

  const creditLine: CreditLineDiagnostics = {
    present: hasCreditLine,
    distribution: globalCreditDistribution,
    byType: creditLineByType,
  };

  return {
    columns,
    columnCount: columns.length,
    missingRequiredColumns,
    parseable: missingRequiredColumns.length === 0,
    rowCount: csvRows,
    dateRange: first !== undefined && last !== undefined ? { first, last } : null,
    types,
    unknownTypes: unknown.map((t) => t.name),
    unknownRowCount: unknown.reduce((sum, t) => sum + t.count, 0),
    looksLikeLegacyExport: unknown.some((t) => t.legacy),
    detailPrefixes: [...prefixes.entries()]
      .map(([prefix, count]) => ({ prefix, count }))
      .sort((a, b) => b.count - a.count),
    sampleRows: [...samples.entries()].map(([type, rows]) => ({ type, rows })),
    creditLine,
    netContributions: allNetContributions,
    ingestion,
    relationships,
    feeCensus,
    status,
    duplicates,
    temporal,
    grossSplits,
    usdEquivalent,
  };
}

export function hasValueBearingContent(d: CsvDiagnostics): boolean {
  if (d.sampleRows && d.sampleRows.length > 0) {
    return true;
  }
  if (
    d.types &&
    d.types.some((t) =>
      t.shapes.some(
        (s) => !s.expected && s.recurringDetails && s.recurringDetails.length > 0
      )
    )
  ) {
    return true;
  }
  if (d.types && d.types.some((t) => Object.keys(t.netContributions).length > 0)) {
    return true;
  }
  if (d.netContributions) {
    for (const typeName of Object.keys(d.netContributions)) {
      const curMap = d.netContributions[typeName];
      if (curMap && Object.keys(curMap).length > 0) {
        return true;
      }
    }
  }
  if (d.creditLine?.present && d.creditLine.distribution) {
    const hasCreditLineValues = d.creditLine.distribution.some(
      (v) => v.value !== "(empty)" && v.count > 0
    );
    if (hasCreditLineValues) {
      return true;
    }
  }
  if (d.feeCensus && d.feeCensus.nonzero > 0) {
    return true;
  }
  return false;
}

export function formatCreditLineSummary(
  d: CsvDiagnostics,
  omissions?: string[]
): string | null {
  if (!d.creditLine?.present) {
    return null;
  }

  const nonEmptyDist = d.creditLine.distribution.filter(
    (v) => v.value !== "(empty)" && v.value.trim() !== "" && v.count > 0
  );

  if (nonEmptyDist.length === 0) {
    return null;
  }

  const emptyEntry = d.creditLine.distribution.find(
    (v) => v.value === "(empty)" || v.value.trim() === ""
  );
  const emptyCount = emptyEntry ? emptyEntry.count : 0;

  const typeTotalCounts = new Map<string, number>();
  for (const t of d.types) {
    typeTotalCounts.set(t.name, t.count);
  }

  const displayedDist = nonEmptyDist.slice(0, MAX_CREDIT_LINE_VALUES_GLOBAL);
  const hadCappedClValues = nonEmptyDist.length > MAX_CREDIT_LINE_VALUES_GLOBAL;
  let hadCappedClPerType = false;

  const valGroups: string[] = [];

  for (const valItem of displayedDist) {
    const clVal = valItem.value;
    const typeEntries: { name: string; count: number; total: number }[] = [];

    for (const [typeName, counts] of Object.entries(d.creditLine.byType)) {
      const match = counts.find((c) => c.value === clVal);
      if (match && match.count > 0) {
        const total = typeTotalCounts.get(typeName) ?? match.count;
        typeEntries.push({
          name: typeName,
          count: match.count,
          total,
        });
      }
    }

    typeEntries.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const displayedTypes = typeEntries.slice(0, MAX_CREDIT_LINE_VALUES_PER_TYPE);
    if (typeEntries.length > MAX_CREDIT_LINE_VALUES_PER_TYPE) {
      hadCappedClPerType = true;
    }

    const typeSummaries = displayedTypes.map((e) => {
      const nameStr = truncateValue(e.name);
      if (e.count === e.total) {
        return `${nameStr} (${e.count.toLocaleString("en-US")})`;
      }
      return `${nameStr} (${e.count.toLocaleString("en-US")} of ${e.total.toLocaleString("en-US")})`;
    });

    if (typeEntries.length > MAX_CREDIT_LINE_VALUES_PER_TYPE) {
      typeSummaries.push(
        `... and ${typeEntries.length - MAX_CREDIT_LINE_VALUES_PER_TYPE} more, omitted`
      );
    }

    if (typeSummaries.length > 0) {
      valGroups.push(`${truncateValue(clVal)} — ${typeSummaries.join(", ")}.`);
    }
  }

  if (hadCappedClValues) {
    valGroups.push(
      `... and ${nonEmptyDist.length - MAX_CREDIT_LINE_VALUES_GLOBAL} more, omitted`
    );
    if (omissions) {
      omissions.push(
        `showing the ${MAX_CREDIT_LINE_VALUES_GLOBAL} most frequent global Credit Line values`
      );
    }
  }
  if (hadCappedClPerType && omissions) {
    omissions.push(
      `showing at most ${MAX_CREDIT_LINE_VALUES_PER_TYPE} Credit Line values per type`
    );
  }

  if (valGroups.length === 0) {
    return null;
  }

  const emptySuffix =
    emptyCount > 0
      ? ` ${emptyCount.toLocaleString("en-US")} row${emptyCount === 1 ? "" : "s"} empty.`
      : "";

  return `Credit Line: ${valGroups.join(" ")}${emptySuffix}`;
}

type OverflowConfig = {
  includeRoutineCoverage: boolean;
  includeTemporal: boolean;
  includeRelationships: boolean;
  includeNetContributions: boolean;
  includeSampleRows: boolean;
  maxSamplesPerType: number;
  maxRoutineTypes: number;
  maxRoutineContribs: number;
};

function buildReport(
  d: CsvDiagnostics,
  appVersion: string,
  config: OverflowConfig
): { text: string; omissions: string[] } {
  const out: string[] = [];
  const omissions: string[] = [];

  // --- 1. Short privacy notice; version + schema header ---
  out.push("### Nexo Transaction Analyzer — file report");
  out.push("");
  if (hasValueBearingContent(d)) {
    out.push(
      "> **Check this before you post it.** This report contains net totals approximating account balances, recurring detail text, and sample rows with exact sample amounts, transaction IDs, transaction hashes, and merchant names and locations. Edit out anything private — the report remains useful without it."
    );
    out.push("");
  }

  out.push(`- App version: ${appVersion}`);

  // Ingestion coverage
  const ingestParts: string[] = [
    `CSV rows=${d.ingestion.csvRows}`,
    `parsed=${d.ingestion.parsed}`,
  ];
  if (d.ingestion.skippedBlankIds > 0) {
    let part = `skipped blank ids=${d.ingestion.skippedBlankIds}`;
    if (d.ingestion.firstSkippedBlankIdRow) {
      part += ` (row ${d.ingestion.firstSkippedBlankIdRow.rowOrdinal}, ${d.ingestion.firstSkippedBlankIdRow.column})`;
    }
    ingestParts.push(part);
  }
  if (d.ingestion.unparseableNumbers > 0) {
    let part = `unparseable numbers=${d.ingestion.unparseableNumbers}`;
    if (d.ingestion.firstUnparseableNumberRow) {
      part += ` (row ${d.ingestion.firstUnparseableNumberRow.rowOrdinal}, ${d.ingestion.firstUnparseableNumberRow.column})`;
    }
    ingestParts.push(part);
  }
  if (d.ingestion.invalidDates > 0) {
    let part = `invalid dates=${d.ingestion.invalidDates}`;
    if (d.ingestion.firstInvalidDateRow) {
      part += ` (row ${d.ingestion.firstInvalidDateRow.rowOrdinal}, ${d.ingestion.firstInvalidDateRow.column})`;
    }
    ingestParts.push(part);
  }
  out.push(`- Ingest: ${ingestParts.join("; ")}.`);

  if (!d.parseable && d.missingRequiredColumns.length > 0) {
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

  // --- 2. Ingestion failures, unknown types, unconfirmed handling, unexpected shapes/currencies ---
  if (d.unknownTypes.length > 0) {
    out.push(`#### Unrecognised types (${d.unknownTypes.length}, ${d.unknownRowCount} rows)`);
    out.push("");
    const displayedUnknown = d.unknownTypes.slice(0, MAX_REPORT_SECTION_ENTRIES);
    const unkStr = displayedUnknown.map((t) => `\`${truncateValue(t)}\``).join(", ");
    const unkSuffix =
      d.unknownTypes.length > MAX_REPORT_SECTION_ENTRIES
        ? `, ... and ${d.unknownTypes.length - MAX_REPORT_SECTION_ENTRIES} more, omitted`
        : "";
    if (d.unknownTypes.length > MAX_REPORT_SECTION_ENTRIES) {
      omissions.push(
        `showing first ${MAX_REPORT_SECTION_ENTRIES} unrecognised types`
      );
    }
    out.push(`${unkStr}${unkSuffix}`);
    out.push("");
  }

  // --- 3. Relationship, fee, status, temporal and duplicate exceptions, with sample rows ADJACENT ---
  if (d.relationships.matches.length > 0) {
    if (config.includeRelationships) {
      out.push("#### Relationships");
      out.push("");
      for (const m of d.relationships.matches) {
        let matchText = `${m.matchedCount} matched`;
        if (m.unmatchedCount > 0) {
          matchText += `, ${m.unmatchedCount} unmatched`;
        }
        let line = `Links: ${m.type1Rows} ${truncateValue(m.type1)} rows share timestamp+amount with ${m.type2Rows} ${truncateValue(m.type2)} (${matchText})`;
        if (m.ambiguousGroups > 0) {
          line += `; ${m.ambiguousGroups} group${m.ambiguousGroups === 1 ? "" : "s"} ambiguous.`;
        } else {
          line += ".";
        }
        out.push(line);
      }
      out.push("");
    } else {
      omissions.push("relationships (size limit)");
    }
  }

  const hasFeeException = d.feeCensus.nonzero > 0;
  if (hasFeeException) {
    out.push("#### Fees");
    out.push("");
    const feeParts: string[] = [];
    if (d.feeCensus.absent > 0) feeParts.push(`absent=${d.feeCensus.absent}`);
    if (d.feeCensus.zero > 0) feeParts.push(`zero=${d.feeCensus.zero}`);
    if (d.feeCensus.nonzero > 0) feeParts.push(`nonzero=${d.feeCensus.nonzero}`);
    if (d.feeCensus.invalid > 0) feeParts.push(`invalid=${d.feeCensus.invalid}`);
    out.push(`Fees: ${feeParts.join("; ")}.`);
    for (const [tName, f] of Object.entries(d.feeCensus.byType)) {
      out.push(
        `- ${truncateValue(tName)}: ${f.count} fee${f.count === 1 ? "" : "s"}, total ${formatSigFig(f.total)} ${f.currency} (${f.legMatch}).`
      );
    }
    out.push("");
  }

  const hasStatusException =
    d.status.disagreements > 0 || d.status.excludedByCalculator > 0;
  if (hasStatusException) {
    out.push("#### Status");
    out.push("");
    const statParts = Object.entries(d.status.counts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ");
    let sLine = `Status: ${statParts}`;
    if (d.status.excludedByCalculator > 0) {
      sLine += `; excluded by calculator=${d.status.excludedByCalculator}`;
    }
    if (d.status.disagreements > 0) {
      sLine += `; disagreements=${d.status.disagreements}`;
      if (d.status.disagreementTypes.length > 0) {
        sLine += ` (affected types: ${d.status.disagreementTypes.map((t) => truncateValue(t)).join(", ")})`;
      }
    }
    sLine += ".";
    out.push(sLine);
    out.push("");
  }

  const hasDuplicateException =
    d.duplicates.identicalFullRows > 0 ||
    d.duplicates.repeatedIds > 0 ||
    d.duplicates.identicalIgnoringIdGroups > 0;
  if (hasDuplicateException) {
    out.push("#### Duplicates");
    out.push("");
    const dupParts: string[] = [];
    if (d.duplicates.identicalFullRows > 0) {
      dupParts.push(`identical full rows=${d.duplicates.identicalFullRows}`);
    }
    if (d.duplicates.repeatedIds > 0) {
      let rStr = `repeated ids=${d.duplicates.repeatedIds}`;
      if (d.duplicates.repeatedIdsConflicting > 0) {
        rStr += ` (${d.duplicates.repeatedIdsConflicting} conflicting content, types: ${d.duplicates.repeatedIdsConflictingTypes.join(", ")})`;
      } else {
        rStr += ` (same content)`;
      }
      dupParts.push(rStr);
    }
    if (d.duplicates.identicalIgnoringIdGroups > 0) {
      dupParts.push(
        `identical ignoring id=${d.duplicates.identicalIgnoringIdRows} in ${d.duplicates.identicalIgnoringIdGroups} groups (not proof)`
      );
    }
    out.push(dupParts.length > 0 ? `Duplicates: ${dupParts.join("; ")}.` : "Duplicates: none.");
    out.push("");
  }

  if (d.temporal.transitions.length > 0) {
    if (config.includeTemporal) {
      out.push("#### Temporal transitions");
      out.push("");
      for (const tr of d.temporal.transitions) {
        out.push(
          `- ${tr.subgroup}: ${tr.kind} ${tr.date} (${tr.beforeCount} before, ${tr.afterCount} after)`
        );
      }
      out.push("");
    } else {
      omissions.push("temporal transitions (size limit)");
    }
  }

  // --- Unexpected shapes evidence ---
  const unexpectedShapeEntries: { typeName: string; shape: TypeShape }[] = [];
  for (const t of d.types) {
    for (const s of t.shapes) {
      if (!s.expected) {
        unexpectedShapeEntries.push({ typeName: t.name, shape: s });
      }
    }
  }

  if (unexpectedShapeEntries.length > 0) {
    out.push("#### Unexpected shapes");
    out.push("");
    const displayedEntries = unexpectedShapeEntries.slice(0, MAX_UNEXPECTED_SHAPES_REPORTED);
    for (const { typeName, shape } of displayedEntries) {
      let dateStr = "";
      if (shape.firstDate && shape.lastDate) {
        if (shape.firstDate === shape.lastDate) {
          dateStr = shape.firstDate;
        } else {
          dateStr = `${shape.firstDate} to ${shape.lastDate}`;
        }
      }

      let infoStr = "";
      if (shape.reason && dateStr) {
        infoStr = ` (${truncateValue(shape.reason, 60)}; ${dateStr})`;
      } else if (shape.reason) {
        infoStr = ` (${truncateValue(shape.reason, 60)})`;
      } else if (dateStr) {
        infoStr = ` (${dateStr})`;
      }

      let pairsStr = "";
      if (shape.currencyPairs && shape.currencyPairs.length > 0) {
        const displayedPairs = shape.currencyPairs.slice(0, MAX_CURRENCY_PAIRS_PER_SHAPE);
        const pairsText = displayedPairs
          .map((p) => `${truncateValue(p.value)} ×${p.count}`)
          .join(", ");
        const pairsOverflow =
          shape.currencyPairs.length > MAX_CURRENCY_PAIRS_PER_SHAPE
            ? `, ... and ${shape.currencyPairs.length - MAX_CURRENCY_PAIRS_PER_SHAPE} more`
            : "";
        pairsStr = ` — pairs: ${pairsText}${pairsOverflow}`;
        if (shape.currencyPairs.length > MAX_CURRENCY_PAIRS_PER_SHAPE) {
          omissions.push(
            `showing the ${MAX_CURRENCY_PAIRS_PER_SHAPE} most frequent currency pairs for ${typeName} (${shape.pattern})`
          );
        }
      }

      let ignoredStr = "";
      const rule = getTypeRule(typeName);
      if (rule?.effect === "ignore") {
        ignoredStr = " — [ignored]";
      }

      let detailsStr = "";
      if (shape.recurringDetails && shape.recurringDetails.length > 0) {
        const displayedDetails = shape.recurringDetails.slice(0, MAX_RECURRING_DETAILS_PER_SHAPE);
        const detailsFormatted = formatDetailTexts(displayedDetails, MAX_DETAIL_TEXT_LENGTH);
        const detailsText = detailsFormatted.join(", ");
        const detailsOverflow =
          shape.recurringDetails.length > MAX_RECURRING_DETAILS_PER_SHAPE
            ? `, ... and ${shape.recurringDetails.length - MAX_RECURRING_DETAILS_PER_SHAPE} more`
            : "";
        const tail =
          shape.otherDetailsCount && shape.otherDetailsCount > 0
            ? ` (+ ${shape.otherDetailsCount} other unique detail${shape.otherDetailsCount === 1 ? "" : "s"})`
            : "";
        detailsStr = ` — details: ${detailsText}${detailsOverflow}${tail}`;
        if (shape.recurringDetails.length > MAX_RECURRING_DETAILS_PER_SHAPE) {
          omissions.push(
            `showing the ${MAX_RECURRING_DETAILS_PER_SHAPE} most frequent detail texts for ${typeName} (${shape.pattern})`
          );
        }
      } else if (shape.otherDetailsCount && shape.otherDetailsCount > 0) {
        detailsStr = ` — details: none recurring (${shape.otherDetailsCount} distinct)`;
      } else {
        detailsStr = " — details: none beyond the status";
      }

      const pattern = formatShapePattern(shape);
      out.push(
        `- ${truncateValue(typeName)} / ${pattern} ×${shape.count}${infoStr}${pairsStr}${ignoredStr}${detailsStr}`
      );
    }

    if (unexpectedShapeEntries.length > MAX_UNEXPECTED_SHAPES_REPORTED) {
      out.push(
        `- ... and ${unexpectedShapeEntries.length - MAX_UNEXPECTED_SHAPES_REPORTED} more unexpected shapes, omitted`
      );
      omissions.push(
        `showing first ${MAX_UNEXPECTED_SHAPES_REPORTED} unexpected shapes`
      );
    }
    out.push("");
  }

  // Sample rows adjacent to exceptions
  if (d.sampleRows.length > 0) {
    if (config.includeSampleRows) {
      let droppedSecondarySamples = 0;
      out.push("#### Sample rows");
      out.push("");
      out.push("Sample rows (reconstructed from file cells):");
      out.push("");
      out.push("```");
      for (const { type, rows } of d.sampleRows) {
        const rowsToShow = rows.slice(0, config.maxSamplesPerType);
        if (rows.length > config.maxSamplesPerType) {
          droppedSecondarySamples += rows.length - config.maxSamplesPerType;
        }
        out.push(`# ${truncateValue(type)}`);
        for (const r of rowsToShow) out.push(r);
      }
      out.push("```");
      out.push("");
      if (droppedSecondarySamples > 0) {
        omissions.push(
          `${droppedSecondarySamples} secondary sample rows (size limit)`
        );
      }
    } else {
      omissions.push("sample rows (size limit)");
    }
  }

  // --- 4. Per-type contributions and the shape census ---
  out.push("#### Transaction types");
  out.push("");
  out.push("| Type | Rows | Handling | Shape |");
  out.push("| --- | ---: | --- | --- |");

  const exceptionalTypes = d.types.filter(isExceptionalType);
  const routineTypes = d.types.filter((t) => !isExceptionalType(t));

  const allowedRoutineTypes = routineTypes.slice(0, config.maxRoutineTypes);
  if (routineTypes.length > config.maxRoutineTypes) {
    omissions.push(
      `${routineTypes.length - config.maxRoutineTypes} routine transaction types (size limit)`
    );
  }

  const typesToRender = [...exceptionalTypes, ...allowedRoutineTypes];
  let hadCappedShapes = false;

  for (const t of typesToRender) {
    const isIgnored = t.handling === "ignored";
    const displayedShapes = t.shapes.slice(0, MAX_SHAPES_PER_TYPE);
    const shapeLines = displayedShapes.map((s) => {
      const pattern = formatShapePattern(s);
      const str = `${pattern} ×${s.count}`;
      if (s.expected) return str;
      const reasonSuffix = s.reason ? `: ${truncateValue(s.reason, 60)}` : "";
      if (isIgnored) {
        return `${str} (unexpected, no effect on balances${reasonSuffix})`;
      }
      return `**${str} (unexpected${reasonSuffix})**`;
    });
    if (t.shapes.length > MAX_SHAPES_PER_TYPE) {
      shapeLines.push(`... and ${t.shapes.length - MAX_SHAPES_PER_TYPE} more, omitted`);
      hadCappedShapes = true;
    }
    const shape = shapeLines.join("<br>");

    let handling = !t.known
      ? "**not recognised — counted as-is**"
      : t.handling;

    if (t.known && t.confidence === "inferred") {
      handling = `${handling} (unconfirmed)`;
    }

    out.push(
      `| \`${truncateValue(t.name)}\` | ${t.count} | ${handling} | ${shape} |`
    );
  }
  if (hadCappedShapes) {
    omissions.push(`showing at most ${MAX_SHAPES_PER_TYPE} shapes per type`);
  }
  if (routineTypes.length > config.maxRoutineTypes) {
    out.push(`_... and ${routineTypes.length - config.maxRoutineTypes} more routine types, omitted._`);
  }
  out.push("");

  out.push("#### Net contribution breakdown");
  out.push("");
  out.push("_([ignored] = no balance effect; amounts show internal movements):_");
  out.push("");

  if (!config.includeNetContributions || config.maxRoutineContribs === 0) {
    omissions.push("net contribution breakdown (size limit)");
    out.push("_Net contribution breakdown omitted to keep report within size limit._");
  } else {
    const allowedRoutineContribs = routineTypes.slice(0, config.maxRoutineContribs);
    if (routineTypes.length > config.maxRoutineContribs) {
      omissions.push(
        `${routineTypes.length - config.maxRoutineContribs} routine contribution types (size limit)`
      );
    }
    const contribTypesToRender = [...exceptionalTypes, ...allowedRoutineContribs];
    let hadCappedContribs = false;

    for (const t of contribTypesToRender) {
      const entries = Object.entries(t.netContributions);
      if (t.handling === "ignored") {
        if (entries.length === 0) {
          out.push(`- \`${truncateValue(t.name)}\`: [ignored] (none)`);
        } else {
          let movementStr = "";
          if (entries.length === 2) {
            const sorted = [...entries].sort((a, b) => a[1] - b[1]);
            const leg1 = `${truncateValue(sorted[0][0])} ${sorted[0][1] > 0 ? "+" : ""}${formatSigFig(sorted[0][1])}`;
            const leg2 = `${truncateValue(sorted[1][0])} ${sorted[1][1] > 0 ? "+" : ""}${formatSigFig(sorted[1][1])}`;
            movementStr = `${leg1} → ${leg2}`;
          } else if (entries.length === 1) {
            movementStr = `${truncateValue(entries[0][0])} ${entries[0][1] > 0 ? "+" : ""}${formatSigFig(entries[0][1])}`;
          } else {
            const sorted = [...entries].sort(
              (a, b) => Math.abs(b[1]) - Math.abs(a[1]) || a[0].localeCompare(b[0])
            );
            const displayed = sorted.slice(0, MAX_CONTRIBUTIONS_PER_TYPE);
            movementStr = displayed
              .map(([cur, amt]) => `${truncateValue(cur)} ${amt > 0 ? "+" : ""}${formatSigFig(amt)}`)
              .join(", ");
            if (entries.length > MAX_CONTRIBUTIONS_PER_TYPE) hadCappedContribs = true;
          }
          out.push(`- \`${truncateValue(t.name)}\`: [ignored] ${movementStr} ×${t.count}`);
        }
      } else {
        if (entries.length === 0) {
          out.push(`- \`${truncateValue(t.name)}\`: (none)`);
        } else {
          const sorted = [...entries].sort(
            (a, b) => Math.abs(b[1]) - Math.abs(a[1]) || a[0].localeCompare(b[0])
          );
          const displayed = sorted.slice(0, MAX_CONTRIBUTIONS_PER_TYPE);
          const formatted = displayed
            .map(([cur, amt]) => {
              const signPrefix = amt > 0 ? "+" : "";
              const str = formatSigFig(amt);
              return `${signPrefix}${str} ${truncateValue(cur)}`;
            })
            .join(", ");
          const suffix =
            entries.length > MAX_CONTRIBUTIONS_PER_TYPE
              ? `, ... and ${entries.length - MAX_CONTRIBUTIONS_PER_TYPE} more, omitted`
              : "";
          if (entries.length > MAX_CONTRIBUTIONS_PER_TYPE) hadCappedContribs = true;
          out.push(`- \`${truncateValue(t.name)}\`: ${formatted}${suffix}`);
        }
      }
    }
    if (hadCappedContribs) {
      omissions.push(`showing the ${MAX_CONTRIBUTIONS_PER_TYPE} largest currencies per type`);
    }
    if (routineTypes.length > config.maxRoutineContribs) {
      out.push(
        `- ... and ${routineTypes.length - config.maxRoutineContribs} more routine contribution types, omitted`
      );
    }
  }
  out.push("");

  // --- 5. Routine coverage summaries ---
  if (config.includeRoutineCoverage) {
    // Row censuses that carry no amounts, kept in their own section so a
    // reader trimming the contribution figures does not lose them too.
    const coverage: string[] = [];
    if (!hasFeeException) {
      if (d.feeCensus.nonzero === 0 && d.feeCensus.zero === 0 && d.feeCensus.invalid === 0) {
        coverage.push("Fees: none.");
      } else {
        const feeParts: string[] = [];
        if (d.feeCensus.absent > 0) feeParts.push(`absent=${d.feeCensus.absent}`);
        if (d.feeCensus.zero > 0) feeParts.push(`zero=${d.feeCensus.zero}`);
        if (d.feeCensus.nonzero > 0) feeParts.push(`nonzero=${d.feeCensus.nonzero}`);
        if (d.feeCensus.invalid > 0) feeParts.push(`invalid=${d.feeCensus.invalid}`);
        coverage.push(feeParts.length > 0 ? `Fees: ${feeParts.join("; ")}.` : "Fees: none.");
      }
    }

    if (!hasStatusException) {
      const statParts = Object.entries(d.status.counts)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");
      let sLine = `Status: ${statParts}`;
      if (d.status.excludedByCalculator > 0) {
        sLine += `; excluded by calculator=${d.status.excludedByCalculator}`;
      }
      if (d.status.disagreements > 0) {
        sLine += `; disagreements=${d.status.disagreements}`;
      }
      sLine += ".";
      coverage.push(sLine);
    }

    if (!hasDuplicateException) {
      coverage.push("Duplicates: none.");
    }

    if (d.relationships.allRowsShareTimestamp) {
      coverage.push("Links: all rows share one timestamp; temporal matching disabled.");
    }

    if (d.temporal.allRowsShareTimestamp) {
      coverage.push("Transitions: all rows share one timestamp; temporal analysis not possible.");
    }

    const creditLineSummary = formatCreditLineSummary(d, omissions);
    if (creditLineSummary) {
      coverage.push(creditLineSummary);
    }

    const hasUsdIssues =
      d.usdEquivalent.missing > 0 ||
      d.usdEquivalent.malformed > 0 ||
      d.usdEquivalent.conspicuousRepetition !== undefined;
    if (hasUsdIssues) {
      const usdParts: string[] = [];
      if (d.usdEquivalent.missing > 0) {
        usdParts.push(`missing=${d.usdEquivalent.missing}`);
      }
      if (d.usdEquivalent.malformed > 0) {
        usdParts.push(`malformed=${d.usdEquivalent.malformed}`);
      }
      if (d.usdEquivalent.conspicuousRepetition) {
        usdParts.push(
          `conspicuous repetition: "${truncateValue(d.usdEquivalent.conspicuousRepetition.value)}" in ${d.usdEquivalent.conspicuousRepetition.count} rows (${d.usdEquivalent.conspicuousRepetition.percentage}%)`
        );
      }
      coverage.push(`USD Equivalent: ${usdParts.join("; ")}.`);
    }


    if (coverage.length > 0) {
      out.push("#### Coverage");
      out.push("");
      out.push(...coverage);
    }

    // Detail prefixes: rendered only when not all rows share one status
    if (d.detailPrefixes.length > 1) {
      out.push("");
      out.push("#### Detail prefixes");
      out.push("");
      const displayedPrefixes = d.detailPrefixes.slice(0, MAX_DETAIL_PREFIXES);
      const prefixStr = displayedPrefixes
        .map((p) => `${truncateValue(p.prefix)} (${p.count})`)
        .join(", ");
      const prefixSuffix =
        d.detailPrefixes.length > MAX_DETAIL_PREFIXES
          ? `, ... and ${d.detailPrefixes.length - MAX_DETAIL_PREFIXES} more, omitted`
          : "";
      if (d.detailPrefixes.length > MAX_DETAIL_PREFIXES) {
        omissions.push(
          `showing first ${MAX_DETAIL_PREFIXES} detail prefixes`
        );
      }
      out.push(`${prefixStr}${prefixSuffix}`);
    }

    if (d.detailPrefixes.some((p) => p.prefix === "(other)")) {
      omissions.push(
        'detail prefixes that were not recognised status words replaced with "(other)"'
      );
    }
  } else {
    omissions.push("routine coverage summaries (size limit)");
  }

  if (omissions.length > 0) {
    out.push("");
    out.push(`_The app withheld: ${omissions.join("; ")}._`);
  }

  // Trailing newline: the report is pasted into an issue, where a missing final
  // newline runs the last line into whatever follows it.
  return { text: out.join("\n") + "\n", omissions };
}

function truncateDeterministically(text: string, maxBytes: number): string {
  const encoder = new TextEncoder();
  const rawBytes = encoder.encode(text);
  if (rawBytes.length <= maxBytes) {
    return text;
  }

  const notice = "\n\n_Report truncated deterministically to stay within size limit._\n";
  const noticeBytes = encoder.encode(notice).length;
  const budget = maxBytes - noticeBytes;

  if (budget <= 0) {
    return new TextDecoder("utf-8").decode(rawBytes.slice(0, maxBytes));
  }

  let sliceEnd = budget;
  while (sliceEnd > 0 && (rawBytes[sliceEnd] & 0xc0) === 0x80) {
    sliceEnd--;
  }

  const decoded = new TextDecoder("utf-8").decode(rawBytes.slice(0, sliceEnd));
  const lastNewline = decoded.lastIndexOf("\n");
  const cleanDecoded = lastNewline > 0 ? decoded.slice(0, lastNewline) : decoded;

  const candidate = cleanDecoded + notice;
  if (encoder.encode(candidate).length <= maxBytes) {
    return candidate;
  }

  const furtherDecoded = cleanDecoded.slice(
    0,
    Math.max(0, cleanDecoded.length - (encoder.encode(candidate).length - maxBytes))
  );
  return furtherDecoded + notice;
}

/**
 * Render the diagnostics as markdown for pasting into a GitHub issue.
 *
 * The report is shown in full before it can be copied, and sample rows are
 * unaltered, so what gets published is always something the user could read first.
 */
export function formatDiagnosticReport(d: CsvDiagnostics, appVersion: string): string {
  const encoder = new TextEncoder();

  // Progressive reduction pipeline obeying the overflow policy:
  // Priority (most protected first):
  // 1. ingestion/status/unexpected flags
  // 2. sample rows for unexpected shapes and unknown types
  // 3. net contributions
  // 4. relationships
  // 5. temporal transitions
  // 6. routine coverage summaries
  //
  // Reduction drops least protected first.
  const baseConfig: OverflowConfig = {
    includeRoutineCoverage: true,
    includeTemporal: true,
    includeRelationships: true,
    includeNetContributions: true,
    includeSampleRows: true,
    maxSamplesPerType: MAX_SAMPLE_ROWS_PER_TYPE,
    maxRoutineTypes: MAX_REPORT_SECTION_ENTRIES,
    maxRoutineContribs: MAX_REPORT_SECTION_ENTRIES,
  };

  const stages: OverflowConfig[] = [
    // Stage 0: full allowances
    { ...baseConfig },
    // Stage 1: drop routine coverage summaries (6)
    { ...baseConfig, includeRoutineCoverage: false },
    // Stage 2: drop temporal transitions (5)
    { ...baseConfig, includeRoutineCoverage: false, includeTemporal: false },
    // Stage 3: drop relationships (4)
    {
      ...baseConfig,
      includeRoutineCoverage: false,
      includeTemporal: false,
      includeRelationships: false,
    },
    // Stage 4: cap routine contributions to 10 and secondary samples to 1
    {
      ...baseConfig,
      includeRoutineCoverage: false,
      includeTemporal: false,
      includeRelationships: false,
      maxSamplesPerType: 1,
      maxRoutineContribs: 10,
    },
    // Stage 5: drop net contributions completely (3), cap routine types to 10
    {
      ...baseConfig,
      includeRoutineCoverage: false,
      includeTemporal: false,
      includeRelationships: false,
      includeNetContributions: false,
      maxSamplesPerType: 1,
      maxRoutineContribs: 0,
      maxRoutineTypes: 10,
    },
    // Stage 6: drop routine types completely
    {
      ...baseConfig,
      includeRoutineCoverage: false,
      includeTemporal: false,
      includeRelationships: false,
      includeNetContributions: false,
      maxSamplesPerType: 1,
      maxRoutineContribs: 0,
      maxRoutineTypes: 0,
    },
    // Stage 7: drop sample rows completely (2)
    {
      ...baseConfig,
      includeRoutineCoverage: false,
      includeTemporal: false,
      includeRelationships: false,
      includeNetContributions: false,
      includeSampleRows: false,
      maxSamplesPerType: 0,
      maxRoutineContribs: 0,
      maxRoutineTypes: 0,
    },
  ];

  let lastReport = "";
  for (let i = 0; i < stages.length; i++) {
    const res = buildReport(d, appVersion, stages[i]);
    lastReport = res.text;
    if (encoder.encode(res.text).length <= MAX_REPORT_SIZE_BYTES) {
      return res.text;
    }
  }

  return truncateDeterministically(lastReport, MAX_REPORT_SIZE_BYTES);
}
