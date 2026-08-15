import { useState } from "react";
import {
  ComposedChart, Area, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { useChartColors } from "../../../hooks/use-chart-colors";
import { formatUSD } from "../../../lib/format";
import type { InterestPoint } from "../../../types";

type Props = { data: InterestPoint[] };

const REGULAR_COLOR = "#10b981";
const FIXED_TERM_COLOR = "#8b5cf6";

const SERIES_LABEL: Record<string, string> = {
  regular: "Interest",
  fixedTerm: "Fixed Term",
};

/**
 * Earned interest, split by payout kind.
 *
 * Regular interest accrues continuously, so it is an area. A term deposit
 * instead settles its whole accrual on one maturity date, which is a discrete
 * event one to two orders of magnitude larger than an ordinary day — drawn as
 * bars, not stacked into the area, so a maturity cannot masquerade as a day's
 * earnings and its line cannot cover the regular series on the days between.
 *
 * Clicking a legend entry hides that series. Hiding "Fixed Term" rescales the
 * y-axis to the regular range, which is the only way the daily view stays
 * readable when a single payout dwarfs every other day.
 */
export default function InterestChart({ data }: Props) {
  const { text, grid, tooltip } = useChartColors();
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  const toggle = (key: string) =>
    setHidden((h) => ({ ...h, [key]: !h[key] }));

  const legendPayload = (["regular", "fixedTerm"] as const).map((key) => ({
    value: SERIES_LABEL[key],
    id: key,
    type: (key === "regular" ? "line" : "square") as "line" | "square",
    color: hidden[key]
      ? "#94a3b8"
      : key === "regular"
        ? REGULAR_COLOR
        : FIXED_TERM_COLOR,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="interestGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={REGULAR_COLOR} stopOpacity={0.2} />
            <stop offset="100%" stopColor={REGULAR_COLOR} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: "1.1rem", fill: text }} minTickGap={60} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: "1.1rem", fill: text }} tickFormatter={(v) => `${v.toFixed(0)}$`} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(value: number, name: string) => [formatUSD(value), SERIES_LABEL[name] ?? name]}
          contentStyle={{ backgroundColor: tooltip.bg, borderColor: tooltip.border, color: tooltip.text, borderRadius: "12px", fontSize: "1.2rem", boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }}
          itemStyle={{ color: tooltip.text }}
          labelStyle={{ color: tooltip.text }}
        />
        <Legend
          payload={legendPayload}
          onClick={(entry) => toggle(String(entry.id))}
          wrapperStyle={{ fontSize: "1.15rem", color: text, cursor: "pointer" }}
        />
        <Bar
          dataKey="fixedTerm"
          fill={FIXED_TERM_COLOR}
          fillOpacity={0.85}
          hide={hidden.fixedTerm}
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="regular"
          stroke={REGULAR_COLOR}
          strokeWidth={2}
          fill="url(#interestGrad)"
          dot={false}
          hide={hidden.regular}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
