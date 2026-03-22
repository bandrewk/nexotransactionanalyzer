import { useState } from "react";
import { useAppStore } from "../../stores/app-store";
import { formatUSD, formatCryptoAmount } from "../../lib/format";
import { AlertTriangle, ChevronDown } from "lucide-react";

const DUST_THRESHOLD = 10;
const ICON_CDN = "https://static.nexo-ta.com/currencies";

function CoinIcon({ symbol }: { symbol: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="w-[4rem] h-[4rem] rounded-full bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-[1.2rem] font-bold text-slate-400 shrink-0">
        {symbol.slice(0, 3)}
      </div>
    );
  }
  return (
    <img
      src={`${ICON_CDN}/${symbol.toLowerCase()}.svg`}
      alt={symbol}
      className="w-[4rem] h-[4rem] rounded-full shrink-0"
      onError={() => setFailed(true)}
    />
  );
}

export default function CoinlistPage() {
  const currencies = useAppStore((s) => s.currencies);
  const isPriceFeedOk = useAppStore((s) => s.isPriceFeedOk);
  const [showZero, setShowZero] = useState(false);

  const holdings = currencies.filter(
    (c) => Math.abs(c.amount) >= 0.001 && c.usdEquivalent >= DUST_THRESHOLD
  );
  const dust = currencies.filter(
    (c) => Math.abs(c.amount) >= 0.001 && (c.usdEquivalent < DUST_THRESHOLD || c.amount < 0)
  );
  const zeroes = currencies.filter((c) => Math.abs(c.amount) < 0.001);

  return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="text-[2.8rem] font-bold text-slate-900 dark:text-white tracking-tight">
          Coinlist
        </h1>
        <p className="text-[1.4rem] text-slate-500 dark:text-slate-400 mt-1">
          Your holdings at a glance.
        </p>
      </div>

      {/* Holdings grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {holdings
          .sort((a, b) => b.usdEquivalent - a.usdEquivalent)
          .map((c) => (
            <div
              key={c.symbol}
              className="flex items-center gap-4 p-4 rounded-2xl
                bg-white dark:bg-white/[0.03]
                border border-slate-100 dark:border-white/[0.06]
                hover:border-accent/20 dark:hover:border-accent/20
                transition-all duration-200"
            >
              <CoinIcon symbol={c.symbol} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[1.5rem] font-bold text-slate-900 dark:text-white">
                    {c.symbol}
                  </span>
                  {!c.supported && <AlertTriangle size={14} className="text-amber-400 shrink-0" />}
                </div>
                <p className="text-[1.2rem] text-slate-400 tabular-nums">
                  {formatCryptoAmount(c.amount)}
                </p>
                {isPriceFeedOk && (
                  <p className="text-[1.3rem] font-semibold text-accent tabular-nums">
                    {formatUSD(c.usdEquivalent)}
                  </p>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* Dust */}
      {dust.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer flex items-center gap-2 text-[1.3rem] font-semibold text-slate-500 dark:text-slate-400 mb-3">
            <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
            Dust &amp; Residual Balances ({dust.length})
          </summary>
          <div className="rounded-xl border border-slate-100 dark:border-white/[0.06] overflow-hidden">
            {dust
              .sort((a, b) => a.usdEquivalent - b.usdEquivalent)
              .map((c, i) => (
                <div
                  key={c.symbol}
                  className={`flex items-center justify-between px-4 py-3 text-[1.25rem] ${
                    i > 0 ? "border-t border-slate-50 dark:border-white/[0.04]" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {!c.supported && <AlertTriangle size={12} className="text-amber-400" />}
                    <span className="font-medium text-slate-600 dark:text-slate-300">{c.symbol}</span>
                    <span className="text-slate-400 tabular-nums">{formatCryptoAmount(c.amount)}</span>
                  </div>
                  {isPriceFeedOk && (
                    <span className={`tabular-nums ${c.usdEquivalent < 0 ? "text-red-400" : "text-slate-400"}`}>
                      {formatUSD(c.usdEquivalent)}
                    </span>
                  )}
                </div>
              ))}
          </div>
        </details>
      )}

      {/* Zero toggle */}
      <label className="inline-flex items-center gap-2 text-[1.25rem] text-slate-400 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={showZero}
          onChange={() => setShowZero(!showZero)}
          className="accent-accent w-[1.4rem] h-[1.4rem]"
        />
        Show zero balances
      </label>
      {showZero && zeroes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {zeroes.map((c) => (
            <div
              key={c.symbol}
              className="flex items-center gap-4 p-4 rounded-2xl
                bg-white dark:bg-white/[0.03]
                border border-slate-100 dark:border-white/[0.06]
                opacity-50"
            >
              <CoinIcon symbol={c.symbol} />
              <div className="min-w-0 flex-1">
                <span className="text-[1.4rem] font-bold text-slate-900 dark:text-white">
                  {c.symbol}
                </span>
                <p className="text-[1.1rem] text-slate-400">{c.name}</p>
                <p className="text-[1.2rem] text-slate-400 tabular-nums">{c.amount.toFixed(8)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[1.15rem] text-slate-400 flex items-center gap-2 pt-2">
        <AlertTriangle size={12} className="text-amber-400" /> = Not supported
      </p>
    </div>
  );
}
