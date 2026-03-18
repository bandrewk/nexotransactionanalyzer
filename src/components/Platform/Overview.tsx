import HeadingPrimary from "../UI/Text/HeadingPrimary";
import classes from "./Overview.module.css";
import {
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
} from "recharts";
import { useAppSelector } from "../../hooks";

const CHART_COLORS = [
  "#4f46e5", "#7c3aed", "#2563eb", "#0891b2", "#059669",
  "#d97706", "#dc2626", "#db2777", "#6366f1", "#14b8a6",
  "#f59e0b", "#ef4444",
];

const ChartPlaceholder = ({ title }: { title: string }) => (
  <div className={classes["chart-row"]}>
    <h2>{title}</h2>
    <div className={classes["chart-placeholder"]}>
      <p>Loading...</p>
    </div>
  </div>
);

const Overview = () => {
  const currencies = useAppSelector((state) => state.currencies);
  const statistics = useAppSelector((state) => state.statistics);
  const platform = useAppSelector((state) => state.platform);

  let portfolioValue = 0;

  const portfolioDistribution = currencies
    .filter((item) => {
      // Filter out small values and unsuported entries
      if (item.amount < 0.01) return false;
      if (!item.supported) return false;

      // Update portfolio value
      portfolioValue += item.usdEquivalent;

      return true;
    })
    .map((item) => {
      return { name: item.symbol, USD: parseFloat(item.usdEquivalent.toFixed(2)) };
    })
    .sort((a, b) => b.USD - a.USD);

  return (
    <>
      <HeadingPrimary text="Overview" />
      <p>Visualization of your portfolio.</p>
      <br />
      {/****************************************************************
       * Portfolio value
       ***************************************************************/}
      {portfolioDistribution &&
        portfolioDistribution.length > 0 &&
        platform.isPriceFeedOk && (
          <div className={classes["chart-row"]}>
            <h2>Portfolio value</h2>

            <div className={classes["chart-row--section1"]}>
              <p>{portfolioValue.toFixed(2)}$</p>

              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={portfolioDistribution}
                    dataKey="USD"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    outerRadius={110}
                    innerRadius={55}
                    paddingAngle={2}
                    label={({ name, percent }) =>
                      percent >= 0.03 ? `${name} ${(percent * 100).toFixed(1)}%` : ""
                    }
                    labelLine={false}
                  >
                    {portfolioDistribution.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                  />
                  <Legend
                    formatter={(value, entry: any) => {
                      const item = portfolioDistribution.find(
                        (d) => d.name === value
                      );
                      return item
                        ? `${value} ($${item.USD.toLocaleString()})`
                        : value;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      {!platform.isPriceFeedOk && <p>Waiting for pricefeed...</p>}

      {/****************************************************************
       * Historic portfolio value graph
       ***************************************************************/}

      {statistics.historicPortfolioData &&
        statistics.historicPortfolioData.length > 0 ? (
          <div className={classes["chart-row"]}>
            <h2>Historic portfolio value</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                width={500}
                height={300}
                data={statistics.historicPortfolioData}
                margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  ticks={[
                    statistics.historicPortfolioData[0].date,
                    statistics.historicPortfolioData[
                      statistics.historicPortfolioData.length - 1
                    ].date,
                  ]}
                  padding={{ left: 20, right: 20 }}
                />
                <YAxis unit="$" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  name="Portfolio Value"
                  dataKey="value"
                  stroke="#4f46e5"
                  dot={false}
                  strokeWidth={2}
                  unit="$"
                />
              </LineChart>
            </ResponsiveContainer>
            <p style={{ fontSize: "1.2rem", color: "#9ca3af", marginTop: "0.5rem" }}>
              Historic values use daily close prices (CryptoCompare) and may differ slightly from real-time values.
            </p>
          </div>
        ) : (
          <ChartPlaceholder title="Historic portfolio value" />
        )}

      {/****************************************************************
       * Deposits and withdrawals graph
       ***************************************************************/}

      {statistics.depositAndWithdrawalData &&
        statistics.depositAndWithdrawalData.length > 0 ? (
          <div className={classes["chart-row"]}>
            <h2>Deposits and Withdrawals</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                width={500}
                height={300}
                data={statistics.depositAndWithdrawalData}
                margin={{
                  top: 10,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  ticks={[
                    statistics.depositAndWithdrawalData[0].date,
                    statistics.depositAndWithdrawalData[
                      statistics.depositAndWithdrawalData.length - 1
                    ].date,
                  ]}
                  padding={{ left: 20, right: 20 }}
                />
                <YAxis unit={`$`} />
                <Tooltip />
                <Legend />

                <Line
                  type="monotone"
                  name="Deposits"
                  dataKey="deposit"
                  stroke="#82ca9d"
                  dot={false}
                  strokeWidth={2}
                  unit={`$`}
                />
                <Line
                  type="monotone"
                  name="Withdrawals"
                  dataKey="withdrawal"
                  stroke="#8884d8"
                  dot={false}
                  strokeWidth={2}
                  unit={`$`}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <ChartPlaceholder title="Deposits and Withdrawals" />
        )}

      {/****************************************************************
       * Earned interest graph
       ***************************************************************/}

      {statistics.interestData && statistics.interestData.length > 0 ? (
        <div className={classes["chart-row"]}>
          <h2>Earned interest</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              width={500}
              height={300}
              data={statistics.interestData}
              margin={{
                top: 10,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                ticks={[
                  statistics.interestData[0].date,
                  statistics.interestData[statistics.interestData.length - 1]
                    .date,
                ]}
                padding={{ left: 20, right: 20 }}
              />
              <YAxis unit={`$`} />
              <Tooltip />
              <Legend />

              <Line
                type="monotone"
                name="Earned interest"
                dataKey="value"
                stroke="#82ca9d"
                dot={false}
                strokeWidth={2}
                unit={`$`}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ChartPlaceholder title="Earned interest" />
      )}

      {/****************************************************************
       * Interest breakdown: In-Kind vs In-NEXO
       ***************************************************************/}

      {statistics.earnedInterestBreakdown &&
        statistics.earnedInterestBreakdown.length > 0 && (() => {
          const filtered = statistics.earnedInterestBreakdown
            .filter((e) => e.inKindUsd + e.inNexoUsd > 0.01)
            .sort((a, b) => b.inKindUsd + b.inNexoUsd - (a.inKindUsd + a.inNexoUsd));
          const totalInKindUsd = filtered.reduce((s, e) => s + e.inKindUsd, 0);
          const totalInNexoUsd = filtered.reduce((s, e) => s + e.inNexoUsd, 0);

          return (
            <div className={classes["chart-row"]}>
              <h2>Interest breakdown: In-Kind vs In-NEXO</h2>
              <p>
                Total in-kind: <strong>${totalInKindUsd.toFixed(2)}</strong>
                {" | "}
                Total in NEXO: <strong>${totalInNexoUsd.toFixed(2)}</strong>
                {" | "}
                Combined: <strong>${(totalInKindUsd + totalInNexoUsd).toFixed(2)}</strong>
              </p>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={filtered}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="currency" />
                  <YAxis unit="$" />
                  <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                  <Legend />
                  <Bar name="In-Kind" dataKey="inKindUsd" stackId="a" fill="#059669" />
                  <Bar name="In NEXO" dataKey="inNexoUsd" stackId="a" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>

              <table className={classes["breakdown-table"]}>
                <thead>
                  <tr>
                    <th>Currency</th>
                    <th>In-Kind Amount</th>
                    <th>In-Kind USD</th>
                    <th>In NEXO Amount</th>
                    <th>In NEXO USD</th>
                    <th>Total USD</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.currency}>
                      <td>{e.currency}</td>
                      <td>{e.inKindAmount.toFixed(8)}</td>
                      <td>${e.inKindUsd.toFixed(2)}</td>
                      <td>{e.inNexoAmount > 0 ? e.inNexoAmount.toFixed(8) : "-"}</td>
                      <td>{e.inNexoUsd > 0 ? `$${e.inNexoUsd.toFixed(2)}` : "-"}</td>
                      <td>${(e.inKindUsd + e.inNexoUsd).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
    </>
  );
};

export default Overview;
