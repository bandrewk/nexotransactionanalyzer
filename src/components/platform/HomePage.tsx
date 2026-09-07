import { useMemo } from "react";
import { TrendingUp, TrendingDown, Coins, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppStore } from "../../stores/app-store";
import { formatUSD, formatPercent } from "../../lib/format";
import { computePortfolioTotal } from "../../lib/portfolio";
import { computeWeekPerformance } from "../../lib/performance";
import { getExportCoverage } from "../../lib/export-coverage";
import NewsFeed from "./NewsFeed";

export default function HomePage() {
  const currencies = useAppStore((s) => s.currencies);
  const transactions = useAppStore((s) => s.transactions);
  const statistics = useAppStore((s) => s.statistics);
  const isPriceFeedOk = useAppStore((s) => s.isPriceFeedOk);
  const diagnostics = useAppStore((s) => s.diagnostics);

  const { totalValue, excludedSymbols } = computePortfolioTotal(currencies);

  const totalTransactions = transactions.length;

  // Every balance here is a running sum over the whole file. A date-bounded
  // export breaks that assumption invisibly, so state the span outright.
  const coverage = useMemo(
    () => getExportCoverage(transactions, new Date().toISOString().substring(0, 10)),
    [transactions]
  );
  const uniqueCurrencies = new Set(currencies.filter((c) => Math.abs(c.amount) >= 0.001).map((c) => c.symbol)).size;

  // 1W performance from historic portfolio data. Null whenever the series
  // cannot support the comparison — the tile then says so instead of
  // presenting a meaningless zero as a result.
  const weekPerf = useMemo(
    () =>
      computeWeekPerformance(
        statistics.historicPortfolioData,
        new Date().toISOString().substring(0, 10)
      ),
    [statistics.historicPortfolioData]
  );

  return (
    <div className="flex flex-col min-h-[calc(100vh-10rem)] gap-10 animate-in">
      <div>
        <h1 className="text-[2.8rem] font-bold text-slate-900 dark:text-white tracking-tight">
          Dashboard
        </h1>
        <p className="text-[1.4rem] text-slate-500 dark:text-slate-400 mt-1">
          Welcome back. Here&apos;s your portfolio summary.
        </p>
      </div>

      {/* Unrecognised transaction types make every figure below unreliable, so
          say it here rather than only on the File Details page. */}
      {diagnostics && diagnostics.unknownTypes.length > 0 && (
        <div
          role="status"
          className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20"
        >
          <p className="text-[1.3rem] font-semibold text-amber-600 dark:text-amber-400">
            {diagnostics.unknownRowCount.toLocaleString()}{" "}
            {diagnostics.unknownRowCount === 1 ? "transaction uses" : "transactions use"}{" "}
            {diagnostics.unknownTypes.length} type
            {diagnostics.unknownTypes.length === 1 ? "" : "s"} this app does not recognise
          </p>
          <p className="text-[1.2rem] text-slate-600 dark:text-slate-300 mt-1">
            Any figure involving those rows is unreliable.
            {diagnostics.looksLikeLegacyExport
              ? " Those names match Nexo exports from before 2023, so this may be an older file — a fresh export should work. If you just downloaded it, this app is out of date."
              : " Nexo may have added transaction types since this app was last updated, in which case there is nothing wrong with your file."}{" "}
            <Link to="/platform/file-details" className="text-accent hover:underline">
              See File Details
            </Link>
            .
          </p>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Portfolio Value */}
        <div className="p-6 rounded-2xl bg-accent/5 border border-accent/15">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp size={16} className="text-accent" />
            <span className="text-[1.2rem] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Portfolio Value
            </span>
          </div>
          <p className="text-[2.4rem] font-bold tracking-tight text-accent">
            {isPriceFeedOk ? formatUSD(totalValue) : "Loading..."}
          </p>
          {isPriceFeedOk && excludedSymbols.length > 0 && (
            <p role="status" className="text-[1.1rem] text-amber-600 dark:text-amber-400 mt-2">
              Excludes {excludedSymbols.join(", ")} — no price available.
            </p>
          )}
        </div>

        {/* 1W Performance */}
        <div className={`p-6 rounded-2xl border ${
          weekPerf && weekPerf.change >= 0
            ? "bg-emerald-500/5 border-emerald-500/15"
            : weekPerf
            ? "bg-red-500/5 border-red-500/15"
            : "bg-white dark:bg-white/[0.03] border-slate-100 dark:border-white/[0.06]"
        }`}>
          <div className="flex items-center gap-3 mb-3">
            {weekPerf && weekPerf.change >= 0
              ? <TrendingUp size={16} className="text-emerald-400" />
              : <TrendingDown size={16} className="text-red-400" />
            }
            <span className="text-[1.2rem] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              1W Change
            </span>
          </div>
          {weekPerf ? (
            <>
              <p className={`text-[2.4rem] font-bold tracking-tight tabular-nums ${
                weekPerf.change >= 0 ? "text-emerald-400" : "text-red-400"
              }`}>
                {weekPerf.change >= 0 ? "+" : ""}{formatUSD(weekPerf.change)}
              </p>
              <p className={`text-[1.3rem] font-medium tabular-nums mt-0.5 ${
                weekPerf.pct >= 0 ? "text-emerald-400/70" : "text-red-400/70"
              }`}>
                {weekPerf.pct >= 0 ? "+" : ""}{formatPercent(weekPerf.pct)}
              </p>
            </>
          ) : (
            <p className="text-[2.4rem] font-bold tracking-tight text-slate-400">--</p>
          )}
        </div>

        {/* Transactions */}
        <div className="p-6 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-3 mb-3">
            <BarChart3 size={16} className="text-slate-400" />
            <span className="text-[1.2rem] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Transactions
            </span>
          </div>
          <p className="text-[2.4rem] font-bold tracking-tight text-slate-900 dark:text-white">
            {totalTransactions.toLocaleString()}
          </p>
          {coverage && (
            <p className="text-[1.1rem] text-slate-500 dark:text-slate-400 mt-2 tabular-nums">
              {coverage.firstDate} to {coverage.lastDate}
            </p>
          )}
          {coverage?.isStale && (
            <p role="status" className="text-[1.1rem] text-amber-600 dark:text-amber-400 mt-1">
              Newest transaction is {coverage.staleDays.toLocaleString()} days old. If your
              export was limited to a date range, balances are correct as of {coverage.lastDate}
              {" "}— not today.
            </p>
          )}
        </div>

        {/* Assets */}
        <div className="p-6 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-3 mb-3">
            <Coins size={16} className="text-slate-400" />
            <span className="text-[1.2rem] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Assets
            </span>
          </div>
          <p className="text-[2.4rem] font-bold tracking-tight text-slate-900 dark:text-white">
            {uniqueCurrencies}
          </p>
        </div>
      </div>

      <NewsFeed />
    </div>
  );
}
