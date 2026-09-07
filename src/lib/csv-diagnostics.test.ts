import { describe, it, expect } from "vitest";
import {
  analyseCsv,
  formatDiagnosticReport,
  LEGACY_TYPE_NAMES,
  MAX_SAMPLE_ROWS,
} from "./csv-diagnostics";

// All fixtures here are invented. Real exports are never committed.
const CURRENT_HEADER =
  "Transaction,Type,Input Currency,Input Amount,Output Currency,Output Amount,USD Equivalent,Fee,Fee Currency,Details,Date / Time (UTC)";

const row = (type: string, opts: Partial<{ ic: string; ia: string; oc: string; oa: string; details: string; date: string }> = {}) => {
  const { ic = "BTC", ia = "1.00000000", oc = "BTC", oa = "1.00000000", details = "approved / BTC Interest Earned", date = "2026-01-15 00:00:00" } = opts;
  return `NXT1,${type},${ic},${ia},${oc},${oa},$1.00,-,-,"${details}",${date}`;
};

const csv = (...rows: string[]) => [CURRENT_HEADER, ...rows].join("\n");

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

  // Sample rows are deliberately unaltered. An earlier version reduced them to
  // structure using a rule derived from one 2022 export, which fitted that file
  // and would have given false confidence on any other. The warning carries the
  // safety instead, so it has to actually be in the report.
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
    const many = Array.from({ length: 5 }, () => row("Mystery", { details: `approved / ${hash}` }));
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
    expect(report).toContain("Accepted by parser: no");
    expect(report).toContain("Fee, Fee Currency, Date / Time (UTC)");
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

  it("carries no warning when there is nothing unrecognised to sample", () => {
    const report = formatDiagnosticReport(analyseCsv(csv(row("Interest"))), "4.3.0");
    expect(report).not.toContain("Check this before you post it");
  });

  it("omits the sample-row section when every type is recognised", () => {
    const report = formatDiagnosticReport(analyseCsv(csv(row("Interest"))), "4.3.0");
    expect(report).not.toContain("Unrecognised types");
    expect(report).toContain("| `Interest` | 1 | yes |");
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
