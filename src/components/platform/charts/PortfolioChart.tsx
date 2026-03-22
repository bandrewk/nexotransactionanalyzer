import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useChartColors } from "../../../hooks/use-chart-colors";
import { formatUSD, formatPercent } from "../../../lib/format";

type Props = {
  data: { name: string; value: number }[];
};

export default function PortfolioChart({ data }: Props) {
  const { colors, tooltip } = useChartColors();
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col lg:flex-row items-center gap-6">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={75}
            outerRadius={120}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => formatUSD(value)}
            contentStyle={{
              backgroundColor: tooltip.bg,
              borderColor: tooltip.border,
              color: tooltip.text,
              borderRadius: "12px",
              fontSize: "1.2rem",
              boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
            }}
            itemStyle={{ color: tooltip.text }}
            labelStyle={{ color: tooltip.text }}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center lg:flex-col lg:gap-y-1.5">
        {data.slice(0, 8).map((d, i) => (
          <div key={d.name} className="flex items-center gap-2 text-[1.2rem]">
            <div className="w-[8px] h-[8px] rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="font-medium text-slate-600 dark:text-slate-300">{d.name}</span>
            <span className="text-slate-400 tabular-nums">
              {formatPercent((d.value / total) * 100)}
            </span>
          </div>
        ))}
        {data.length > 8 && (
          <span className="text-[1.15rem] text-slate-400">+{data.length - 8} more</span>
        )}
      </div>
    </div>
  );
}
