import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Plus, X } from "lucide-react";
import type { Currency } from "../../types";
import {
  assetLabel,
  buildComparison,
  isComparableSymbol,
  MAX_COMPARISON_ROWS,
  MAX_SYMBOL_LENGTH,
  normaliseSymbol,
  parseUserAmount,
  type ComparisonInput,
} from "../../lib/balance-comparison";
import { formatAmount8 } from "../../lib/csv-diagnostics";

const INPUT =
  "w-full max-w-[16rem] px-3 py-2 rounded-lg text-[1.25rem] tabular-nums bg-white dark:bg-white/[0.04] " +
  "text-slate-700 dark:text-slate-200 border focus:outline-none focus:border-accent/60";
const BUTTON_PRIMARY =
  "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[1.2rem] font-medium bg-accent text-white " +
  "cursor-pointer border-none hover:bg-accent-hover transition-colors";
const BUTTON_SECONDARY =
  "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[1.2rem] font-medium bg-white dark:bg-white/[0.04] " +
  "text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 cursor-pointer " +
  "hover:border-accent/40 transition-colors";

/** Days between two YYYY-MM-DD dates (UTC). */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

type Props = {
  currencies: Currency[];
  latestDate: string | null;
  applied: ComparisonInput | null;
  onApply: (comparison: ComparisonInput | null) => void;
};

/**
 * Lets the user enter what the Nexo app shows per asset. Nothing is compared until
 * Apply; the applied values then go into the report.
 */
export default function CompareWithNexo({ currencies, latestDate, applied, onApply }: Props) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [added, setAdded] = useState<string[]>([]);
  const [absent, setAbsent] = useState<Record<string, boolean>>({});
  const [activeRow, setActiveRow] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const missingTimer = useRef<number | null>(null);

  // The rows that blocked Apply flash, then settle: a list of symbols in a status line is
  // easy to skim past when the table is long.
  useEffect(() => {
    if (missing.length === 0) return;
    if (missingTimer.current) window.clearTimeout(missingTimer.current);
    missingTimer.current = window.setTimeout(() => setMissing([]), 2600);
    return () => {
      if (missingTimer.current) window.clearTimeout(missingTimer.current);
    };
  }, [missing]);
  const [newSymbol, setNewSymbol] = useState("");
  const [addMessage, setAddMessage] = useState("");
  const [applyMessage, setApplyMessage] = useState("");
  const [appliedInputs, setAppliedInputs] = useState<Record<string, string> | null>(null);

  const amounts = useMemo(() => new Map(currencies.map((c) => [c.symbol, c.amount])), [currencies]);
  const listed = useMemo(() => {
    const held = currencies.filter((c) => Math.abs(c.amount) >= 0.001).map((c) => c.symbol);
    return [...new Set([...held, ...added])].sort((a, b) => a.localeCompare(b));
  }, [currencies, added]);

  const today = new Date().toISOString().slice(0, 10);
  const staleDays = latestDate ? daysBetween(latestDate, today) : null;
  const dirty =
    appliedInputs !== null && JSON.stringify(appliedInputs) !== JSON.stringify({ inputs, absent });

  const addAsset = () => {
    const symbol = normaliseSymbol(newSymbol);
    if (!symbol) return;
    if (!isComparableSymbol(symbol)) {
      setAddMessage(`${symbol} is a credit-line unit, not a holding Nexo lists.`);
    } else if (listed.includes(symbol)) {
      setAddMessage(`${symbol} is already listed.`);
    } else if (listed.length >= MAX_COMPARISON_ROWS) {
      setAddMessage(`At most ${MAX_COMPARISON_ROWS} assets can be compared.`);
    } else {
      setAdded((prev) => [...prev, symbol]);
      setAddMessage("");
    }
    setNewSymbol("");
  };

  const removeAdded = (symbol: string) => {
    setAdded((prev) => prev.filter((s) => s !== symbol));
    setAbsent((prev) => {
      const next = { ...prev };
      delete next[symbol];
      return next;
    });
    setInputs((prev) => {
      const next = { ...prev };
      delete next[symbol];
      return next;
    });
  };

  const apply = () => {
    const entered: { symbol: string; value: number }[] = [];
    let invalid = 0;
    const unanswered: string[] = [];
    for (const symbol of listed) {
      if (!isComparableSymbol(symbol)) continue;
      if (absent[symbol]) {
        entered.push({ symbol, value: 0 });
        continue;
      }
      const parsed = parseUserAmount(inputs[symbol] ?? "");
      if (parsed.kind === "value") entered.push({ symbol, value: parsed.value });
      else if (parsed.kind === "invalid") invalid++;
      else unanswered.push(symbol);
    }
    // A partial comparison reads as agreement for the rows nobody filled in, and those are
    // exactly where a holding the app has and Nexo does not would be found.
    if (unanswered.length > 0 || invalid > 0) {
      onApply(null);
      setAppliedInputs(null);
      setMissing(unanswered);
      const shown = unanswered.slice(0, 8).join(", ");
      setApplyMessage(
        [
          unanswered.length > 0
            ? `Every asset needs an answer: a balance, or Not on Nexo. Still open: ${shown}` +
              (unanswered.length > 8 ? ` and ${unanswered.length - 8} more` : "") + "."
            : "",
          invalid > 0 ? `${invalid} marked ${invalid === 1 ? "value is" : "values are"} not a number.` : "",
        ]
          .filter(Boolean)
          .join(" ")
      );
      return;
    }
    const holdings = [...amounts].map(([symbol, amount]) => ({ symbol, amount }));
    const rows = buildComparison(holdings, entered);
    const appliedOn = new Date().toISOString().slice(0, 10);
    setAppliedInputs({ inputs: { ...inputs }, absent: { ...absent } } as unknown as Record<string, string>);
    if (rows.length === 0) {
      onApply(null);
      setApplyMessage(invalid > 0 ? "Nothing applied: fix the marked values first." : "Enter at least one value to compare.");
      return;
    }
    onApply({ rows, appliedOn });
    setApplyMessage(
      `Applied on ${appliedOn}: all ${rows.length} ${rows.length === 1 ? "asset" : "assets"} compared.`
    );
  };

  const clear = () => {
    onApply(null);
    setAppliedInputs(null);
    setApplyMessage("Comparison removed from the report.");
  };

  return (
    <div>
      <ul className="text-[1.2rem] text-slate-500 dark:text-slate-400 space-y-1 list-disc list-inside mb-4">
        <li>
          Download a <strong>fresh export covering your full history</strong> and read the balances in the
          Nexo app at the same time.
        </li>
        <li>
          Per asset, enter the <strong>Total balance</strong> Nexo shows for it. That figure already
          covers the Savings Wallet, Fixed-terms and the Credit Wallet, so there is nothing to add up.
        </li>
        <li>
          Nexo shows fiat to two decimals, so a small EURx or USDx holding reads as 0.00 there.
          Enter what it shows.
        </li>
        <li>
          If Nexo does not list an asset at all, tick <strong>Not on Nexo</strong>. That compares it
          against zero.
        </li>
        <li>
          Every asset needs an answer before Apply: a balance, or Not on Nexo. Amounts like
          60.62, 60,62 or 9,800.17 work.
        </li>
        <li>
          Values stay in your browser. Apply adds them to the report below; they leave your device only if
          you copy or download the report and post it.
        </li>
      </ul>

      {latestDate && staleDays !== null && staleDays > 2 && (
        <p
          role="status"
          className="flex items-start gap-2 mb-4 text-[1.2rem] text-amber-600 dark:text-amber-400"
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          The latest dated row in this file is from {latestDate}, {staleDays} days ago. Interest and other
          activity since then will show up as differences; a fresh export avoids that.
        </p>
      )}

      <div className="rounded-xl border border-slate-100 dark:border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[1.25rem]">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/[0.02]">
                {["Asset", "Analyzer holdings", "Nexo shows", "Not on Nexo"].map((h) => (
                  <th
                    key={h}
                    className={`py-3 px-4 text-[1.15rem] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap ${
                      h === "Not on Nexo" ? "text-center" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listed.map((symbol, index) => {
                const comparable = isComparableSymbol(symbol);
                const text = inputs[symbol] ?? "";
                const parsed = parseUserAmount(text);
                const isAdded = added.includes(symbol);
                return (
                  <tr
                    key={symbol}
                    onFocusCapture={() => setActiveRow(symbol)}
                    onBlurCapture={() => setActiveRow((cur) => (cur === symbol ? null : cur))}
                    onMouseEnter={() => setActiveRow((cur) => cur ?? symbol)}
                    onMouseLeave={() => setActiveRow((cur) => (cur === symbol ? null : cur))}
                    className={`border-t border-slate-50 dark:border-white/[0.04] align-top transition-colors ${
                      missing.includes(symbol)
                        ? "bg-red-500/15 dark:bg-red-500/25"
                        : activeRow === symbol
                          ? "bg-accent/[0.07] dark:bg-accent/[0.12]"
                          : "hover:bg-slate-50/60 dark:hover:bg-white/[0.02]"
                    }`}
                  >
                    <td
                      className={`py-2.5 px-4 font-mono text-[1.15rem] text-slate-700 dark:text-slate-200 whitespace-nowrap border-l-2 ${
                        missing.includes(symbol)
                          ? "border-red-400"
                          : activeRow === symbol
                            ? "border-accent"
                            : "border-transparent"
                      }`}
                    >
                      {assetLabel(symbol)}
                      {isAdded && (
                        <button
                          type="button"
                          onClick={() => removeAdded(symbol)}
                          aria-label={`Remove ${symbol}`}
                          className="ml-2 align-middle text-slate-400 hover:text-red-400 bg-transparent border-none cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </td>
                    <td className="py-2.5 px-4 tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {formatAmount8(amounts.get(symbol) ?? 0)}
                    </td>
                    <td className="py-2 px-4">
                      {comparable ? (
                        <>
                          <input
                            type="text"
                            inputMode="decimal"
                            aria-label={`Nexo shows ${symbol}`}
                            aria-invalid={parsed.kind === "invalid" && !absent[symbol]}
                            aria-describedby={
                              parsed.kind === "invalid" && !absent[symbol] ? `compare-error-${index}` : undefined
                            }
                            value={absent[symbol] ? "" : text}
                            disabled={!!absent[symbol]}
                            placeholder={absent[symbol] ? "0" : undefined}
                            onChange={(e) => {
                              setMissing((m) => m.filter((x) => x !== symbol));
                              setInputs((prev) => ({ ...prev, [symbol]: e.target.value }));
                            }}
                            className={`${INPUT} ${absent[symbol] ? "opacity-50" : ""} ${
                              parsed.kind === "invalid" && !absent[symbol]
                                ? "border-red-400"
                                : "border-slate-200 dark:border-white/10"
                            }`}
                          />
                          {parsed.kind === "invalid" && !absent[symbol] && (
                            <p id={`compare-error-${index}`} className="text-[1.1rem] text-red-400 mt-1">
                              {parsed.reason === "ambiguous"
                                ? "Ambiguous: write 2800, 2,800.00 or 2.8"
                                : "Not a number, e.g. 60.62 or 9,800.17"}
                            </p>
                          )}
                        </>
                      ) : (
                        <span className="text-[1.15rem] text-slate-400">not comparable (credit line)</span>
                      )}
                    </td>
                    <td className="py-2 px-4">
                      {comparable && (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={!!absent[symbol]}
                          aria-label={`${symbol} is not on Nexo`}
                          onClick={() => {
                            setMissing((m) => m.filter((x) => x !== symbol));
                            setAbsent((prev) => ({ ...prev, [symbol]: !prev[symbol] }));
                          }}
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[1.2rem] border
                            cursor-pointer transition-colors whitespace-nowrap ${
                              absent[symbol]
                                ? "bg-accent/10 border-accent/60 text-accent"
                                : "bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/10 " +
                                  "text-slate-500 dark:text-slate-400 hover:border-accent/40"
                            }`}
                        >
                          <span
                            className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                              absent[symbol]
                                ? "bg-accent border-accent"
                                : "border-slate-300 dark:border-white/20"
                            }`}
                          >
                            {absent[symbol] && <Check size={14} className="text-white" />}
                          </span>
                          Not on Nexo
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-4">
        <input
          type="text"
          list="compare-asset-options"
          aria-label="Asset to add"
          placeholder="Add asset, e.g. SOL"
          maxLength={MAX_SYMBOL_LENGTH}
          value={newSymbol}
          onChange={(e) => setNewSymbol(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addAsset();
          }}
          className={`${INPUT} border-slate-200 dark:border-white/10`}
        />
        <datalist id="compare-asset-options">
          {currencies
            .map((c) => c.symbol)
            .filter((s) => !listed.includes(s) && isComparableSymbol(s))
            .map((s) => (
              <option key={s} value={s} />
            ))}
        </datalist>
        <button type="button" onClick={addAsset} className={BUTTON_SECONDARY}>
          <Plus size={14} /> Add asset
        </button>
        {addMessage && <span className="text-[1.15rem] text-slate-400">{addMessage}</span>}
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-5">
        <button type="button" onClick={apply} className={BUTTON_PRIMARY}>
          Apply comparison
        </button>
        {applied && (
          <button type="button" onClick={clear} className={BUTTON_SECONDARY}>
            Remove from report
          </button>
        )}
        {applyMessage && (
          <span role="status" className="text-[1.15rem] text-slate-500 dark:text-slate-400">
            {applyMessage}
          </span>
        )}
        {applied && dirty && (
          <span className="text-[1.15rem] text-amber-600 dark:text-amber-400">Changes not applied yet.</span>
        )}
      </div>
    </div>
  );
}
