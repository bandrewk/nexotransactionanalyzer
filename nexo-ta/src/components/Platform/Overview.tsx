import HeadingPrimary from "../UI/Text/HeadingPrimary";
import classes from "./Overview.module.css";
import {
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
  RadarChart,
  PolarGrid,
  PolarRadiusAxis,
  PolarAngleAxis,
  Radar,
  LineChart,
  Line,
} from "recharts";
import { useAppSelector } from "../../hooks";

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
      return { name: item.symbol, USD: item.usdEquivalent.toFixed(2) };
    });

  return (
    <>
      <HeadingPrimary text="Overview" />
      <p>Visualization of your portfolio.</p>
      <br />
      {/****************************************************************
       * Portfolio value
       ***************************************************************/}
      {portfolioDistribution &&
        portfolioDistribution.length &&
        platform.isPriceFeedOk && (
          <div className={classes["chart-row"]}>
            <h2>Portfolio value</h2>

            <div className={classes["chart-row--section1"]}>
              <p>{portfolioValue.toFixed(2)}$</p>

              <ResponsiveContainer width="100%" height={250}>
                <RadarChart
                  cx="50%"
                  cy="50%"
                  outerRadius="80%"
                  data={portfolioDistribution}
                >
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" />
                  <PolarRadiusAxis />
                  <Radar
                    name="Portfolio"
                    dataKey="USD"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      {!platform.isPriceFeedOk && <p>Waiting for pricefeed...</p>}

      {/****************************************************************
       * Earned interest graph
       ***************************************************************/}

      {statistics.interestData && statistics.interestData.length && (
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
      )}

      {/****************************************************************
       * Deposits and withdrawals graph
       ***************************************************************/}

      {statistics.depositAndWithdrawalData &&
        statistics.depositAndWithdrawalData.length && (
          <div className={classes["chart-row"]}>
            <h2>Deposits and Withdrawls</h2>
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
        )}
    </>
  );
};

export default Overview;
