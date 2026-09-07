import { useMemo, useState } from "react";
import { Copy, Check, Download, ShieldAlert } from "lucide-react";
import { formatDiagnosticReport, type CsvDiagnostics } from "../../lib/csv-diagnostics";
import { APP_VERSION } from "../../lib/storage";

type Props = {
  diagnostics: CsvDiagnostics;
  /** Rendered on its own page rather than inside an error box. */
  standalone?: boolean;
};

/**
 * The report a user can hand to the maintainers instead of their CSV.
 *
 * Sample rows are unaltered, so the warning above them is the actual safeguard
 * and has to be read rather than skimmed past. The full text is on screen
 * before either button can be pressed, which is what makes checking possible
 * at all.
 */
export default function DiagnosticReport({ diagnostics, standalone = false }: Props) {
  const [copied, setCopied] = useState(false);
  const report = useMemo(
    () => formatDiagnosticReport(diagnostics, APP_VERSION),
    [diagnostics]
  );

  const onCopy = () => {
    navigator.clipboard
      .writeText(report)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => setCopied(false));
  };

  const onDownload = () => {
    const url = URL.createObjectURL(new Blob([report], { type: "text/markdown" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "nexo-ta-file-report.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={standalone ? "" : "mt-5"}>
      {diagnostics.sampleRows.length > 0 && (
        <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-start gap-3">
            <ShieldAlert size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[1.3rem] font-semibold text-amber-700 dark:text-amber-400">
                Read this before you post it
              </p>
              <p className="text-[1.2rem] text-slate-600 dark:text-slate-300 mt-1">
                The sample rows are taken from your file <strong>unaltered</strong>. Depending on
                your transactions they may contain:
              </p>
              <ul className="text-[1.2rem] text-slate-600 dark:text-slate-300 mt-2 space-y-1 list-disc list-inside">
                <li>blockchain transaction hashes, which identify a wallet</li>
                <li>card purchases showing merchant names and locations</li>
                <li>amounts, balances and transaction IDs</li>
              </ul>
              <p className="text-[1.2rem] text-slate-600 dark:text-slate-300 mt-2">
                Edit out anything you would rather not make public. The report is still useful
                without it — the transaction type and the shape of each row are what matter.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <button
          onClick={onCopy}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[1.2rem] font-medium
            bg-accent text-white cursor-pointer border-none
            hover:bg-accent-hover transition-colors"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy report"}
        </button>
        <button
          onClick={onDownload}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[1.2rem] font-medium
            bg-white dark:bg-white/[0.04] text-slate-600 dark:text-slate-300
            border border-slate-200 dark:border-white/10
            cursor-pointer hover:border-accent/40 transition-colors"
        >
          <Download size={14} />
          Download
        </button>
        <span className="text-[1.15rem] text-slate-400">
          Paste this into a GitHub issue instead of your CSV.
        </span>
      </div>

      <pre
        className="max-h-[32rem] overflow-auto p-4 rounded-xl text-[1.1rem] leading-relaxed
          bg-slate-50 dark:bg-black/30 border border-slate-100 dark:border-white/[0.06]
          text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words"
      >
        {report}
      </pre>
    </div>
  );
}
