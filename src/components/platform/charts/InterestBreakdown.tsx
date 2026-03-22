import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useChartColors } from "../../../hooks/use-chart-colors";
import { formatUSD } from "../../../lib/format";
import type { EarnedInterestBreakdown } from "../../../types";

type Props = { data: EarnedInterestBreakdown[] };

export default function InterestBreakdown({ data }: Props) {
  const { text, grid, tooltip } = useChartColors();

  const chartData = data
    .map((d) => ({
      currency: d.currency,
      total: parseFloat((d.inKindUsd + d.inNexoUsd).toFixed(2)),
      amount: d.inKindAmount + d.inNexoAmount,
    }))
    .filter((d) => d.total >= 0.01)
    .sort((a, b) => b.total - a.total);

  const grandTotal = chartData.reduce((s, d) => s + d.total, 0);

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="p-5 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] w-fit">
        <p className="text-[1.1rem] text-slate-400 mb-1">Total Interest Earned</p>
        <p className="text-[2.2rem] font-bold tabular-nums text-emerald-400">{formatUSD(grandTotal)}</p>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
          <XAxis dataKey="currency" tick={{ fontSize: "1.1rem", fill: text }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: "1.1rem", fill: text }} tickFormatter={(v) => `${v}$`} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(value: number) => [formatUSD(value), "Interest"]}
            contentStyle={{ backgroundColor: tooltip.bg, borderColor: tooltip.border, color: tooltip.text, borderRadius: "12px", fontSize: "1.2rem", boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }}
            itemStyle={{ color: tooltip.text }}
            labelStyle={{ color: tooltip.text }}
          />
          <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="USD Earned" />
        </BarChart>
      </ResponsiveContainer>

      {/* Detail table */}
      <div className="rounded-xl border border-slate-100 dark:border-white/[0.06] overflow-hidden">
        <table className="w-full text-[1.2rem]">
          <thead>
            <tr className="bg-slate-50 dark:bg-white/[0.02]">
              {["Currency", "Amount Earned", "USD Value", "% of Total"].map((h) => (
                <th key={h} className="text-left py-3 px-4 text-[1.1rem] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chartData.map((d) => (
              <tr key={d.currency} className="border-t border-slate-50 dark:border-white/[0.04] hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                <td className="py-2.5 px-4 font-medium text-slate-700 dark:text-slate-200">{d.currency}</td>
                <td className="py-2.5 px-4 tabular-nums text-slate-500">{d.amount.toFixed(8)}</td>
                <td className="py-2.5 px-4 tabular-nums text-blue-400">{formatUSD(d.total)}</td>
                <td className="py-2.5 px-4 tabular-nums text-slate-400">
                  {grandTotal > 0 ? `${((d.total / grandTotal) * 100).toFixed(1)}%` : "0%"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Disclaimer */}
      <p className="text-[1.1rem] text-slate-400/70 italic">
        Note: The Nexo CSV export does not distinguish between interest earned in-kind vs. earned as NEXO tokens.
        NEXO interest shown above may include rewards from other assets where &quot;Earn in NEXO&quot; was enabled.
      </p>
    </div>
  );
}
