import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAppStore } from "../../stores/app-store";
import DiagnosticReport from "../landing/DiagnosticReport";
import { formatShapePattern, truncateValue } from "../../lib/csv-diagnostics";

const CARD =
  "p-6 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]";
const CARD_TITLE =
  "text-[1.6rem] font-bold text-slate-900 dark:text-white tracking-tight mb-1";
const LABEL = "text-[1rem] text-slate-400 uppercase tracking-wide mb-0.5";
const VALUE = "text-[1.35rem] font-semibold tabular-nums text-slate-600 dark:text-slate-300";

export default function FileDetailsPage() {
  const diagnostics = useAppStore((s) => s.diagnostics);
  const transactions = useAppStore((s) => s.transactions);

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-[2.8rem] font-bold text-slate-900 dark:text-white tracking-tight">
          File Details
        </h1>
        <p className="text-[1.4rem] text-slate-500 dark:text-slate-400 mt-1">
          What the app read from your export, and everything needed to debug it.
        </p>
      </div>

      {!diagnostics ? (
        <section className={CARD}>
          <h2 className={CARD_TITLE}>Not available for a restored session</h2>
          <p className="text-[1.25rem] text-slate-500 dark:text-slate-400 mt-2">
            These details come from the CSV itself, which is not kept when a session is
            saved — only the {transactions.length.toLocaleString()} parsed transactions are.
            Upload the file again to see them.
          </p>
        </section>
      ) : (
        <>
          {diagnostics.unknownTypes.length > 0 && (
            <section
              role="status"
              className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-1" />
                <div>
                  <h2 className="text-[1.6rem] font-bold text-amber-600 dark:text-amber-400 tracking-tight">
                    {diagnostics.unknownTypes.length} unrecognised transaction{" "}
                    {diagnostics.unknownTypes.length === 1 ? "type" : "types"}
                  </h2>
                  <p className="text-[1.25rem] text-slate-600 dark:text-slate-300 mt-1">
                    {diagnostics.unknownRowCount.toLocaleString()} of{" "}
                    {diagnostics.rowCount.toLocaleString()} rows use a type this app does not
                    know, so any figure derived from them is unreliable.
                    {diagnostics.looksLikeLegacyExport
                      ? " These names match Nexo exports from before 2023, so this may be an older file — a fresh export should work. If you downloaded it recently, this app has not caught up with Nexo and the report below is what fixes that."
                      : " That may mean Nexo has added transaction types since this app was last updated, rather than anything being wrong with your file. The report below is what fixes that."}
                  </p>
                  <p className="text-[1.25rem] font-medium text-amber-600 dark:text-amber-400 mt-2 break-words">
                    {diagnostics.unknownTypes.join(", ")}
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className={CARD}>
            <h2 className={CARD_TITLE}>File</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-5">
              <div>
                <p className={LABEL}>Rows</p>
                <p className={VALUE}>{diagnostics.rowCount.toLocaleString()}</p>
              </div>
              <div>
                <p className={LABEL}>Columns</p>
                <p className={VALUE}>{diagnostics.columnCount}</p>
              </div>
              <div>
                <p className={LABEL}>Date range</p>
                <p className={VALUE}>
                  {diagnostics.dateRange
                    ? `${diagnostics.dateRange.first} to ${diagnostics.dateRange.last}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className={LABEL}>Accepted</p>
                <p className={`${VALUE} flex items-center gap-2`}>
                  {diagnostics.parseable ? (
                    <>
                      <CheckCircle2 size={16} className="text-emerald-400" /> yes
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={16} className="text-red-400" /> no
                    </>
                  )}
                </p>
              </div>
            </div>
            <p className={`${LABEL} mt-6`}>Column names</p>
            <p className="text-[1.2rem] text-slate-600 dark:text-slate-300 break-words">
              {diagnostics.columns.join(", ")}
            </p>
            {diagnostics.missingRequiredColumns.length > 0 && (
              <>
                <p className={`${LABEL} mt-4`}>Missing required columns</p>
                <p className="text-[1.2rem] text-red-400 break-words">
                  {diagnostics.missingRequiredColumns.join(", ")}
                </p>
              </>
            )}
          </section>

          <section className={CARD}>
            <h2 className={CARD_TITLE}>Transaction types</h2>
            <p className="text-[1.15rem] text-slate-400 mb-6">
              Shape is the sign of each amount and whether the two currencies match. It is
              what distinguishes one export vintage from another.
            </p>
            <div className="rounded-xl border border-slate-100 dark:border-white/[0.06] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[1.25rem]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-white/[0.02]">
                      {["Type", "Rows", "Handling", "Shape"].map((h) => (
                        <th
                          key={h}
                          className="text-left py-3 px-4 text-[1.15rem] font-semibold
                            text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {diagnostics.types.map((t) => (
                      <tr
                        key={t.name}
                        className="border-t border-slate-50 dark:border-white/[0.04]"
                      >
                        <td className="py-2.5 px-4 font-mono text-[1.15rem] text-slate-700 dark:text-slate-200">
                          {t.name}
                        </td>
                        <td className="py-2.5 px-4 tabular-nums text-slate-600 dark:text-slate-300">
                          {t.count.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                          {!t.known ? (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              not recognised — counted as-is{t.legacy ? " (legacy name)" : ""}
                            </span>
                          ) : (
                            <div>
                              <span className="font-medium text-slate-700 dark:text-slate-200">
                                {t.handling}
                                {t.confidence === "inferred" && (
                                  <span className="ml-1.5 font-normal text-amber-600 dark:text-amber-400">
                                    (unconfirmed)
                                  </span>
                                )}
                              </span>
                              {t.why && (
                                <p className="text-[1.1rem] text-slate-400 mt-0.5 leading-normal max-w-xl">
                                  {t.why}
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[1.1rem]">
                          {t.shapes.map((s, idx) => {
                            const isIgnored = t.handling === "ignored";
                            const pattern = formatShapePattern(s);
                            if (s.expected) {
                              return (
                                <span
                                  key={`${s.pattern}-${idx}`}
                                  className="text-slate-500 dark:text-slate-400 mr-2"
                                >
                                  {pattern} ×{s.count}
                                </span>
                              );
                            }
                            if (isIgnored) {
                              return (
                                <span
                                  key={`${s.pattern}-${idx}`}
                                  className="text-slate-500 dark:text-slate-400 mr-2"
                                >
                                  {pattern} ×{s.count} (unexpected, no effect on balances
                                  {s.reason ? `: ${truncateValue(s.reason, 60)}` : ""})
                                </span>
                              );
                            }
                            return (
                              <span
                                key={`${s.pattern}-${idx}`}
                                className="text-amber-600 dark:text-amber-400 font-bold mr-2"
                              >
                                {pattern} ×{s.count} (unexpected
                                {s.reason ? `: ${truncateValue(s.reason, 60)}` : ""})
                              </span>
                            );
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className={CARD}>
            <h2 className={CARD_TITLE}>Report</h2>
            <p className="text-[1.15rem] text-slate-400 mb-6">
              Everything above in one block, ready to paste into a GitHub issue instead of
              your CSV. The report includes net amounts per currency per transaction type,
              recurring detail text, and any unaltered sample rows, which together approximate
              the account&apos;s balances — read the report below and edit it before you post it.
            </p>
            <DiagnosticReport diagnostics={diagnostics} standalone />
          </section>
        </>
      )}
    </div>
  );
}
