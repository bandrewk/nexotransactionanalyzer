import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react";
import { useAppStore } from "../../stores/app-store";
import { formatUSD, formatPercent } from "../../lib/format";
import { filterByDateRange, type DateRange } from "../../lib/date-filter";
import PortfolioChart from "./charts/PortfolioChart";
import HistoricChart from "./charts/HistoricChart";
import DepositsWithdrawalsChart from "./charts/DepositsWithdrawalsChart";
import InterestChart from "./charts/InterestChart";
import InterestBreakdown from "./charts/InterestBreakdown";

const DATE_RANGES: { label: string; value: DateRange }[] = [
  { label: "1M", value: "1M" },
  { label: "3M", value: "3M" },
  { label: "6M", value: "6M" },
  { label: "1Y", value: "1Y" },
  { label: "All", value: "ALL" },
];

function ChartCard({ title, children, subtitle }: { title: string; children: React.ReactNode; subtitle?: string }) {
  return (
    <section className="p-6 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]">
      <h2 className="text-[1.6rem] font-bold text-slate-900 dark:text-white tracking-tight mb-1">
        {title}
      </h2>
      {subtitle && <p className="text-[1.15rem] text-slate-400 mb-6">{subtitle}</p>}
      {!subtitle && <div className="mb-6" />}
      {children}
    </section>
  );
}

function DateRangeSelector({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) {
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.04] w-fit" role="group" aria-label="Date range">
      {DATE_RANGES.map((r) => (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          className={`px-4 py-1.5 rounded-lg text-[1.2rem] font-medium transition-all duration-200 cursor-pointer border-none ${
            value === r.value
              ? "bg-white dark:bg-accent/20 text-accent shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-transparent"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

export default function OverviewPage() {
  const currencies = useAppStore((s) => s.currencies);
  const statistics = useAppStore((s) => s.statistics);
  const isPriceFeedOk = useAppStore((s) => s.isPriceFeedOk);
  const [dateRange, setDateRange] = useState<DateRange>("ALL");

  const portfolioData = currencies
    .filter((c) => c.usdEquivalent > 0.01 && c.supported)
    .map((c) => ({ name: c.symbol, value: c.usdEquivalent }))
    .sort((a, b) => b.value - a.value);

  const totalValue = portfolioData.reduce((sum, c) => sum + c.value, 0);

  // Performance metrics
  const totalDeposits = statistics.depositAndWithdrawalData.reduce((s, d) => s + d.deposit, 0);
  const totalWithdrawals = statistics.depositAndWithdrawalData.reduce((s, d) => s + Math.abs(d.withdrawal), 0);
  const totalInterest = statistics.interestData.reduce((s, d) => s + d.value, 0);
  const netDeposits = totalDeposits - totalWithdrawals;
  const unrealizedPL = totalValue - netDeposits;
  const plPercent = netDeposits > 0 ? (unrealizedPL / netDeposits) * 100 : 0;

  // Filtered chart data
  const filteredHistoric = useMemo(
    () => filterByDateRange(statistics.historicPortfolioData, dateRange), [statistics.historicPortfolioData, dateRange]
  );
  const filteredInterest = useMemo(
    () => filterByDateRange(statistics.interestData, dateRange), [statistics.interestData, dateRange]
  );
  const filteredDepWith = useMemo(
    () => filterByDateRange(statistics.depositAndWithdrawalData, dateRange), [statistics.depositAndWithdrawalData, dateRange]
  );

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-[2.8rem] font-bold text-slate-900 dark:text-white tracking-tight">
          Overview
        </h1>
        <p className="text-[1.4rem] text-slate-500 dark:text-slate-400 mt-1">
          Portfolio analytics and performance         </p>
      </div>

      {/* Performance metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Capital flow card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-2 mb-3">
            <Wallet size={14} className="text-blue-400" />
            <span className="text-[1.1rem] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Net Invested
            </span>
          </div>
          <p className="text-[2.2rem] font-bold tabular-nums tracking-tight text-blue-400 mb-3">
            {formatUSD(netDeposits)}
          </p>
          <div className="flex gap-6 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
            <div>
              <p className="text-[1rem] text-slate-400 uppercase tracking-wide mb-0.5">Deposited</p>
              <p className="text-[1.35rem] font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                {formatUSD(totalDeposits)}
              </p>
            </div>
            <div>
              <p className="text-[1rem] text-slate-400 uppercase tracking-wide mb-0.5">Withdrawn</p>
              <p className="text-[1.35rem] font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                {formatUSD(totalWithdrawals)}
              </p>
            </div>
          </div>
          <p className="text-[1rem] text-slate-400/60 mt-3 italic">
            Moving funds in and out may inflate these figures.
          </p>
        </div>

        {/* Interest earned */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-2 mb-3">
            <PiggyBank size={14} className="text-emerald-400" />
            <span className="text-[1.1rem] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Interest Earned
            </span>
          </div>
          <p className="text-[2.2rem] font-bold tabular-nums tracking-tight text-emerald-400">
            {formatUSD(totalInterest)}
          </p>
          <div className="flex gap-6 pt-3 mt-3 border-t border-slate-100 dark:border-white/[0.06]">
            <div>
              <p className="text-[1rem] text-slate-400 uppercase tracking-wide mb-0.5">Daily Avg</p>
              <p className="text-[1.35rem] font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                {statistics.interestData.length > 0
                  ? formatUSD(totalInterest / statistics.interestData.length)
                  : "$0.00"}
              </p>
            </div>
            <div>
              <p className="text-[1rem] text-slate-400 uppercase tracking-wide mb-0.5">Currencies</p>
              <p className="text-[1.35rem] font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                {statistics.earnedInterestBreakdown.filter((e) => e.inKindUsd + e.inNexoUsd > 0.01).length}
              </p>
            </div>
          </div>
        </div>

        {/* Unrealized P/L */}
        <div className={`p-5 rounded-2xl border ${
          unrealizedPL >= 0
            ? "bg-emerald-500/5 border-emerald-500/15"
            : "bg-red-500/5 border-red-500/15"
        }`}>
          <div className="flex items-center gap-2 mb-3">
            {unrealizedPL >= 0
              ? <TrendingUp size={14} className="text-emerald-400" />
              : <TrendingDown size={14} className="text-red-400" />
            }
            <span className="text-[1.1rem] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Unrealized P/L
            </span>
          </div>
          <p className={`text-[2.2rem] font-bold tabular-nums tracking-tight ${
            unrealizedPL >= 0 ? "text-emerald-400" : "text-red-400"
          }`}>
            {unrealizedPL >= 0 ? "+" : ""}{formatUSD(unrealizedPL)}
          </p>
          <p className={`text-[1.3rem] font-medium tabular-nums mt-0.5 ${
            plPercent >= 0 ? "text-emerald-400/70" : "text-red-400/70"
          }`}>
            {plPercent >= 0 ? "+" : ""}{formatPercent(plPercent)}
          </p>
          <div className="flex gap-6 pt-3 mt-3 border-t border-slate-100/10 dark:border-white/[0.06]">
            <div>
              <p className="text-[1rem] text-slate-400 uppercase tracking-wide mb-0.5">Portfolio</p>
              <p className="text-[1.35rem] font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                {formatUSD(totalValue)}
              </p>
            </div>
            <div>
              <p className="text-[1rem] text-slate-400 uppercase tracking-wide mb-0.5">vs Net Invested</p>
              <p className="text-[1.35rem] font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                {formatUSD(netDeposits)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio summary */}
      {isPriceFeedOk && portfolioData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
          <div className="p-8 rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 dark:from-accent/10 dark:to-accent/5 border border-accent/15">
            <p className="text-[1.2rem] font-medium text-accent/70 uppercase tracking-wide mb-2">
              Total Portfolio Value
            </p>
            <p className="text-[3.6rem] font-extrabold text-slate-900 dark:text-white tracking-tight leading-none mb-6">
              {formatUSD(totalValue)}
            </p>
            <div className="space-y-2">
              {portfolioData.slice(0, 3).map((d) => (
                <div key={d.name} className="flex items-center justify-between text-[1.25rem]">
                  <span className="font-medium text-slate-600 dark:text-slate-300">{d.name}</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {formatUSD(d.value)} · {formatPercent((d.value / totalValue) * 100)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]">
            <PortfolioChart data={portfolioData} />
          </div>
        </div>
      )}

      {/* Date range selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-[1.6rem] font-bold text-slate-900 dark:text-white tracking-tight">
          Charts
        </h2>
        <DateRangeSelector value={dateRange} onChange={setDateRange} />
      </div>

      {filteredHistoric.length > 0 && (
        <ChartCard title="Historic Portfolio Value" subtitle="Daily close prices via CryptoCompare">
          <HistoricChart data={filteredHistoric} />
        </ChartCard>
      )}

      {filteredDepWith.length > 0 && (
        <ChartCard title="Deposits & Withdrawals">
          <DepositsWithdrawalsChart data={filteredDepWith} />
        </ChartCard>
      )}

      {filteredInterest.length > 0 && (
        <ChartCard title="Earned Interest" subtitle="Daily interest earned in USD">
          <InterestChart data={filteredInterest} />
        </ChartCard>
      )}

      {statistics.earnedInterestBreakdown.length > 0 && (
        <ChartCard title="Interest Breakdown" subtitle="Per-currency breakdown. NEXO interest may include rewards from other assets earned as NEXO tokens.">
          <InterestBreakdown data={statistics.earnedInterestBreakdown} />
        </ChartCard>
      )}
    </div>
  );
}
