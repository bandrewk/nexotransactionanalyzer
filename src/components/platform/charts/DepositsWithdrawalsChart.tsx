import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useChartColors } from "../../../hooks/use-chart-colors";
import { formatUSD } from "../../../lib/format";
import type { DepositsWithdrawalsArray } from "../../../types";

type Props = { data: DepositsWithdrawalsArray[] };

export default function DepositsWithdrawalsChart({ data }: Props) {
  const { text, grid, tooltip } = useChartColors();

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: "1.1rem", fill: text }} minTickGap={60} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: "1.1rem", fill: text }} tickFormatter={(v) => `${v.toFixed(0)}$`} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(value: number, name: string) => [formatUSD(Math.abs(value)), name]}
          contentStyle={{ backgroundColor: tooltip.bg, borderColor: tooltip.border, color: tooltip.text, borderRadius: "12px", fontSize: "1.2rem", boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }}
          itemStyle={{ color: tooltip.text }}
          labelStyle={{ color: tooltip.text }}
        />
        <Bar dataKey="deposit" fill="#10b981" radius={[4, 4, 0, 0]} name="Deposits" />
        <Bar dataKey="withdrawal" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Withdrawals" />
      </BarChart>
    </ResponsiveContainer>
  );
}
