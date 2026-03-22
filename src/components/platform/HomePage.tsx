import { useMemo } from "react";
import { TrendingUp, TrendingDown, Coins, BarChart3 } from "lucide-react";
import { useAppStore } from "../../stores/app-store";
import { formatUSD, formatPercent } from "../../lib/format";
import NewsFeed from "./NewsFeed";

export default function HomePage() {
  const currencies = useAppStore((s) => s.currencies);
  const transactions = useAppStore((s) => s.transactions);
  const statistics = useAppStore((s) => s.statistics);
  const isPriceFeedOk = useAppStore((s) => s.isPriceFeedOk);

  const totalValue = currencies
    .filter((c) => c.usdEquivalent > 0 && c.supported)
    .reduce((sum, c) => sum + c.usdEquivalent, 0);

  const totalTransactions = transactions.length;
  const uniqueCurrencies = new Set(currencies.filter((c) => Math.abs(c.amount) >= 0.001).map((c) => c.symbol)).size;

  // 1W performance from historic portfolio data
  const weekPerf = useMemo(() => {
    const data = statistics.historicPortfolioData;
    if (data.length < 2) return null;

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().substring(0, 10);

    // Find closest data point to 1 week ago
    let weekAgoValue: number | null = null;
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].date <= weekAgoStr) {
        weekAgoValue = data[i].value;
        break;
      }
    }
    if (weekAgoValue === null || weekAgoValue === 0) return null;

    const currentValue = data[data.length - 1].value;
    const change = currentValue - weekAgoValue;
    const pct = (change / weekAgoValue) * 100;
    return { change, pct };
  }, [statistics.historicPortfolioData]);

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
