import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useChartColors } from "../../../hooks/use-chart-colors";
import { formatUSD } from "../../../lib/format";
import type { DateValueArray } from "../../../types";

type Props = { data: DateValueArray[] };

export default function InterestChart({ data }: Props) {
  const { text, grid, tooltip } = useChartColors();

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="interestGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: "1.1rem", fill: text }} minTickGap={60} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: "1.1rem", fill: text }} tickFormatter={(v) => `${v.toFixed(0)}$`} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(value: number) => [formatUSD(value), "Interest"]}
          contentStyle={{ backgroundColor: tooltip.bg, borderColor: tooltip.border, color: tooltip.text, borderRadius: "12px", fontSize: "1.2rem", boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }}
          itemStyle={{ color: tooltip.text }}
          labelStyle={{ color: tooltip.text }}
        />
        <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fill="url(#interestGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
