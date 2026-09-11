import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  analyseCsv,
  classifyCurrency,
  formatDiagnosticReport,
  formatSigFig,
  hasValueBearingContent,
  isExceptionalType,
  LEGACY_TYPE_NAMES,
  MAX_SAMPLE_ROWS,
  MAX_UNEXPECTED_SHAPE_SAMPLE_ROWS,
  MAX_SAMPLE_ROWS_PER_TYPE,
  MAX_FIELD_VALUE_LENGTH,
  MAX_CONTRIBUTIONS_PER_TYPE,
  MAX_CREDIT_LINE_VALUES_GLOBAL,
  MAX_CREDIT_LINE_VALUES_PER_TYPE,
  MAX_GROSS_FLOW_ENTRIES,
  MAX_REPORT_SIZE_BYTES,
  shapeOf,
} from "./csv-diagnostics";
import { TransactionType, TYPE_RULES } from "../data/transaction-types";
import { fixFiatX } from "../data/currencies";

// All fixtures here are invented. Real exports are never committed.
const CURRENT_HEADER =
  "Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC)";

const row = (type: string, opts: Partial<{ ic: string; ia: string; oc: string; oa: string; details: string; date: string }> = {}) => {
  const { ic = "BTC", ia = "1.00000000", oc = "BTC", oa = "1.00000000", details = "approved / BTC Interest Earned", date = "2026-01-15 00:00:00" } = opts;
  return `NXT1,${type},${ic},${ia},${oc},${oa},$1.00,-,-,"${details}",${date}`;
};

const csv = (...rows: string[]) => [CURRENT_HEADER, ...rows].join("\n");

describe("formatSigFig", () => {
  it("formats numbers to 3 significant figures without forcing trailing decimals", () => {
    expect(formatSigFig(0.00055)).toBe("0.00055");
    expect(formatSigFig(0.0000001234)).toBe("1.23e-7");
    expect(formatSigFig(1.23e-7)).toBe("1.23e-7");
    expect(formatSigFig(87654.32)).toBe("87,700");
    expect(formatSigFig(35000)).toBe("35,000");
    expect(formatSigFig(-87654.32)).toBe("-87,700");
    expect(formatSigFig(0)).toBe("0");
    expect(formatSigFig(1)).toBe("1");
    expect(formatSigFig(12.3456789)).toBe("12.3");
    expect(formatSigFig(-14.07)).toBe("-14.1");
  });
});

describe("analyseCsv", () => {
  it("accepts the current 11-column schema", () => {
    const d = analyseCsv(csv(row("Interest")));
    expect(d.parseable).toBe(true);
    expect(d.missingRequiredColumns).toEqual([]);
    expect(d.columnCount).toBe(11);
    expect(d.rowCount).toBe(1);
  });

  // The exact failure a 2022-era export hits: it has no fee columns and its
  // date column lacks the "(UTC)" suffix.
  it("names every missing column on an older 10-column schema", () => {
    const legacy = [
      "Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Details,Outstanding Loan,Date / Time",
      'NXT1,LockingTermDeposit,ETH,-1.00000000,ETH,1.00000000,$1.00,"approved / x",$0.00,2022-01-05 00:00:00',
    ].join("\n");
    const d = analyseCsv(legacy);
    expect(d.parseable).toBe(false);
    expect(d.missingRequiredColumns).toEqual(["Fee", "Fee Currency", "Date / Time (UTC)"]);
    // The date range still resolves, from the unsuffixed column.
    expect(d.dateRange).toEqual({ first: "2022-01-05", last: "2022-01-05" });
  });

  it("separates recognised from unrecognised types and counts the rows", () => {
    const d = analyseCsv(csv(row("Interest"), row("Interest"), row("LockingTermDeposit"), row("SomethingBrandNew")));
    expect(d.unknownTypes.sort()).toEqual(["LockingTermDeposit", "SomethingBrandNew"]);
    expect(d.unknownRowCount).toBe(2);
    expect(d.types.find((t) => t.name === "Interest")).toMatchObject({ count: 2, known: true });
  });

  it("flags a legacy export, and does not flag a merely unknown type", () => {
    expect(analyseCsv(csv(row("LockingTermDeposit"))).looksLikeLegacyExport).toBe(true);
    expect(analyseCsv(csv(row("SomethingBrandNew"))).looksLikeLegacyExport).toBe(false);
    expect(analyseCsv(csv(row("Interest"))).looksLikeLegacyExport).toBe(false);
  });

  // Sign convention is what distinguishes export vintages, so it has to survive.
  it("derives row shape from amount signs and currency equality", () => {
    const d = analyseCsv(
      csv(
        row("Exchange", { ic: "ETH", ia: "-1.0", oc: "NEXO", oa: "400.0" }),
        row("Interest", { ia: "1.0", oa: "1.0" })
      )
    );
    expect(d.types.find((t) => t.name === "Exchange")?.shapes[0].pattern).toBe("in- out+ diff");
    expect(d.types.find((t) => t.name === "Interest")?.shapes[0].pattern).toBe("in+ out+ same");
  });

  // Sample rows are unaltered by design: the warning carries the safety, so it
  // has to actually be present in the report.
  it("emits sample rows unaltered", () => {
    const legacy = [
      "Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Details,Outstanding Loan,Date / Time",
      'NXTid01,CreditCardStatus,USD,-11.11000000,EUR,10.10000000,$11.11,"approved / Some Shop |  | Some Town",$11.11,2022-03-15 10:00:00',
    ].join("\n");
    // Quoting is re-added only where a value needs it, so this one loses the
    // quotes the source had. The values themselves are untouched, which is
    // what "unaltered" has to mean here.
    expect(analyseCsv(legacy).sampleRows[0].rows[0]).toBe(
      "NXTid01,CreditCardStatus,USD,-11.11000000,EUR,10.10000000,$11.11,approved / Some Shop |  | Some Town,$11.11,2022-03-15 10:00:00"
    );
  });

  it("preserves quoting so a Details field keeps its commas", () => {
    const d = analyseCsv(csv(row("Mystery", { details: "approved / lidl, berlin" })));
    expect(d.sampleRows[0].rows[0]).toContain('"approved / lidl, berlin"');
  });

  it("keeps sample rows only for unrecognised types, and caps them", () => {
    const hash = "b".repeat(64);
    const many = Array.from({ length: 5 }, (_, i) =>
      row("Mystery", {
        details: `approved / ${hash}`,
        date: `2026-01-${String(i + 1).padStart(2, "0")} 00:00:00`,
      })
    );
    const d = analyseCsv(csv(row("Interest"), ...many));
    expect(d.sampleRows.map((s) => s.type)).toEqual(["Mystery"]);
    expect(d.sampleRows[0].rows).toHaveLength(MAX_SAMPLE_ROWS);
    for (const r of d.sampleRows[0].rows) expect(r).toContain(hash);
  });

  it("collects detail prefixes without the text after the slash", () => {
    const d = analyseCsv(
      csv(row("Interest", { details: "approved / secret merchant, berlin" }), row("Interest", { details: "rejected / whatever" }))
    );
    expect(d.detailPrefixes).toEqual([
      { prefix: "approved", count: 1 },
      { prefix: "rejected", count: 1 },
    ]);
    expect(JSON.stringify(d.detailPrefixes)).not.toContain("berlin");
  });

  it("allow-lists detail prefixes and buckets unknown text such as email or merchant as (other)", () => {
    const d = analyseCsv(
      csv(
        row("Transfer In", { details: "private@example.org / transfer" }),
        row("Exchange", { ia: "-1.00000000", oc: "ETH", details: "Amazon EU SARL / card payment" }),
        row("Interest", { details: "approved / interest payment" }),
        row("Deposit", { details: "plain note without slash" })
      )
    );
    expect(d.detailPrefixes).toEqual([
      { prefix: "(other)", count: 2 },
      { prefix: "approved", count: 1 },
      { prefix: "(none)", count: 1 },
    ]);
    expect(JSON.stringify(d.detailPrefixes)).not.toContain("private@example.org");
    expect(JSON.stringify(d.detailPrefixes)).not.toContain("Amazon");
    const report = formatDiagnosticReport(d, "4.5.0");
    expect(report).not.toContain("private@example.org");
    expect(report).not.toContain("Amazon");
  });

  it("handles an empty file without throwing", () => {
    const d = analyseCsv(CURRENT_HEADER);
    expect(d.rowCount).toBe(0);
    expect(d.dateRange).toBeNull();
    expect(d.unknownTypes).toEqual([]);
  });
});

describe("formatDiagnosticReport", () => {
  it("states why a file was rejected", () => {
    const legacy = [
      "Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Details,Outstanding Loan,Date / Time",
      'NXT1,TransferIn,ETH,1.00000000,ETH,1.00000000,$1.00,"approved / x",$0.00,2022-01-05 00:00:00',
    ].join("\n");
    const report = formatDiagnosticReport(analyseCsv(legacy), "4.3.0");
    expect(report).toContain("Ingest: CSV rows=1; parsed=0;");
    expect(report).toContain("Missing required columns: Fee, Fee Currency, Date / Time (UTC)");
    expect(report).toContain("match Nexo exports from before 2023");
    // The claim must stay hedged: an unreadable file can equally mean Nexo
    // changed the format again, which they have done before.
    expect(report).toContain("this app has not caught up");
    expect(report).toContain("4.3.0");
  });

  it("warns before any unaltered sample row, naming what to look for", () => {
    const report = formatDiagnosticReport(analyseCsv(csv(row("Mystery"))), "4.3.0");
    const warning = report.indexOf("Check this before you post it");
    expect(warning).toBeGreaterThan(-1);
    expect(report).toContain("transaction hashes");
    expect(report).toContain("merchant names and locations");
    // The warning has to precede the rows it is about.
    expect(warning).toBeLessThan(report.indexOf("Sample rows"));
  });

  it("carries a warning for recognised types that emit monetary contributions, even with zero samples", () => {
    const d = analyseCsv(csv(row("Interest")));
    expect(hasValueBearingContent(d)).toBe(true);
    const report = formatDiagnosticReport(d, "4.3.0");
    expect(report).toContain("Check this before you post it");
  });

  it("carries no warning when there are no sample rows, no monetary contributions, and no credit line values", () => {
    const emptyD = analyseCsv(CURRENT_HEADER);
    expect(hasValueBearingContent(emptyD)).toBe(false);
    const emptyReport = formatDiagnosticReport(emptyD, "4.3.0");
    expect(emptyReport).not.toContain("Check this before you post it");
  });

  it("carries a warning on a one-row file with expected shape that publishes monetary totals (+12.3 BTC)", () => {
    const d = analyseCsv(csv(row("Interest", { ia: "12.3456789", oa: "12.3456789" })));
    expect(d.sampleRows).toHaveLength(0);
    expect(hasValueBearingContent(d)).toBe(true);
    const report = formatDiagnosticReport(d, "4.4.0");
    expect(report).toContain("+12.3 BTC");
    expect(report).toContain("Check this before you post it");
    expect(report).toContain("net totals approximating account balances");
  });

  it("carries a warning when a recognised type has an unexpected shape to sample", () => {
    const report = formatDiagnosticReport(
      analyseCsv(csv(row("Interest", { ia: "-1.00000000" }))),
      "4.3.0"
    );
    expect(report).toContain("Check this before you post it");
  });

  it("emits actual sample row text when all types are recognised but one has an unexpected shape", () => {
    const offShapeRow = row("Interest", {
      ia: "-1.50000000",
      details: "approved / Negative Interest Row Sample Marker",
    });
    const d = analyseCsv(csv(offShapeRow));
    expect(d.unknownTypes).toEqual([]);
    expect(d.sampleRows).toHaveLength(1);
    expect(d.sampleRows[0].type).toBe("Interest");

    const report = formatDiagnosticReport(d, "4.4.0");
    expect(report).toContain("approved / Negative Interest Row Sample Marker");
    expect(report).toContain("#### Sample rows");
    expect(report).not.toContain("Unrecognised types");
  });

  it("produces no samples for recognised types with expected shapes but still warns on monetary totals", () => {
    const d = analyseCsv(
      csv(
        row("Interest", { ia: "1.00000000", oa: "1.00000000" }),
        row("Exchange", { ic: "ETH", ia: "-1.00000000", oc: "BTC", oa: "0.05000000" })
      )
    );
    expect(d.unknownTypes).toEqual([]);
    expect(d.sampleRows).toHaveLength(0);
    const report = formatDiagnosticReport(d, "4.4.0");
    expect(report).not.toContain("#### Sample rows");
    expect(report).toContain("Check this before you post it");
  });

  it("omits the sample-row section when every type is recognised and all shapes are expected", () => {
    const report = formatDiagnosticReport(analyseCsv(csv(row("Interest"))), "4.3.0");
    expect(report).not.toContain("Unrecognised types");
    expect(report).not.toContain("#### Sample rows");
    expect(report).toContain("| `Interest` | 1 | counted | in+ out+ same ×1 |");
  });

  it("renders Handling column and marks unexpected shapes in report, preserving why on TypeSummary for FileDetailsPage", () => {
    const fixture = csv(
      row("Exchange Credit", { ic: "xUSD", ia: "-1.00000000", oc: "EURX", oa: "1.00000000" }),
      row("Exchange Liquidation", { ic: "BTC", ia: "0.01000000", oc: "xUSD", oa: "500.00000000" }),
      row("Interest", { ia: "-1.00000000" }),
      row("SomethingBrandNew")
    );
    const d = analyseCsv(fixture);
    const report = formatDiagnosticReport(d, "4.4.0");

    expect(report).toContain("| Type | Rows | Handling | Shape |");
    expect(report).toContain("| `Exchange Credit` | 1 | ignored | in- out+ diff ×1 |");
    expect(report).toContain("| `Exchange Liquidation` | 1 | counted, input debited | in+ out+ diff ×1 |");
    expect(report).toContain("| `SomethingBrandNew` | 1 | **not recognised — counted as-is** |");
    expect(report).toContain("(unexpected)");

    // The pasteable report must NOT contain the why prose
    expect(report).not.toContain("Card funding conversion");
    expect(report).not.toContain("Card repayment liquidation");

    // FileDetailsPage uses TypeSummary.why to render on screen
    expect(d.types.find((t) => t.name === "Exchange Credit")?.why).toBe(
      TYPE_RULES["Exchange Credit"].why
    );
    expect(d.types.find((t) => t.name === "Exchange Liquidation")?.why).toBe(
      TYPE_RULES["Exchange Liquidation"].why
    );
  });

  it("interacts caps properly so unexpected shapes get up to 5 rows and unknown types up to 5 across shapes", () => {
    const offShapeRows = Array.from({ length: 7 }, (_, i) =>
      row("Interest", {
        ia: "-1.00000000",
        details: `approved / interest charge #${i + 1}`,
        date: `2026-01-${String(i + 1).padStart(2, "0")} 00:00:00`,
      })
    );
    const unknownShapeA = Array.from({ length: 6 }, (_, i) =>
      row("UnknownType", {
        details: `approved / unk shape A #${i + 1}`,
        date: `2026-02-${String(i + 1).padStart(2, "0")} 00:00:00`,
      })
    );
    const unknownShapeB = Array.from({ length: 6 }, (_, i) =>
      row("UnknownType", {
        ia: "-1.0",
        oc: "ETH",
        oa: "1.0",
        details: `approved / unk shape B #${i + 1}`,
        date: `2026-03-${String(i + 1).padStart(2, "0")} 00:00:00`,
      })
    );

    const d = analyseCsv(csv(...offShapeRows, ...unknownShapeA, ...unknownShapeB));

    const interestSamples = d.sampleRows.find((s) => s.type === "Interest");
    expect(interestSamples).toBeDefined();
    expect(interestSamples!.rows).toHaveLength(MAX_UNEXPECTED_SHAPE_SAMPLE_ROWS);

    const unknownSamples = d.sampleRows.find((s) => s.type === "UnknownType");
    expect(unknownSamples).toBeDefined();
    expect(unknownSamples!.rows).toHaveLength(MAX_SAMPLE_ROWS_PER_TYPE);
    expect(new Set(unknownSamples!.rows).size).toBe(MAX_SAMPLE_ROWS_PER_TYPE);
  });

  it("enforces absolute cap per type across arbitrarily many shapes", () => {
    const rows: string[] = [];
    for (let s = 0; s < 10; s++) {
      for (let r = 0; r < 3; r++) {
        rows.push(
          row("WildUnknown", {
            ic: `CUR${s}`,
            ia: s % 2 === 0 ? "1.0" : "-1.0",
            oc: `OUT${s}`,
            oa: r % 2 === 0 ? "2.0" : "-2.0",
            details: `approved / shape ${s} row ${r}`,
          })
        );
      }
    }
    const d = analyseCsv(csv(...rows));
    const samples = d.sampleRows.find((s) => s.type === "WildUnknown");
    expect(samples).toBeDefined();
    expect(samples!.rows).toHaveLength(MAX_SAMPLE_ROWS_PER_TYPE);
    expect(new Set(samples!.rows).size).toBe(MAX_SAMPLE_ROWS_PER_TYPE);
  });
});

describe("Credit Line reporting", () => {
  it("reports Credit Line values as an inverted summary on a 12-column export", () => {
    const HEADER_12 =
      "Transaction,Type,Credit Line,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC)";
    const csv12 = [
      HEADER_12,
      'NXT1,Credit Card Withdrawal Credit,Card,xUSD,-14.07,xUSD,14.07,$14.07,-,-,"authorized / draw",2026-08-22 04:08:58',
      'NXT2,Exchange Credit,Card,xUSD,-14.07,EURX,12.00,$14.07,-,-,"authorized / funding",2026-08-22 04:08:58',
      'NXT3,Exchange Credit,,xUSD,-14.07,EURX,12.00,$14.07,-,-,"authorized / funding 2",2026-08-22 04:08:58',
      'NXT4,Nexo Card Purchase,,xUSD,-14.07,EURX,12.00,$14.07,-,-,"approved / shop",2026-08-22 04:08:58',
    ].join("\n");

    const d = analyseCsv(csv12);
    expect(d.creditLine.present).toBe(true);
    expect(d.creditLine.distribution).toEqual([
      { value: "Card", count: 2 },
      { value: "(empty)", count: 2 },
    ]);

    const report = formatDiagnosticReport(d, "4.4.0");
    expect(report).toContain(
      "Credit Line: Card — Credit Card Withdrawal Credit (1), Exchange Credit (1 of 2). 2 rows empty."
    );
    expect(report).not.toContain("#### Credit Line");
    expect(report).not.toContain("- `Credit Card Withdrawal Credit`: Card");
  });

  it("handles an 11-column export without Credit Line gracefully by omitting the line", () => {
    const d = analyseCsv(csv(row("Interest")));
    expect(d.creditLine.present).toBe(false);
    expect(d.creditLine.distribution).toEqual([]);
    expect(d.creditLine.byType).toEqual({});

    const report = formatDiagnosticReport(d, "4.4.0");
    expect(report).not.toContain("Credit Line");
  });

  it("omits the Credit Line line entirely on a 12-column export when all Credit Line values are empty", () => {
    const HEADER_12 =
      "Transaction,Type,Credit Line,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC)";
    const csv12 = [
      HEADER_12,
      'NXT1,Interest,,BTC,1.0,BTC,1.0,$1.00,-,-,"approved / test",2026-01-01 00:00:00',
    ].join("\n");
    const d = analyseCsv(csv12);
    expect(d.creditLine.present).toBe(true);
    const report = formatDiagnosticReport(d, "4.4.0");
    expect(report).not.toContain("Credit Line:");
  });
});

describe("Net balance contributions", () => {
  it("computes per-type, per-currency net contributions accurately and reports ignored movements", () => {
    const fixture = csv(
      row("Interest", { ic: "BTC", ia: "0.50000000", oc: "BTC", oa: "0.50000000" }),
      row("Exchange", { ic: "ETH", ia: "-2.00000000", oc: "USDT", oa: "6000.00000000" }),
      row("Exchange Credit", { ic: "xUSD", ia: "-14.07", oc: "EURX", oa: "12.00" }),
      row("Exchange Liquidation", { ic: "EURX", ia: "500.00", oc: "xUSD", oa: "577.25" }),
      row("Deposit To Exchange", { ic: "EUR", ia: "1000.00", oc: "EURX", oa: "1000.00" }),
      row("Deposit", { details: "rejected / cancelled deposit", ic: "BTC", ia: "10.0" }),
      row("Transfer In", { ic: "BTC", ia: "1.00000000", oc: "BTC", oa: "1.00000000" })
    );
    const d = analyseCsv(fixture);

    expect(d.netContributions["Interest"]).toEqual({ BTC: 0.5 });
    expect(d.netContributions["Exchange"]).toEqual({ ETH: -2, USDT: 6000 });
    expect(d.netContributions["Exchange Credit"]).toEqual({ xUSD: -14.07, EUR: 12 });
    expect(d.netContributions["Exchange Liquidation"]).toEqual({ EUR: -500 });
    expect(d.netContributions["Deposit To Exchange"]).toEqual({ EUR: 1000 });
    expect(d.netContributions["Deposit"]).toEqual({});
    expect(d.netContributions["Transfer In"]).toEqual({ BTC: 1 });

    const report = formatDiagnosticReport(d, "4.4.0");
    expect(report).toContain("#### Net contribution breakdown");
    expect(report).toContain("- `Interest`: +0.5 BTC");
    expect(report).toContain("- `Exchange Credit`: [ignored] xUSD -14.1 → EUR +12 ×1");
    expect(report).toContain("- `Transfer In`: [ignored] BTC +1 ×1");
    expect(report).toContain("- `Exchange Liquidation`: -500 EUR");
    expect(report).toContain("- `Deposit To Exchange`: +1,000 EUR");
    expect(report).toContain("- `Deposit`: (none)");
  });
});

describe("demo CSV diagnostics", () => {
  it("reports zero unknown types and zero unexpected shapes on public demo CSV", () => {
    const demoCSV = readFileSync(
      resolve(__dirname, "../../public/nexo_demo_transactions.csv"),
      "utf-8"
    );
    const d = analyseCsv(demoCSV);
    expect(d.unknownTypes).toEqual([]);
    const unexpectedShapes = d.types.flatMap((t) =>
      t.shapes.filter((s) => !s.expected).map((s) => ({ type: t.name, ...s }))
    );
    expect(unexpectedShapes.length).toBe(0);

    const report = formatDiagnosticReport(d, "4.5.0");
    expect(report).not.toContain("_The app withheld:");
    expect(report).not.toContain("(size limit)");
  });
});

describe("LEGACY_TYPE_NAMES", () => {
  it("covers the twelve names seen in a pre-2023 export", () => {
    expect(LEGACY_TYPE_NAMES.size).toBe(12);
    expect(LEGACY_TYPE_NAMES.has("CreditCardStatus")).toBe(true);
    expect(LEGACY_TYPE_NAMES.has("Nexo Card Purchase")).toBe(false);
  });

  // The decision recorded at the top of csv-diagnostics.ts is that these names
  // identify an old file and never make one compute. Aliasing them would be a
  // one-line change in the balance path, so the boundary is asserted rather
  // than left to memory: renaming alone is not enough, because two of these
  // types also flipped sign convention between vintages.
  it("stays out of the balance and parsing path", async () => {
    const [balance, parser] = await Promise.all([
      import("./balance-calculator.ts?raw"),
      import("./csv-parser.ts?raw"),
    ]);
    for (const mod of [balance.default, parser.default]) {
      expect(mod).not.toContain("LEGACY_TYPE_NAMES");
      expect(mod).not.toContain("csv-diagnostics");
    }
  });
});

describe("prototype key hardening", () => {
  const PROTOTYPE_KEYS = ["constructor", "toString", "valueOf", "__proto__"] as const;

  for (const key of PROTOTYPE_KEYS) {
    it(`handles prototype key "${key}" as an unknown type without throwing`, () => {
      const csvData = csv(row(key));
      let d!: ReturnType<typeof analyseCsv>;
      expect(() => {
        d = analyseCsv(csvData);
      }).not.toThrow();

      expect(d.unknownTypes).toContain(key);
      const summary = d.types.find((t) => t.name === key);
      expect(summary).toBeDefined();
      expect(summary!.known).toBe(false);
      expect(summary!.handling).toBe("not recognised — counted as-is");
      for (const s of summary!.shapes) {
        expect(s.expected).toBe(false);
      }

      let report = "";
      expect(() => {
        report = formatDiagnosticReport(d, "4.4.0");
      }).not.toThrow();
      expect(report).toContain(`\`${key}\``);
      expect(report).toContain("**not recognised — counted as-is**");
      expect(report).toContain("(unexpected)");
    });
  }
});

describe("Report size bounding and section caps", () => {
  it("caps net contributions per type and indicates omitted currencies", () => {
    const rows = Array.from({ length: MAX_CONTRIBUTIONS_PER_TYPE + 5 }, (_, i) =>
      row("Interest", {
        ic: `CUR${i}`,
        ia: "1.0",
        oc: `CUR${i}`,
        oa: "1.0",
      })
    );
    const d = analyseCsv(csv(...rows));
    const report = formatDiagnosticReport(d, "4.4.0");
    expect(report).toContain("... and 5 more, omitted");
    expect(report).toContain(`showing the ${MAX_CONTRIBUTIONS_PER_TYPE} largest currencies per type`);
    expect(report).not.toContain("(size limit)");
  });

  it("caps global and per-type Credit Line values", () => {
    const HEADER_12 =
      "Transaction,Type,Credit Line,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC)";
    // Exceeds MAX_CREDIT_LINE_VALUES_GLOBAL = 50
    const rowsGlobal = Array.from({ length: MAX_CREDIT_LINE_VALUES_GLOBAL + 5 }, (_, i) =>
      `NXT${i},Interest,CL_VAL_${i},BTC,1.0,BTC,1.0,$1.00,-,-,"approved / test",2026-01-01 00:00:00`
    );
    const dGlobal = analyseCsv([HEADER_12, ...rowsGlobal].join("\n"));
    const reportGlobal = formatDiagnosticReport(dGlobal, "4.4.0");
    expect(reportGlobal).toContain("... and 5 more, omitted");
    expect(reportGlobal).toContain(`showing the ${MAX_CREDIT_LINE_VALUES_GLOBAL} most frequent global Credit Line values`);

    // Exceeds MAX_CREDIT_LINE_VALUES_PER_TYPE = 25
    const rowsPerType = Array.from({ length: MAX_CREDIT_LINE_VALUES_PER_TYPE + 10 }, (_, i) =>
      `NXT${i},Type_${i},SharedCard,BTC,1.0,BTC,1.0,$1.00,-,-,"approved / test",2026-01-01 00:00:00`
    );
    const dPerType = analyseCsv([HEADER_12, ...rowsPerType].join("\n"));
    const reportPerType = formatDiagnosticReport(dPerType, "4.4.0");
    expect(reportPerType).toContain("... and 10 more, omitted");
    expect(reportPerType).toContain(`showing at most ${MAX_CREDIT_LINE_VALUES_PER_TYPE} Credit Line values per type`);
  });

  it("truncates individual field values exceeding MAX_FIELD_VALUE_LENGTH", () => {
    const longCL = "A".repeat(50);
    const longCur = "B".repeat(50);
    const HEADER_12 =
      "Transaction,Type,Credit Line,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC)";
    const file = [
      HEADER_12,
      `NXT1,Interest,${longCL},${longCur},1.0,${longCur},1.0,$1.00,-,-,"approved / test",2026-01-01 00:00:00`,
    ].join("\n");
    const d = analyseCsv(file);
    const report = formatDiagnosticReport(d, "4.4.0");
    const reportWithoutSamples = report.split("#### Sample rows")[0];
    expect(reportWithoutSamples).not.toContain(longCL);
    expect(reportWithoutSamples).not.toContain(longCur);
    expect(report).toContain("A".repeat(MAX_FIELD_VALUE_LENGTH) + "…");
    expect(report).toContain("B".repeat(MAX_FIELD_VALUE_LENGTH) + "…");
  });

  it("bounds the synthetic 2,000-row report to well within MAX_REPORT_SIZE_BYTES", () => {
    const HEADER_12 =
      "Transaction,Type,Credit Line,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC)";
    const rows = [];
    for (let i = 0; i < 2000; i++) {
      const cl = "CL" + String(i).padStart(6, "0");
      const cur = "C" + String(i).padStart(4, "0");
      rows.push(`NXT${i},Interest,${cl},${cur},1.0,${cur},1.0,$1.00,-,-,"approved / test",2026-01-01 00:00:00`);
    }
    const d = analyseCsv([HEADER_12, ...rows].join("\n"));
    const report = formatDiagnosticReport(d, "4.4.0");
    const byteLength = new TextEncoder().encode(report).length;
    expect(byteLength).toBeLessThanOrEqual(MAX_REPORT_SIZE_BYTES);
    expect(report).toContain(`... and ${2000 - MAX_CONTRIBUTIONS_PER_TYPE} more, omitted`);
  });

  it("renders (unconfirmed) next to handling for inferred rules", () => {
    const fixture = csv(
      row("Deposit"),
      row("Interest Discount"),
      row("Exchange")
    );
    const d = analyseCsv(fixture);
    const report = formatDiagnosticReport(d, "4.5.0");
    expect(report).toContain("counted (unconfirmed)");
    expect(report).toContain("ignored (unconfirmed)");
    expect(report).not.toContain("`Exchange` | 1 | yes | counted (unconfirmed)");
  });

  it("fits a 30+ type file with mixed shapes with zero truncation and preserving sample rows", () => {
    const rows = [];
    for (const [type, rule] of Object.entries(TYPE_RULES)) {
      const shape = rule.expectedShapes[0];
      let ic = "BTC";
      let oc = "BTC";
      if (rule.expectedCurrencies?.input?.includes("credit-line")) {
        ic = "xUSD";
      }
      if (rule.expectedCurrencies?.output?.includes("credit-line")) {
        oc = "xUSD";
      } else if (shape.includes("diff")) {
        oc = "ETH";
      }
      let ia = "1.00", oa = "1.00";
      if (shape.startsWith("in-")) ia = "-1.00";
      if (shape.includes("out0")) { oa = "0"; oc = "-"; }
      rows.push(row(type, { ic, ia, oc, oa }));
    }
    // Add an unexpected shape sample row for Interest
    rows.push(row("Interest", { ia: "-5.00000000", details: "approved / negative interest row" }));

    const d = analyseCsv(csv(...rows));
    const report = formatDiagnosticReport(d, "4.5.0");
    const byteLength = new TextEncoder().encode(report).length;

    expect(byteLength).toBeLessThanOrEqual(MAX_REPORT_SIZE_BYTES);
    expect(report).toContain("#### Sample rows");
    expect(report).toContain("# Interest");
    expect(report).toContain("-5.00000000");
    expect(report).not.toContain("_The app withheld:");
    expect(report).not.toContain("_Nothing in this report has been altered or removed._");
  });

  it("produces a report with NO truncation notice, full contributions, and bounded gross flows on a realistic heavy file (30 types, 25 currencies, real timestamps)", () => {
    const CURRENCIES = [
      "BTC", "ETH", "NEXO", "USDT", "USDC", "EUR", "USD", "GBP", "SOL", "ADA",
      "DOT", "AVAX", "LINK", "MATIC", "LTC", "XRP", "BNB", "DOGE", "ATOM", "NEAR",
      "UNI", "DAI", "TRX", "XLM", "BCH",
    ];
    const types = Object.values(TransactionType).slice(0, 30);
    const rows: string[] = [];

    // Synthesize real timestamps spread across days and hours
    let day = 1;
    let hour = 0;
    for (const t of types) {
      for (const cur of CURRENCIES) {
        const dStr1 = `2026-01-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:00:00`;
        hour = (hour + 1) % 24;
        if (hour === 0) day = (day % 28) + 1;
        rows.push(row(t, { ic: cur, ia: "10.0", oc: cur, oa: "10.0", date: dStr1 }));

        // Introduce reversals/cancellations to create gross flow split entries
        const dStr2 = `2026-01-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:30:00`;
        rows.push(row(t, { ic: cur, ia: "-2.0", oc: cur, oa: "0", date: dStr2 }));
      }
    }

    const d = analyseCsv(csv(...rows));
    expect(d.types.length).toBeGreaterThanOrEqual(30);

    const report = formatDiagnosticReport(d, "4.5.0");
    const byteLength = new TextEncoder().encode(report).length;

    // Report is well within the backstop
    expect(byteLength).toBeLessThanOrEqual(MAX_REPORT_SIZE_BYTES);

    // NO truncation notice: no size limit warnings or omitted sections due to size
    expect(report).not.toContain("(size limit)");
    expect(report).not.toContain("omitted to keep report within size limit");
    expect(report).not.toContain("Report truncated deterministically");

    // Net contribution breakdown has NO "... and N more" on contributions
    const netContribSection = report.split("#### Net contribution breakdown")[1]?.split("####")[0] ?? "";
    expect(netContribSection).not.toContain("more, omitted");

    // The gross flow section is bounded on that same file and names how many lines it omitted
    expect(report).toContain("#### Gross flow breakdown");
    expect(d.grossSplits.length).toBeGreaterThan(MAX_GROSS_FLOW_ENTRIES);
    const expectedOmittedGross = d.grossSplits.length - MAX_GROSS_FLOW_ENTRIES;
    expect(report).toContain(`... and ${expectedOmittedGross} more, omitted`);

    // The omission footer names the gross flow fixed cap without attributing it to size limit
    expect(report).toContain(`showing the ${MAX_GROSS_FLOW_ENTRIES} largest gross flows`);
  });

  it("bounds a deliberately pathological file genuinely <= backstop while preserving sample rows and unexpected flags and dropping gross flows and temporal transitions first", () => {
    // Deliberately pathological file: many unrecognised types AND many shapes,
    // plus temporal transitions and cancellations that would blow well past 100 KB in full stage 0.
    const rows: string[] = [];
    // 50 baseline rows to establish temporal scale
    for (let i = 0; i < 50; i++) {
      rows.push(row("Deposit", { ic: "BTC", ia: "1.0", oc: "BTC", oa: "1.0", date: `2026-01-01 ${String(i % 24).padStart(2, "0")}:00:00` }));
    }

    // 160 unrecognised types, each having multiple shapes, generating sample rows,
    // transitions, and cancellations
    for (let i = 0; i < 160; i++) {
      const typeName = `PathoType_${i}`;
      const day = String((i % 25) + 2).padStart(2, "0");
      for (let s = 0; s < 6; s++) {
        // Unexpected shapes
        rows.push(
          row(typeName, {
            ic: `CUR_${i}_${s}`,
            ia: s % 2 === 0 ? "-10.0" : "10.0",
            oc: `CUR_${i}_${(s + 1) % 6}`,
            oa: "5.0",
            details: `approved / sample ${typeName} shape ${s} ${"X".repeat(30)}`,
            date: `2026-01-${day} 12:00:00`,
          })
        );
        // Cancellation row
        rows.push(
          row(typeName, {
            ic: `CUR_${i}_${s}`,
            ia: s % 2 === 0 ? "10.0" : "-10.0",
            oc: `CUR_${i}_${s}`,
            oa: "0",
            details: `approved / cancel ${typeName} shape ${s}`,
            date: `2026-01-${day} 13:00:00`,
          })
        );
      }
    }

    const d = analyseCsv(csv(...rows));
    expect(d.unknownTypes.length).toBe(160);
    expect(d.sampleRows.length).toBeGreaterThan(0);
    expect(d.temporal.transitions.length).toBeGreaterThan(0);
    expect(d.grossSplits.length).toBeGreaterThan(0);

    const report = formatDiagnosticReport(d, "4.5.0");
    const byteLength = new TextEncoder().encode(report).length;

    // Genuinely bounded to <= MAX_REPORT_SIZE_BYTES
    expect(byteLength).toBeLessThanOrEqual(MAX_REPORT_SIZE_BYTES);

    // Gross flows and temporal transitions were dropped first to stay within limit
    expect(report).not.toContain("#### Gross flow breakdown");
    expect(report).not.toContain("#### Temporal transitions");
    expect(report).toContain("temporal transitions (size limit)");
    expect(report).toContain("gross flow breakdown (size limit)");

    // Sample rows and unexpected flags SURVIVED
    expect(report).toContain("#### Sample rows");
    expect(report).toContain("# PathoType_");
    expect(report).toContain("(unexpected)");
  });

  it("deterministically bounds the report if even the minimal stage exceeds the backstop", () => {
    // Pathological extreme: 300 unknown types with very long names that blow past 100 KB even when stripped of all optional sections
    const rows: string[] = [];
    for (let i = 0; i < 300; i++) {
      const typeName = `PathologicalExtremeNovelType_Index_${i}_${"Z".repeat(200)}`;
      rows.push(
        row(typeName, {
          ic: "BTC",
          ia: "1.0",
          oc: "BTC",
          oa: "1.0",
          details: `approved / extreme row ${i}`,
          date: "2026-01-01 00:00:00",
        })
      );
    }
    const d = analyseCsv(csv(...rows));
    const report = formatDiagnosticReport(d, "4.5.0");
    const byteLength = new TextEncoder().encode(report).length;

    expect(byteLength).toBeLessThanOrEqual(MAX_REPORT_SIZE_BYTES);
    expect(report).toContain("Report truncated deterministically to stay within size limit");
  });

  it("names a per-type cap distinctly from a size truncation in the omission footer", () => {
    // 105 currencies for a single type: triggers MAX_CONTRIBUTIONS_PER_TYPE = 100
    // Total size is small (~5 KB), so no size limit truncation occurs.
    const rows = Array.from({ length: MAX_CONTRIBUTIONS_PER_TYPE + 5 }, (_, i) =>
      row("Interest", {
        ic: `CUR${i}`,
        ia: "1.0",
        oc: `CUR${i}`,
        oa: "1.0",
      })
    );
    const d = analyseCsv(csv(...rows));
    const report = formatDiagnosticReport(d, "4.5.0");

    expect(report).toContain(`showing the ${MAX_CONTRIBUTIONS_PER_TYPE} largest currencies per type`);
    expect(report).not.toContain("(size limit)");
  });
});

// The report only emits a withholding note if content was withheld or bucketed.
describe("the report's claim about its own fidelity", () => {
  const withDetails = (details: string) =>
    csv(row("Interest", { details }));

  it("emits nothing about withholding when nothing was withheld", () => {
    const report = formatDiagnosticReport(analyseCsv(withDetails("approved / BTC Interest")), "4.5.0");
    expect(report).not.toContain("_Nothing in this report has been altered or removed._");
    expect(report).not.toContain("_The app withheld:");
  });

  it("emits positive withholding notice when a detail prefix was bucketed as (other)", () => {
    const report = formatDiagnosticReport(analyseCsv(withDetails("someone@example.com / transfer")), "4.5.0");
    expect(report).not.toContain("_Nothing in this report has been altered or removed._");
    expect(report).toContain("_The app withheld:");
    expect(report).toContain('replaced with "(other)"');
    // ...and the value that forced the bucketing is still gone from the report.
    expect(report).not.toContain("someone@example.com");
  });
});

describe("currency classification and expectation diagnostics", () => {
  it("normalises EURX/USDX/GBPX before classifying as known, not unknown", () => {
    expect(classifyCurrency("EURX")).toBe("known");
    expect(classifyCurrency("USDX")).toBe("known");
    expect(classifyCurrency("GBPX")).toBe("known");
    expect(classifyCurrency("EUR")).toBe("known");
    expect(classifyCurrency("USD")).toBe("known");
    expect(classifyCurrency("GBP")).toBe("known");

    // Regression guard on Deposit To Exchange normalisation order
    const depositRow = row("Deposit To Exchange", {
      ic: "EUR",
      ia: "1000.00",
      oc: "EURX",
      oa: "1000.00",
      details: "approved / fiat deposit",
    });
    const d = analyseCsv(csv(depositRow));
    const summary = d.types.find((t) => t.name === "Deposit To Exchange");
    expect(summary).toBeDefined();
    expect(summary!.shapes[0].expected).toBe(true);
    expect(d.sampleRows).toHaveLength(0);
  });

  it("classifies credit-line units matching /^x[A-Z]{3}$/", () => {
    expect(classifyCurrency("xUSD")).toBe("credit-line");
    expect(classifyCurrency("xEUR")).toBe("credit-line");
    expect(classifyCurrency("xGBP")).toBe("credit-line");
  });

  it("treats '' and '-' as absent, not unknown, and does not flag them", () => {
    expect(classifyCurrency("")).toBe("absent");
    expect(classifyCurrency("-")).toBe("absent");
    expect(classifyCurrency("   ")).toBe("absent");
    expect(classifyCurrency(undefined)).toBe("absent");

    // Transfer To Advanced has expectedShape 'in- out0 diff' and output currency '-'
    const transferRow = row("Transfer To Advanced", {
      ic: "USDC",
      ia: "-100.00",
      oc: "-",
      oa: "0",
      details: "approved / transfer to futures",
    });
    const dTransfer = analyseCsv(csv(transferRow));
    const transferSummary = dTransfer.types.find((t) => t.name === "Transfer To Advanced");
    expect(transferSummary).toBeDefined();
    expect(transferSummary!.shapes[0].expected).toBe(true);
    expect(dTransfer.sampleRows).toHaveLength(0);

    // Empty string output currency on Transfer From Advanced
    const transferFromRow = row("Transfer From Advanced", {
      ic: "BTC",
      ia: "0.001",
      oc: "",
      oa: "0",
      details: "approved / transfer from futures",
    });
    const dTransferFrom = analyseCsv(csv(transferFromRow));
    const transferFromSummary = dTransferFrom.types.find((t) => t.name === "Transfer From Advanced");
    expect(transferFromSummary).toBeDefined();
    expect(transferFromSummary!.shapes[0].expected).toBe(true);
    expect(dTransferFrom.sampleRows).toHaveLength(0);
  });

  it("flags and samples novel currency on a known type", () => {
    const novelRow = row("Interest", {
      ic: "WBTC2",
      ia: "0.01000000",
      oc: "WBTC2",
      oa: "0.01000000",
      details: "approved / novel asset row",
    });
    const d = analyseCsv(csv(novelRow));
    const summary = d.types.find((t) => t.name === "Interest");
    expect(summary).toBeDefined();
    expect(summary!.shapes).toHaveLength(1);
    expect(summary!.shapes[0].expected).toBe(false);
    expect(summary!.shapes[0].reason).toBe("WBTC2 is not a known asset");

    const report = formatDiagnosticReport(d, "4.5.0");
    expect(report).toContain(
      "**in+ out+ same ×1 (unexpected: WBTC2 is not a known asset)**"
    );
    expect(report).toContain("#### Sample rows");
    expect(report).toContain("# Interest");
    expect(report).toContain("WBTC2");
  });

  it("flags a card purchase whose input is a held asset (Debit Mode shape)", () => {
    const debitCardRow = row("Nexo Card Purchase", {
      ic: "BTC",
      ia: "-0.00100000",
      oc: "EUR",
      oa: "60.00",
      details: "approved / debit mode merchant",
    });
    const d = analyseCsv(csv(debitCardRow));
    const summary = d.types.find((t) => t.name === "Nexo Card Purchase");
    expect(summary).toBeDefined();
    expect(summary!.shapes[0].expected).toBe(false);
    expect(summary!.shapes[0].reason).toBe("input BTC is not a credit-line unit");

    const report = formatDiagnosticReport(d, "4.5.0");
    expect(report).toContain(
      "in- out+ diff ×1 (unexpected, no effect on balances: input BTC is not a credit-line unit)"
    );
    expect(report).not.toContain(
      "**in- out+ diff ×1"
    );
    expect(report).toContain("#### Sample rows");
    expect(report).toContain("# Nexo Card Purchase");
    expect(report).toContain("BTC");
  });

  it("flags a reversed Exchange Liquidation", () => {
    const reversedRow = row("Exchange Liquidation", {
      ic: "xUSD",
      ia: "577.25",
      oc: "EURX",
      oa: "500.00",
      details: "approved / reversed liquidation",
    });
    const d = analyseCsv(csv(reversedRow));
    const summary = d.types.find((t) => t.name === "Exchange Liquidation");
    expect(summary).toBeDefined();
    expect(summary!.shapes[0].expected).toBe(false);
    expect(summary!.shapes[0].reason).toBe("input xUSD is a credit-line unit");

    const report = formatDiagnosticReport(d, "4.5.0");
    expect(report).toContain(
      "**in+ out+ diff ×1 (unexpected: input xUSD is a credit-line unit)**"
    );
    expect(report).toContain("#### Sample rows");
    expect(report).toContain("# Exchange Liquidation");
  });

  it("does not flag a normal Exchange Liquidation (EURX -> xUSD)", () => {
    const normalRow = row("Exchange Liquidation", {
      ic: "EURX",
      ia: "500.00",
      oc: "xUSD",
      oa: "577.25",
      details: "approved / normal liquidation",
    });
    const d = analyseCsv(csv(normalRow));
    const summary = d.types.find((t) => t.name === "Exchange Liquidation");
    expect(summary).toBeDefined();
    expect(summary!.shapes).toHaveLength(1);
    expect(summary!.shapes[0].expected).toBe(true);
    expect(summary!.shapes[0].reason).toBeUndefined();
    expect(d.sampleRows).toHaveLength(0);

    const report = formatDiagnosticReport(d, "4.5.0");
    expect(report).toContain("in+ out+ diff ×1");
    expect(report).not.toContain("(unexpected");
    expect(report).not.toContain("#### Sample rows");
  });

  it("produces zero unexpected shapes and zero unknown types on the demo fixture", () => {
    const demoCSV = readFileSync(
      resolve(__dirname, "../../public/nexo_demo_transactions.csv"),
      "utf-8"
    );
    const d = analyseCsv(demoCSV);
    expect(d.unknownTypes).toEqual([]);
    const unexpectedShapes = d.types.flatMap((t) =>
      t.shapes.filter((s) => !s.expected).map((s) => ({ type: t.name, ...s }))
    );
    expect(unexpectedShapes).toEqual([]);
    expect(d.sampleRows).toHaveLength(0);
  });

  it("flags only the rows that warrant it on a broad credit-line fixture", () => {
    // Assets: BTC, ETH, USDC, USDT, NEXO, BNB, EUR, USD (known), xUSD (credit-line), NETH (unknown)
    const fixtureRows = [
      row("Interest", { ic: "BTC", ia: "0.001", oc: "BTC", oa: "0.001" }),
      row("Exchange", { ic: "ETH", ia: "-0.5", oc: "USDT", oa: "1500" }),
      row("Credit Card Withdrawal Credit", { ic: "xUSD", ia: "-14.07", oc: "xUSD", oa: "14.07" }),
      row("Exchange Credit", { ic: "xUSD", ia: "-14.07", oc: "EURX", oa: "12.00" }),
      row("Nexo Card Purchase", { ic: "xUSD", ia: "-14.07", oc: "EURX", oa: "12.00" }),
      row("Nexo Card Transaction Fee", { ic: "xUSD", ia: "-0.35", oc: "xUSD", oa: "0.35" }),
      row("Exchange Liquidation", { ic: "EURX", ia: "500.00", oc: "xUSD", oa: "577.25" }),
      row("Deposit To Exchange", { ic: "EUR", ia: "1000", oc: "EURX", oa: "1000" }),
      row("Withdrawal", { ic: "USDC", ia: "-500", oc: "USDC", oa: "500" }),
      row("Top up Crypto", { ic: "BNB", ia: "2.0", oc: "BNB", oa: "2.0" }),
      row("Dividend", { ic: "NEXO", ia: "50", oc: "NEXO", oa: "50" }),
      row("Manual Sell Order", { ic: "USD", ia: "-100", oc: "USD", oa: "0" }),
      row("Exchange Collateral", { ic: "NETH", ia: "-0.26450338", oc: "ETH", oa: "0.26450338", details: "approved / collateral swap" }),
    ];
    const d = analyseCsv(csv(...fixtureRows));
    const unexpectedFlags = d.types.flatMap((t) =>
      t.shapes.filter((s) => !s.expected).map((s) => ({ type: t.name, ...s }))
    );
    // NETH is not a known asset, and is the only row that should flag
    expect(unexpectedFlags).toHaveLength(1);
    expect(unexpectedFlags[0].type).toBe("Exchange Collateral");
    expect(unexpectedFlags[0].reason).toBe("NETH is not a known asset");

    const report = formatDiagnosticReport(d, "4.5.0");
    const byteLength = new TextEncoder().encode(report).length;
    expect(byteLength).toBeLessThanOrEqual(MAX_REPORT_SIZE_BYTES);
    expect(report).toContain("#### Sample rows");
    expect(report).toContain("# Exchange Collateral");
    expect(report).toContain("NETH");
  });
});

describe("Section A: Ingestion coverage", () => {
  it("records skipped blank IDs with 1-based row ordinal and column name", () => {
    const csvContent = [
      CURRENT_HEADER,
      ',Interest,BTC,1.00000000,BTC,1.00000000,$1.00,-,-,"approved / test",2026-01-15 00:00:00',
      'NXT2,Deposit,BTC,2.00000000,BTC,2.00000000,$2.00,-,-,"approved / test",2026-01-15 00:00:00',
    ].join("\n");
    const d = analyseCsv(csvContent);
    expect(d.ingestion.csvRows).toBe(2);
    expect(d.ingestion.parsed).toBe(1);
    expect(d.ingestion.skippedBlankIds).toBe(1);
    expect(d.ingestion.firstSkippedBlankIdRow).toEqual({ rowOrdinal: 1, column: "Transaction" });

    const report = formatDiagnosticReport(d, "4.5.0");
    expect(report).toContain("Ingest: CSV rows=2; parsed=1; skipped blank ids=1 (row 1, Transaction); unparseable numbers=0; invalid dates=0.");
  });

  it("records unparseable numbers with row ordinal and column name", () => {
    const csvContent = [
      CURRENT_HEADER,
      'NXT1,Interest,BTC,not-a-number,BTC,1.00000000,$1.00,-,-,"approved / test",2026-01-15 00:00:00',
    ].join("\n");
    const d = analyseCsv(csvContent);
    expect(d.ingestion.unparseableNumbers).toBe(1);
    expect(d.ingestion.firstUnparseableNumberRow).toEqual({ rowOrdinal: 1, column: "Input Amount" });

    const report = formatDiagnosticReport(d, "4.5.0");
    expect(report).toContain("unparseable numbers=1 (row 1, Input Amount)");
  });

  it("records invalid dates with row ordinal and column name", () => {
    const csvContent = [
      CURRENT_HEADER,
      'NXT1,Interest,BTC,1.00000000,BTC,1.00000000,$1.00,-,-,"approved / test",not-a-date',
    ].join("\n");
    const d = analyseCsv(csvContent);
    expect(d.ingestion.invalidDates).toBe(1);
    expect(d.ingestion.firstInvalidDateRow).toEqual({ rowOrdinal: 1, column: "Date / Time (UTC)" });

    const report = formatDiagnosticReport(d, "4.5.0");
    expect(report).toContain("invalid dates=1 (row 1, Date / Time (UTC))");
  });
});

describe("Section B: Relationships", () => {
  it("suppresses relationship claims on degenerate single-timestamp files", () => {
    const d = analyseCsv(
      csv(
        row("Exchange Credit", { ic: "xUSD", ia: "-10.0", oc: "EURX", oa: "10.0", date: "2026-01-15 10:00:00" }),
        row("Nexo Card Purchase", { ic: "xUSD", ia: "-10.0", oc: "EURX", oa: "10.0", date: "2026-01-15 10:00:00" })
      )
    );
    expect(d.relationships.allRowsShareTimestamp).toBe(true);
    expect(d.relationships.matches).toHaveLength(0);

    const report = formatDiagnosticReport(d, "4.5.0");
    expect(report).toContain("Links: all rows share one timestamp; temporal matching disabled.");
    expect(report).not.toContain("#### Linked rows");
    expect(report).not.toContain("Pairings");
  });

  it("reports matched, unmatched, and ambiguous counts on multi-timestamp files", () => {
    const d = analyseCsv(
      csv(
        // Timestamp 1: clear 1-to-1 match between Exchange Credit and Nexo Card Purchase
        row("Exchange Credit", { ic: "xUSD", ia: "-10.0", oc: "EURX", oa: "10.0", date: "2026-01-15 10:00:00" }),
        row("Nexo Card Purchase", { ic: "xUSD", ia: "-10.0", oc: "EURX", oa: "10.0", date: "2026-01-15 10:00:00" }),
        // Timestamp 2: clear 1-to-1 match
        row("Exchange Credit", { ic: "xUSD", ia: "-25.0", oc: "EURX", oa: "25.0", date: "2026-01-16 10:00:00" }),
        row("Nexo Card Purchase", { ic: "xUSD", ia: "-25.0", oc: "EURX", oa: "25.0", date: "2026-01-16 10:00:00" }),
        // Timestamp 3: ambiguous match (two purchases for same amount)
        row("Exchange Credit", { ic: "xUSD", ia: "-50.0", oc: "EURX", oa: "50.0", date: "2026-01-17 10:00:00" }),
        row("Nexo Card Purchase", { ic: "xUSD", ia: "-50.0", oc: "EURX", oa: "50.0", date: "2026-01-17 10:00:00" }),
        row("Nexo Card Purchase", { ic: "xUSD", ia: "-50.0", oc: "EURX", oa: "50.0", date: "2026-01-17 10:00:00" }),
        // Timestamp 4: unmatched purchase
        row("Nexo Card Purchase", { ic: "xUSD", ia: "-99.0", oc: "EURX", oa: "99.0", date: "2026-01-18 10:00:00" })
      )
    );
    expect(d.relationships.allRowsShareTimestamp).toBe(false);
    expect(d.relationships.matches.length).toBeGreaterThan(0);
    const match = d.relationships.matches.find(
      (m) => (m.type1 === "Nexo Card Purchase" && m.type2 === "Exchange Credit") ||
             (m.type1 === "Exchange Credit" && m.type2 === "Nexo Card Purchase")
    );
    expect(match).toBeDefined();
    expect(match!.matchedCount).toBeGreaterThanOrEqual(2);
    expect(match!.ambiguousGroups).toBeGreaterThanOrEqual(1);

    const report = formatDiagnosticReport(d, "4.5.0");
    expect(report).toContain("#### Relationships");
    expect(report).toContain("3 matched, 2 unmatched");
    expect(report).toContain("1 group ambiguous");
  });
});

describe("Section C: Fee census", () => {
  it("summarises absent fees compactly", () => {
    const d = analyseCsv(
      csv(
        row("Interest", { details: "approved / test 1" }),
        row("Deposit", { details: "approved / test 2" })
      )
    );
    expect(d.feeCensus.absent).toBe(2);
    expect(d.feeCensus.nonzero).toBe(0);
    const report = formatDiagnosticReport(d, "4.5.0");
    expect(report).toContain("Fees: absent=2; zero=0; nonzero=0; invalid=0.");
  });

  it("reports fee totals, currency, and leg matching when fees are present", () => {
    const HEADER =
      "Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC)";
    const rows = [
      'NXT1,Exchange,ETH,-1.0,BTC,0.05,$1500,0.001,ETH,"approved / trade",2026-01-15 00:00:00',
      'NXT2,Exchange,ETH,-2.0,BTC,0.10,$3000,0.002,ETH,"approved / trade",2026-01-16 00:00:00',
    ];
    const d = analyseCsv([HEADER, ...rows].join("\n"));
    expect(d.feeCensus.nonzero).toBe(2);
    expect(d.feeCensus.byType["Exchange"]).toBeDefined();
    const feeInfo = d.feeCensus.byType["Exchange"]!;
    expect(feeInfo.count).toBe(2);
    expect(feeInfo.total).toBeCloseTo(0.003);
    expect(feeInfo.currency).toBe("ETH");
    expect(feeInfo.legMatch).toBe("matches input leg");

    const report = formatDiagnosticReport(d, "4.5.0");
    expect(report).toContain("#### Fees");
    expect(report).toContain("- Exchange: 2 fees, total 0.003 ETH (matches input leg).");
  });
});

describe("Section D: Status vs exclusion and disagreements", () => {
  it("omits separate Detail prefixes section when all rows share one status", () => {
    const d = analyseCsv(
      csv(
        row("Interest", { details: "approved / 1" }),
        row("Interest", { details: "approved / 2" }),
        row("Deposit", { details: "approved / 3" })
      )
    );
    expect(d.status.counts).toEqual({ approved: 3 });
    expect(d.status.disagreements).toBe(0);
    const report = formatDiagnosticReport(d, "4.5.0");
    expect(report).toContain("Status: approved=3; excluded by calculator=0; disagreements=0.");
    expect(report).not.toContain("#### Detail prefixes");
  });

  it("detects status disagreements between leading status and calculator exclusion", () => {
    const d = analyseCsv(
      csv(
        // "cancelled" implies failure, but is NOT in EXCLUDED_DETAIL_STATUSES (which only has pending, rejected)
        row("Interest", { details: "cancelled / transaction cancelled by user" })
      )
    );
    expect(d.status.disagreements).toBe(1);
    expect(d.status.disagreementTypes).toContain("Interest");

    const report = formatDiagnosticReport(d, "4.5.0");
    expect(report).toContain("disagreements=1 (affected types: Interest)");
  });
});

describe("Section E: Duplicates", () => {
  it("reports clean duplicates summary when no rows duplicate", () => {
    const d = analyseCsv(
      [
        CURRENT_HEADER,
        'NXT1,Interest,BTC,1.00000000,BTC,1.00000000,$1.00,-,-,"approved / 1",2026-01-15 00:00:00',
        'NXT2,Interest,BTC,2.00000000,BTC,2.00000000,$2.00,-,-,"approved / 2",2026-01-15 00:00:00',
      ].join("\n")
    );
    expect(d.duplicates.identicalFullRows).toBe(0);
    expect(d.duplicates.repeatedIds).toBe(0);
    expect(d.duplicates.identicalIgnoringIdGroups).toBe(0);
    const report = formatDiagnosticReport(d, "4.5.0");
    expect(report).toContain("Duplicates: identical full rows=0; repeated ids=0; identical ignoring id=0 in 0 groups (not proof).");
  });

  it("detects conflicting repeated IDs and identical ignoring ID rows", () => {
    const csvContent = [
      CURRENT_HEADER,
      // Repeated ID NXT1 with different content
      'NXT1,Interest,BTC,1.00000000,BTC,1.00000000,$1.00,-,-,"approved / 1",2026-01-15 00:00:00',
      'NXT1,Interest,BTC,2.00000000,BTC,2.00000000,$2.00,-,-,"approved / 2",2026-01-15 00:00:00',
      // Identical rows ignoring ID (NXT2 and NXT3 have identical content)
      'NXT2,Deposit,ETH,5.00000000,ETH,5.00000000,$5.00,-,-,"approved / dep",2026-01-16 00:00:00',
      'NXT3,Deposit,ETH,5.00000000,ETH,5.00000000,$5.00,-,-,"approved / dep",2026-01-16 00:00:00',
    ].join("\n");
    const d = analyseCsv(csvContent);
    expect(d.duplicates.repeatedIds).toBe(1);
    expect(d.duplicates.repeatedIdsConflicting).toBe(1);
    expect(d.duplicates.repeatedIdsConflictingTypes).toContain("Interest");
    expect(d.duplicates.identicalIgnoringIdGroups).toBe(1);
    expect(d.duplicates.identicalIgnoringIdRows).toBe(2);

    const report = formatDiagnosticReport(d, "4.5.0");
    expect(report).toContain("#### Duplicates");
    expect(report).toContain("repeated ids=1 (1 conflicting content, types: Interest)");
    expect(report).toContain("identical ignoring id=2 in 1 groups (not proof)");
  });
});

describe("Section F: Temporal transitions", () => {
  it("emits single timestamp notice when all dates are identical", () => {
    const d = analyseCsv(
      csv(
        row("Interest", { date: "2026-01-15 00:00:00" }),
        row("Deposit", { date: "2026-01-15 00:00:00" })
      )
    );
    expect(d.temporal.allRowsShareTimestamp).toBe(true);
    expect(d.temporal.transitions).toHaveLength(0);
    const report = formatDiagnosticReport(d, "4.5.0");
    expect(report).toContain("Transitions: all rows share one timestamp; temporal analysis not possible.");
  });

  it("detects transitions when a subgroup starts or stops mid-history", () => {
    // 20 rows of Deposit, followed by 10 rows of Nexo Card Purchase
    const rows: string[] = [];
    for (let i = 1; i <= 20; i++) {
      const day = String(i).padStart(2, "0");
      rows.push(`NXT_DEP_${i},Deposit,BTC,1.0,BTC,1.0,$1.00,-,-,"approved / dep",2026-01-${day} 00:00:00`);
    }
    for (let i = 1; i <= 10; i++) {
      const day = String(i).padStart(2, "0");
      rows.push(`NXT_CARD_${i},Nexo Card Purchase,xUSD,-10.0,EURX,10.0,$10.00,-,-,"approved / card",2026-02-${day} 00:00:00`);
    }
    const d = analyseCsv([CURRENT_HEADER, ...rows].join("\n"));
    expect(d.temporal.allRowsShareTimestamp).toBe(false);
    expect(d.temporal.transitions.length).toBeGreaterThan(0);
    const startedTransition = d.temporal.transitions.find(
      (t) => t.subgroup === "Nexo Card Purchase (in- out+ diff)" && t.kind === "started"
    );
    expect(startedTransition).toBeDefined();
    expect(startedTransition!.date).toBe("2026-02-01");

    const report = formatDiagnosticReport(d, "4.5.0");
    expect(report).toContain("#### Temporal transitions");
    expect(report).toContain("Nexo Card Purchase (in- out+ diff): started 2026-02-01");
  });
});

describe("Section G: Gross vs net flows & USD anomalies", () => {
  it("reports gross flow breakdown on cancelling flows and negative interest", () => {
    const d = analyseCsv(
      csv(
        // Cancelling Deposit flow
        row("Deposit", { ic: "ETH", ia: "2.0", oc: "ETH", oa: "2.0" }),
        row("Deposit", { ic: "ETH", ia: "-0.5", oc: "ETH", oa: "-0.5" }),
        // Negative interest flow
        row("Interest", { ic: "BTC", ia: "-0.01", oc: "BTC", oa: "0.01" }),
        row("Interest", { ic: "BTC", ia: "0.05", oc: "BTC", oa: "0.05" })
      )
    );
    expect(d.grossSplits.length).toBeGreaterThanOrEqual(2);
    const depositEth = d.grossSplits.find((g) => g.type === "Deposit" && g.currency === "ETH");
    expect(depositEth).toBeDefined();
    expect(depositEth!.posCount).toBe(1);
    expect(depositEth!.negCount).toBe(1);

    const interestBtc = d.grossSplits.find((g) => g.type === "Interest" && g.currency === "BTC");
    expect(interestBtc).toBeDefined();
    expect(interestBtc!.negCount).toBe(1);

    const report = formatDiagnosticReport(d, "4.5.0");
    expect(report).toContain("#### Gross flow breakdown");
    expect(report).toContain("Deposit ETH: negative=1/");
    expect(report).toContain("positive=1/");
    expect(report).toContain("Interest BTC: negative=1/");
  });

  it("detects missing, malformed, and conspicuous repetition in USD equivalents", () => {
    const rows: string[] = [];
    // 10 rows with exact same USD value "$99.00"
    for (let i = 1; i <= 10; i++) {
      rows.push(`NXT_${i},Interest,BTC,1.0,BTC,1.0,$99.00,-,-,"approved / test",2026-01-15 00:00:00`);
    }
    // 1 missing USD
    rows.push(`NXT_MISS,Interest,BTC,1.0,BTC,1.0,-,-,-,"approved / test",2026-01-15 00:00:00`);
    // 1 malformed USD
    rows.push(`NXT_MAL,Interest,BTC,1.0,BTC,1.0,invalid_usd,-,-,"approved / test",2026-01-15 00:00:00`);

    const d = analyseCsv([CURRENT_HEADER, ...rows].join("\n"));
    expect(d.usdEquivalent.missing).toBe(1);
    expect(d.usdEquivalent.malformed).toBe(1);
    expect(d.usdEquivalent.conspicuousRepetition).toBeDefined();
    expect(d.usdEquivalent.conspicuousRepetition!.value).toBe("$99.00");
    expect(d.usdEquivalent.conspicuousRepetition!.count).toBe(10);

    const report = formatDiagnosticReport(d, "4.5.0");
    expect(report).toContain('USD Equivalent: missing=1; malformed=1; conspicuous repetition: "$99.00" in 10 rows');
  });
});

describe("Ordering: Exceptional types sorted first", () => {
  it("places exceptional types before routine types in d.types and in the markdown table", () => {
    // 50 rows of routine Fixed Term Interest, 1 row of unexpected shape Interest, 1 row of unknown type Mystery
    const rows: string[] = [];
    for (let i = 0; i < 50; i++) {
      rows.push(`NXT_FTI${i},Fixed Term Interest,BTC,1.0,BTC,1.0,$1.00,-,-,"approved / fti",2026-01-15 00:00:00`);
    }
    rows.push(`NXT_INT,Interest,BTC,-5.0,BTC,1.0,$1.00,-,-,"approved / int",2026-01-15 00:00:00`);
    rows.push(`NXT_MYS,Mystery,BTC,1.0,BTC,1.0,$1.00,-,-,"approved / mys",2026-01-15 00:00:00`);

    const d = analyseCsv([CURRENT_HEADER, ...rows].join("\n"));
    // Interest has unexpected shape -> exceptional
    // Mystery is unrecognised -> exceptional
    // Fixed Term Interest is routine (even though it has 50 rows vs 1 row)
    expect(isExceptionalType(d.types.find((t) => t.name === "Interest")!)).toBe(true);
    expect(isExceptionalType(d.types.find((t) => t.name === "Mystery")!)).toBe(true);
    expect(isExceptionalType(d.types.find((t) => t.name === "Fixed Term Interest")!)).toBe(false);

    // In d.types, both exceptional types appear before Fixed Term Interest
    const interestIdx = d.types.findIndex((t) => t.name === "Interest");
    const mysteryIdx = d.types.findIndex((t) => t.name === "Mystery");
    const ftiIdx = d.types.findIndex((t) => t.name === "Fixed Term Interest");

    expect(interestIdx).toBeLessThan(ftiIdx);
    expect(mysteryIdx).toBeLessThan(ftiIdx);

    // In formatted markdown table, the rows also appear in exceptional-first order
    const report = formatDiagnosticReport(d, "4.5.0");
    const tablePart = report.slice(report.indexOf("#### Transaction types"));
    const intPos = tablePart.indexOf("`Interest`");
    const mysPos = tablePart.indexOf("`Mystery`");
    const ftiPos = tablePart.indexOf("`Fixed Term Interest`");

    expect(intPos).toBeLessThan(ftiPos);
    expect(mysPos).toBeLessThan(ftiPos);
  });
});


describe("report formatting hygiene", () => {
  it("ends with exactly one trailing newline so it pastes cleanly", () => {
    const report = formatDiagnosticReport(analyseCsv(csv(row("Interest"))), "4.5.0");
    expect(report.endsWith("\n")).toBe(true);
    expect(report.endsWith("\n\n")).toBe(false);
  });
});

describe("currency normalisation and shape diagnostics (Issue #84)", () => {
  it("EUR -> EURX reports shape 'same', not 'diff', and does not flag", () => {
    const r = {
      "Input Currency": "EUR",
      "Input Amount": "500",
      "Output Currency": "EURX",
      "Output Amount": "500",
    };
    expect(shapeOf(r)).toBe("in+ out+ same");

    const d = analyseCsv(
      csv(row("Deposit To Exchange", { ic: "EUR", ia: "500", oc: "EURX", oa: "500" }))
    );
    const summary = d.types.find((t) => t.name === "Deposit To Exchange")!;
    expect(summary).toBeDefined();
    expect(summary.shapes[0].pattern).toBe("in+ out+ same");
    expect(summary.shapes[0].expected).toBe(true);
    expect(d.sampleRows).toHaveLength(0);
  });

  it("the reverse EURX -> EUR reports shape 'same', not 'diff', and does not flag", () => {
    const r = {
      "Input Currency": "EURX",
      "Input Amount": "500",
      "Output Currency": "EUR",
      "Output Amount": "500",
    };
    expect(shapeOf(r)).toBe("in+ out+ same");

    const d = analyseCsv(
      csv(row("Exchange To Withdraw", { ic: "EURX", ia: "500", oc: "EUR", oa: "500" }))
    );
    const summary = d.types.find((t) => t.name === "Exchange To Withdraw")!;
    expect(summary).toBeDefined();
    expect(summary.shapes[0].pattern).toBe("in+ out+ same");
    expect(summary.shapes[0].expected).toBe(true);
    expect(d.sampleRows).toHaveLength(0);
  });

  it("GBPX / USDX pairs report shape 'same', not 'diff', and do not flag", () => {
    expect(
      shapeOf({
        "Input Currency": "GBPX",
        "Input Amount": "100",
        "Output Currency": "GBP",
        "Output Amount": "100",
      })
    ).toBe("in+ out+ same");
    expect(
      shapeOf({
        "Input Currency": "GBP",
        "Input Amount": "100",
        "Output Currency": "GBPX",
        "Output Amount": "100",
      })
    ).toBe("in+ out+ same");
    expect(
      shapeOf({
        "Input Currency": "USDX",
        "Input Amount": "100",
        "Output Currency": "USD",
        "Output Amount": "100",
      })
    ).toBe("in+ out+ same");
    expect(
      shapeOf({
        "Input Currency": "USD",
        "Input Amount": "100",
        "Output Currency": "USDX",
        "Output Amount": "100",
      })
    ).toBe("in+ out+ same");

    const dGbp = analyseCsv(
      csv(row("Deposit To Exchange", { ic: "GBP", ia: "100", oc: "GBPX", oa: "100" }))
    );
    expect(dGbp.types.find((t) => t.name === "Deposit To Exchange")!.shapes[0].expected).toBe(true);

    const dUsd = analyseCsv(
      csv(row("Exchange To Withdraw", { ic: "USDX", ia: "100", oc: "USD", oa: "100" }))
    );
    expect(dUsd.types.find((t) => t.name === "Exchange To Withdraw")!.shapes[0].expected).toBe(true);
  });

  it("a genuinely different-currency row still reports 'diff'", () => {
    expect(
      shapeOf({
        "Input Currency": "EUR",
        "Input Amount": "100",
        "Output Currency": "USD",
        "Output Amount": "110",
      })
    ).toBe("in+ out+ diff");
    expect(
      shapeOf({
        "Input Currency": "BTC",
        "Input Amount": "-1",
        "Output Currency": "USDT",
        "Output Amount": "30000",
      })
    ).toBe("in- out+ diff");
    expect(
      shapeOf({
        "Input Currency": "EUR",
        "Input Amount": "100",
        "Output Currency": "USDX",
        "Output Amount": "110",
      })
    ).toBe("in+ out+ diff");
    expect(
      shapeOf({
        "Input Currency": "BTC",
        "Input Amount": "1",
        "Output Currency": "EURX",
        "Output Amount": "30000",
      })
    ).toBe("in+ out+ diff");
  });

  it("sign detection is unchanged: in- out+ same still reported for a normalised same-currency row", () => {
    const r = {
      "Input Currency": "EUR",
      "Input Amount": "-100",
      "Output Currency": "EURX",
      "Output Amount": "100",
    };
    expect(shapeOf(r)).toBe("in- out+ same");

    const d = analyseCsv(
      csv(row("Exchange Deposited On", { ic: "EUR", ia: "-100", oc: "EURX", oa: "100" }))
    );
    const summary = d.types.find((t) => t.name === "Exchange Deposited On")!;
    expect(summary).toBeDefined();
    expect(summary.shapes[0].pattern).toBe("in- out+ same");
    expect(summary.shapes[0].expected).toBe(true);
    expect(d.sampleRows).toHaveLength(0);
  });

  it("renders unexpected shape on ignore type at quieter level and on counted type at prominent level", () => {
    // Nexo Card Purchase is an ignored type (effect: 'ignore')
    // Give it an unexpected shape pattern: in+ out0 same
    const ignoredRow = row("Nexo Card Purchase", {
      ic: "xUSD",
      ia: "10.00",
      oc: "xUSD",
      oa: "0",
      details: "approved / unusual card row",
    });

    // Interest is a counted type (effect: 'generic')
    // Give it an unexpected shape: in- out+ diff
    const countedRow = row("Interest", {
      ic: "BTC",
      ia: "-0.50",
      oc: "ETH",
      oa: "5.00",
      details: "approved / negative interest swap",
    });

    const d = analyseCsv(csv(ignoredRow, countedRow));
    const report = formatDiagnosticReport(d, "4.5.0");

    // Counted type renders at prominent level: bold with (unexpected)
    expect(report).toContain("**in- out+ diff ×1 (unexpected)**");

    // Ignored type renders at quieter level: unbolded with (unexpected, no effect on balances)
    expect(report).toContain("in+ out0 same ×1 (unexpected, no effect on balances)");
    expect(report).not.toContain("**in+ out0 same ×1");

    // Assert the two are distinguishable in the markdown
    const boldMatches = report.match(/\*\*.*\(unexpected.*\)\*\*/g) ?? [];
    expect(boldMatches).toContain("**in- out+ diff ×1 (unexpected)**");
    expect(boldMatches.some((m) => m.includes("in+ out0 same"))).toBe(false);
  });

  it("de-duplicated fixFiatX functions identically", () => {
    expect(fixFiatX("EURX")).toBe("EUR");
    expect(fixFiatX("GBPX")).toBe("GBP");
    expect(fixFiatX("USDX")).toBe("USD");
    expect(fixFiatX("BTC")).toBe("BTC");
    expect(fixFiatX("xUSD")).toBe("xUSD");
  });
});

describe("Deepened unexpected shape evidence", () => {
  it("reports recurring detail text and its count for an unexpected shape", () => {
    const rows = Array.from({ length: 15 }, (_, i) =>
      row("Interest", {
        ia: "-1.00000000",
        details: "approved / USD Interest",
        date: `2026-01-${String((i % 28) + 1).padStart(2, "0")} 00:00:00`,
      })
    );
    const d = analyseCsv(csv(...rows));
    const report = formatDiagnosticReport(d, "4.5.0");
    expect(report).toContain("#### Unexpected shapes");
    expect(report).toContain('details: "USD Interest" ×15');
    const shape = d.types.find((t) => t.name === "Interest")?.shapes[0];
    expect(shape?.recurringDetails).toEqual([{ value: "USD Interest", count: 15 }]);
  });

  it("does not publish unique-per-row detail texts and reports no recurring detail text", () => {
    const hash = "b".repeat(64);
    const rows = [
      row("Interest", { ia: "-1.00000000", details: "approved / Coffee Shop, Berlin" }),
      row("Interest", { ia: "-1.00000000", details: "approved / Bookstore, Paris" }),
      row("Interest", { ia: "-1.00000000", details: `approved / tx-${hash}` }),
    ];
    const d = analyseCsv(csv(...rows));
    const shape = d.types.find((t) => t.name === "Interest")?.shapes[0];
    expect(shape?.recurringDetails).toEqual([]);

    const report = formatDiagnosticReport(d, "4.5.0");
    const unexpectedSection = report.slice(
      report.indexOf("#### Unexpected shapes"),
      report.indexOf("#### Sample rows")
    );
    expect(unexpectedSection).toContain("details: no recurring detail text");
    expect(unexpectedSection).not.toContain("Coffee Shop");
    expect(unexpectedSection).not.toContain("Bookstore");
    expect(unexpectedSection).not.toContain(hash);
  });

  it("behaves at the 1%/10-row threshold boundary", () => {
    // 1,000 rows: 1% is 10 rows. min(10, 10) = 10.
    // 9 occurrences does not meet threshold; 10 occurrences meets threshold.
    const rows1000: string[] = [];
    for (let i = 0; i < 9; i++) {
      rows1000.push(row("Interest", { ia: "-1.0", details: "approved / BelowTenCount" }));
    }
    for (let i = 0; i < 10; i++) {
      rows1000.push(row("Interest", { ia: "-1.0", details: "approved / ExactlyTenCount" }));
    }
    for (let i = 0; i < 1000 - 19; i++) {
      rows1000.push(row("Interest", { ia: "-1.0", details: `approved / Unique1000_${i}` }));
    }
    const d1000 = analyseCsv(csv(...rows1000));
    const report1000 = formatDiagnosticReport(d1000, "4.5.0");
    const unexpected1000 = report1000.slice(
      report1000.indexOf("#### Unexpected shapes"),
      report1000.indexOf("#### Sample rows")
    );
    expect(unexpected1000).toContain('"ExactlyTenCount" ×10');
    expect(unexpected1000).not.toContain("BelowTenCount");

    // 500 rows: 1% is 5 rows. min(10, 5) = 5.
    // 4 occurrences does not meet threshold; 5 occurrences meets threshold.
    const rows500: string[] = [];
    for (let i = 0; i < 4; i++) {
      rows500.push(row("Interest", { ia: "-1.0", details: "approved / BelowFiveCount" }));
    }
    for (let i = 0; i < 5; i++) {
      rows500.push(row("Interest", { ia: "-1.0", details: "approved / ExactlyFiveCount" }));
    }
    for (let i = 0; i < 500 - 9; i++) {
      rows500.push(row("Interest", { ia: "-1.0", details: `approved / Unique500_${i}` }));
    }
    const d500 = analyseCsv(csv(...rows500));
    const report500 = formatDiagnosticReport(d500, "4.5.0");
    const unexpected500 = report500.slice(
      report500.indexOf("#### Unexpected shapes"),
      report500.indexOf("#### Sample rows")
    );
    expect(unexpected500).toContain('"ExactlyFiveCount" ×5');
    expect(unexpected500).not.toContain("BelowFiveCount");

    // 2,000 rows: 1% is 20 rows. min(10, 20) = 10 rows.
    // 9 occurrences does not meet threshold; 10 occurrences meets threshold.
    const rows2000: string[] = [];
    for (let i = 0; i < 9; i++) {
      rows2000.push(row("Interest", { ia: "-1.0", details: "approved / BelowTenInLarge" }));
    }
    for (let i = 0; i < 10; i++) {
      rows2000.push(row("Interest", { ia: "-1.0", details: "approved / ExactlyTenInLarge" }));
    }
    for (let i = 0; i < 2000 - 19; i++) {
      rows2000.push(row("Interest", { ia: "-1.0", details: `approved / Unique2000_${i}` }));
    }
    const d2000 = analyseCsv(csv(...rows2000));
    const report2000 = formatDiagnosticReport(d2000, "4.5.0");
    const unexpected2000 = report2000.slice(
      report2000.indexOf("#### Unexpected shapes"),
      report2000.indexOf("#### Sample rows")
    );
    expect(unexpected2000).toContain('"ExactlyTenInLarge" ×10');
    expect(unexpected2000).not.toContain("BelowTenInLarge");

    // 100 rows: 1% is 1 row. max(2, min(10, 1)) = 2.
    // 1 occurrence does not recur; 2 occurrences meets threshold.
    const rows100: string[] = [];
    rows100.push(row("Interest", { ia: "-1.0", details: "approved / SingleOccurrence" }));
    rows100.push(row("Interest", { ia: "-1.0", details: "approved / DoubleOccurrence" }));
    rows100.push(row("Interest", { ia: "-1.0", details: "approved / DoubleOccurrence" }));
    for (let i = 0; i < 97; i++) {
      rows100.push(row("Interest", { ia: "-1.0", details: `approved / Unique100_${i}` }));
    }
    const d100 = analyseCsv(csv(...rows100));
    const report100 = formatDiagnosticReport(d100, "4.5.0");
    const unexpected100 = report100.slice(
      report100.indexOf("#### Unexpected shapes"),
      report100.indexOf("#### Sample rows")
    );
    expect(unexpected100).toContain('"DoubleOccurrence" ×2');
    expect(unexpected100).not.toContain("SingleOccurrence");
  });

  it("reports normalised currency pairs (EURX as EUR)", () => {
    const rows = [
      row("Interest", { ic: "EURX", ia: "-1.00000000", oc: "EURX", oa: "1.00000000" }),
      row("Interest", { ic: "EURX", ia: "-1.00000000", oc: "EURX", oa: "1.00000000" }),
    ];
    const d = analyseCsv(csv(...rows));
    const report = formatDiagnosticReport(d, "4.5.0");
    const unexpectedSection = report.slice(
      report.indexOf("#### Unexpected shapes"),
      report.indexOf("#### Sample rows")
    );
    expect(unexpectedSection).toContain("pairs: EUR->EUR ×2");
    expect(unexpectedSection).not.toContain("EURX");
  });

  it("renders first and last dates for an unexpected shape spanning a period", () => {
    const rows = [
      row("Interest", { ia: "-1.0", date: "2024-03-01 10:00:00" }),
      row("Interest", { ia: "-1.0", date: "2024-07-15 12:30:00" }),
      row("Interest", { ia: "-1.0", date: "2024-11-28 18:45:00" }),
    ];
    const d = analyseCsv(csv(...rows));
    const report = formatDiagnosticReport(d, "4.5.0");
    const unexpectedSection = report.slice(
      report.indexOf("#### Unexpected shapes"),
      report.indexOf("#### Sample rows")
    );
    expect(unexpectedSection).toContain("2024-03-01 to 2024-11-28");
    expect(unexpectedSection).not.toContain("10:00:00");
  });

  it("samples up to MAX_UNEXPECTED_SHAPE_SAMPLE_ROWS diverse rows, not consecutive near-duplicates", () => {
    const rows: string[] = [];
    // 5 consecutive near-duplicates
    for (let i = 1; i <= 5; i++) {
      rows.push(
        `NXT${i},Interest,USD,-1.0,USD,1.0,$1.00,-,-,"approved / Regular Interest",2026-01-0${i} 00:00:00`
      );
    }
    // Alternative 1: different currency pair (EUR->EUR)
    rows.push(
      `NXT6,Interest,EUR,-1.0,EUR,1.0,$1.00,-,-,"approved / Regular Interest",2026-01-06 00:00:00`
    );
    // Alternative 2: different detail text ("Borrow Interest")
    rows.push(
      `NXT7,Interest,USD,-1.0,USD,1.0,$1.00,-,-,"approved / Borrow Interest",2026-01-07 00:00:00`
    );
    // Alternative 3: different fee presence (nonzero fee)
    rows.push(
      `NXT8,Interest,USD,-1.0,USD,1.0,$1.00,0.50,USD,"approved / Regular Interest",2026-01-08 00:00:00`
    );
    // Alternative 4: different month (2026-02)
    rows.push(
      `NXT9,Interest,USD,-1.0,USD,1.0,$1.00,-,-,"approved / Regular Interest",2026-02-01 00:00:00`
    );

    const d = analyseCsv(csv(...rows));
    const interestSamples = d.sampleRows.find((s) => s.type === "Interest");
    expect(interestSamples).toBeDefined();
    expect(interestSamples!.rows).toHaveLength(MAX_UNEXPECTED_SHAPE_SAMPLE_ROWS);

    const sampleTexts = interestSamples!.rows.join("\n");
    // Four dimensions of variation are available (currency, detail text, fee,
    // month) and fewer slots. Each slot must go to a different dimension.
    const dimensions = ["EUR", "Borrow Interest", "0.50", "2026-02-01"];
    const covered = dimensions.filter((d) => sampleTexts.includes(d));
    expect(covered.length).toBe(
      Math.min(MAX_UNEXPECTED_SHAPE_SAMPLE_ROWS - 1, dimensions.length)
    );

    // Verify they are not simply the first 5 consecutive rows
    const allConsecutiveFirstFive = ["NXT1", "NXT2", "NXT3", "NXT4", "NXT5"].every((id) =>
      sampleTexts.includes(id)
    );
    expect(allConsecutiveFirstFive).toBe(false);
  });

  it("yields 0 unknown types and 0 unexpected shapes on demo, report size essentially unchanged", () => {
    const demoCSV = readFileSync(
      resolve(__dirname, "../../public/nexo_demo_transactions.csv"),
      "utf-8"
    );
    const d = analyseCsv(demoCSV);
    expect(d.unknownTypes).toEqual([]);
    const unexpectedShapes = d.types.flatMap((t) =>
      t.shapes.filter((s) => !s.expected).map((s) => ({ type: t.name, ...s }))
    );
    expect(unexpectedShapes).toEqual([]);
    expect(d.sampleRows).toHaveLength(0);

    const report = formatDiagnosticReport(d, "4.5.0");
    expect(report).not.toContain("#### Unexpected shapes");
    expect(report).not.toContain("no recurring detail text");
  });

  it("mentions recurring detail text in the privacy warning", () => {
    const d = analyseCsv(csv(row("Interest", { ia: "-1.0" })));
    const report = formatDiagnosticReport(d, "4.5.0");
    expect(report).toContain("Check this before you post it");
    expect(report).toContain("recurring detail text");
  });
});

