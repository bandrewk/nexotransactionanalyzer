import { useTheme } from "./use-theme";

const CHART_COLORS = [
  "#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#6366f1", "#14b8a6", "#f97316",
  "#a855f7", "#0ea5e9", "#22c55e", "#eab308", "#f43f5e",
];

export function useChartColors() {
  const { resolved } = useTheme();
  const isDark = resolved === "dark";

  return {
    colors: CHART_COLORS,
    text: isDark ? "#94a3b8" : "#64748b",
    grid: isDark ? "#1e2a4a" : "#f1f5f9",
    background: isDark ? "#0a0f1e" : "#ffffff",
    tooltip: {
      bg: isDark ? "#162040" : "#ffffff",
      border: isDark ? "#1e2a4a" : "#e2e8f0",
      text: isDark ? "#e2e8f0" : "#0f172a",
    },
  };
}
