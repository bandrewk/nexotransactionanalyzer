import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Footer from "../components/Footer";
import Coinlist from "../components/Platform/Coinlist";
import Home from "../components/Platform/Home";
import Overview from "../components/Platform/Overview";
import Transactions from "../components/Platform/Transactions";
import Sidebar from "../components/Sidebar";
import ContentArea from "../components/UI/Layout/ContentArea";
import classes from "./Platform.module.css";
import { currencyData } from "../currencyData";
import { useAppDispatch, useAppSelector } from "../hooks";
import {
  addAmount,
  addCurrencies,
  setUSDEquivalent,
  setUSDEquivalentSingle,
} from "../reducers/currenciesReducer";
import { TransactionType } from "../reducers/transactionReducer";
import { COINGECKO_API_SIMPLE_PRICE, PRICEFEED_PULL_RATE } from "../config";
import {
  DateValueArray,
  DepositsWithdrawalsArray,
  EarnedInterestBreakdown,
  setDepositAndWithdrawalData,
  setEarnedInterestBreakdown,
  setHistoricPortfolioData,
  setInterestData,
} from "../reducers/statisticsReducer";
import {
  setFiatPriceFeedOk,
  setIsLoading,
  setPriceFeedOk,
} from "../reducers/platformReducer";

const Platform = () => {
  const [status, setStatus] = useState("Initializing");
  const dispatch = useAppDispatch();
  const platform = useAppSelector((state) => state.platform);

  /****************************************************************
   * Load currencies from local data
   ***************************************************************/
  const LoadCurrencies = useCallback(async () => {
    setStatus("Loading available currencies");
    dispatch(addCurrencies(currencyData));
    setStatus("Loaded currencies!");
  }, [dispatch]);

  /****************************************************************
   * Helper function to convert Map object to DateValueArray
   ***************************************************************/
  const ConvertMapToArray = (MapO: Map<string, number>) => {
    const tmpDates = [...MapO.keys()];
    const tmpValues = [...MapO.values()];

    let convertedData: DateValueArray[] = [];

    tmpDates.forEach((item, index) => {
      convertedData.push({
        date: tmpDates[index],
        value: tmpValues[index],
      });
    });

    return convertedData;
  };

  /****************************************************************
   * Helper function to convert 2 Map objects to DepositsWithdrawalsArray
   ***************************************************************/
  const ConvertDepositsWithdrawals = useCallback(
    (deposits: Map<string, number>, withdrawals: Map<string, number>) => {
      // 1. Convert both maps to object arrays
      let dep: DepositsWithdrawalsArray[] = ConvertMapToArray(deposits).map(
        (item) => {
          return { date: item.date, withdrawal: 0, deposit: item.value };
        }
      );

      // 1.1. Second array gets an extra flag for later use
      let wth = ConvertMapToArray(withdrawals).map((item) => {
        return {
          date: item.date,
          withdrawal: item.value,
          deposit: 0,
          found: false,
        };
      });

      // 2. Serach for matching dates, if found, mark the found items
      for (let index = 0; index < dep.length; index++) {
        for (let x = 0; x < wth.length; x++) {
          const withdrawal = wth[x];

          if (dep[index].date === withdrawal.date) {
            dep[index].withdrawal = withdrawal.withdrawal;
            wth[x].found = true;
          }
        }
      }

      // 3. Get an array of the items that we didn`t find in the last step
      const arr = wth
        .filter((item) => !item.found)
        .map((item) => {
          return {
            date: item.date,
            withdrawal: item.withdrawal,
            deposit: 0,
          };
        });

      // 4. Add the items that we found in step 3 to our data array
      if (arr.length) {
        arr.forEach((item) => {
          if (item) {
            dep.push({
              date: item.date,
              withdrawal: item.withdrawal,
              deposit: 0,
            });
          }
        });
      }

      // 5. Sort transactions by date
      dep.sort(function (x, y) {
        if (x && y) {
          const a = new Date(x.date);
          const b = new Date(y.date);

          if (a > b) {
            return 1;
          }

          if (a < b) {
            return -1;
          }
        }
        return 0;
      });

      // 6. Dispatch data
      dispatch(setDepositAndWithdrawalData(dep));
    },
    [dispatch]
  );

  /****************************************************************
   * Fetch historic portfolio data using CryptoCompare historical prices
   * Free API, no key required, full historical data
   ***************************************************************/
  const fetchHistoricPortfolioData = useCallback(
    async (dailySnapshots: Map<string, Map<string, number>>) => {
      if (dailySnapshots.size === 0) return;

      setStatus("Fetching historic price data...");

      // 1. Find which crypto currencies had non-zero balances
      const allCurrencies = new Set<string>();
      dailySnapshots.forEach((balances) => {
        balances.forEach((amount, currency) => {
          if (Math.abs(amount) >= 0.001) allCurrencies.add(currency);
        });
      });

      // 2. Get date range
      const dates = [...dailySnapshots.keys()].sort();
      const toTs = Math.floor(new Date(dates[dates.length - 1]).getTime() / 1000) + 86400;
      const totalDays = Math.ceil(
        (toTs - new Date(dates[0]).getTime() / 1000) / 86400
      );

      // 3. Fetch historical prices from CryptoCompare (free, no API key)
      // Uses standard symbols directly (BTC, ETH, XRP, etc.)
      const historicPrices = new Map<string, Map<string, number>>();
      const fiatSymbols = new Set(["USD", "EUR", "GBP"]);

      const cryptoSymbols = [...allCurrencies].filter(
        (s) => !fiatSymbols.has(s) && currencyData.some((c) => c.symbol === s && c.coingeckoId)
      );

      for (const symbol of cryptoSymbols) {
        try {
          setStatus(`Fetching historic prices for ${symbol}...`);
          const resp = await fetch(
            `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=USD&limit=${Math.min(totalDays, 2000)}&toTs=${toTs}`
          );
          if (resp.ok) {
            const data = await resp.json();
            const priceMap = new Map<string, number>();
            if (data.Data?.Data) {
              data.Data.Data.forEach((entry: { time: number; close: number }) => {
                const d = new Date(entry.time * 1000).toISOString().substring(0, 10);
                priceMap.set(d, entry.close);
              });
            }
            historicPrices.set(symbol, priceMap);
          }
          // Small delay to be respectful
          await new Promise((r) => setTimeout(r, 300));
        } catch (err) {
          console.log(`Failed to fetch historic prices for ${symbol}`, err);
        }
      }

      // 4. Fetch EUR and GBP historic rates from frankfurter
      const fiatCurrencies = [...allCurrencies].filter(
        (s) => s === "EUR" || s === "GBP"
      );
      for (const fiat of fiatCurrencies) {
        try {
          setStatus(`Fetching historic ${fiat} rates...`);
          const resp = await fetch(
            `https://api.frankfurter.app/${dates[0]}..${dates[dates.length - 1]}?from=${fiat}&to=USD`
          );
          if (resp.ok) {
            const data = await resp.json();
            const priceMap = new Map<string, number>();
            if (data.rates) {
              Object.entries(data.rates).forEach(([date, rates]: [string, any]) => {
                priceMap.set(date, rates.USD);
              });
            }
            historicPrices.set(fiat, priceMap);
          }
        } catch (err) {
          console.log(`Failed to fetch historic ${fiat} rates`, err);
        }
      }

      // USD is always 1:1
      if (allCurrencies.has("USD")) {
        const usdMap = new Map<string, number>();
        dates.forEach((d) => usdMap.set(d, 1));
        historicPrices.set("USD", usdMap);
      }

      // 5. Compute daily portfolio values
      setStatus("Computing historic portfolio values...");
      const portfolioValues: DateValueArray[] = [];
      let lastBalances = new Map<string, number>();

      // Sample every Nth date to keep chart manageable (max ~500 points)
      const sampleInterval = Math.max(1, Math.floor(dates.length / 500));

      for (let i = 0; i < dates.length; i++) {
        const date = dates[i];

        if (dailySnapshots.has(date)) {
          lastBalances = dailySnapshots.get(date)!;
        }

        // Only sample every Nth date
        if (i % sampleInterval !== 0 && i !== dates.length - 1) continue;

        let totalValue = 0;
        lastBalances.forEach((amount, symbol) => {
          if (Math.abs(amount) < 0.001) return;

          const priceMap = historicPrices.get(symbol);
          if (priceMap) {
            let price = priceMap.get(date);
            if (price === undefined) {
              // Find nearest earlier price
              const priceDates = [...priceMap.keys()].sort();
              for (let j = priceDates.length - 1; j >= 0; j--) {
                if (priceDates[j] <= date) {
                  price = priceMap.get(priceDates[j]);
                  break;
                }
              }
            }
            if (price !== undefined) {
              totalValue += amount * price;
            }
          }
        });

        portfolioValues.push({
          date,
          value: parseFloat(totalValue.toFixed(2)),
        });
      }

      dispatch(setHistoricPortfolioData(portfolioValues));
      setStatus("Historic portfolio data loaded!");
    },
    [dispatch]
  );

  /****************************************************************
   * Count loaded currencies (from the csv file)
   ***************************************************************/
  // Go trough transactions and calculate coin amounts
  const transactions = useAppSelector((state) => state.transactions);

  const CountCurrencies = useCallback(async () => {
    setStatus("Counting coins");

    // Give it some time to update ui..
    await Timeout(1000);

    // Reverse timeline (csv is NEW -> OLD but we want OLD -> NEW)
    const rev = [...transactions].reverse();

    // Statistics data maps
    let interestData = new Map<string, number>();
    let withdrawData = new Map<string, number>();
    let depositData = new Map<string, number>();
    let interestBreakdown = new Map<
      string,
      { inKindAmount: number; inKindUsd: number; inNexoAmount: number; inNexoUsd: number }
    >();

    // Per-currency running balances for historic portfolio
    const currencyBalances = new Map<string, number>();
    // Snapshots: date -> Map<currency, balance>
    const dailySnapshots = new Map<string, Map<string, number>>();

    for (let t of rev) {
      // Transaction is pending, skip iteration
      if (t.details.includes(`pending`)) continue;

      // Transaction got rejected , skip iteration
      if (t.details.includes(`rejected`)) continue;

      // When counting currencies ignore fixed terms  (deposits and withdraws) as the depot value stays the same
      if (
        t.type !== TransactionType.LOCKINGTERMDEPOSIT && // Internal transaction
        t.type !== TransactionType.UNLOCKINGTERMDEPOSIT && // Internal transaction
        t.type !== TransactionType.EXCHANGETOWITHDRAW && //FiatX to Fiat
        t.type !== TransactionType.EXCHANGEDEPOSITEDON && // Fiat to FiatX
        t.type !== TransactionType.TRANSFERIN && // Credit to savings wallet
        t.type !== TransactionType.TRANSFEROUT && // Savings wallet to credit wallet
        t.type !== TransactionType.CREDITCARDSTATUS &&
        t.type !== TransactionType.REPAYMENT && // Counterpart to credit card purchases
        t.type !== TransactionType.LIQUIDATION // Forced repayment
      ) {
        dispatch(addAmount({ t }));
      }

      /****************************************************************
       * Statistics logic
       ***************************************************************/
      const date = t.dateTime.substring(0, 10);

      // Gather interest data (per day basis)
      if (
        t.type === TransactionType.INTEREST ||
        t.type === TransactionType.FIXEDTERMINTEREST
      ) {
        interestData.set(
          date,
          (interestData.get(date) ?? 0) + t.usdEquivalent
        );

        // Interest breakdown: in-kind vs in-NEXO
        const isInNexo =
          t.outputCurrency === "NEXO" && t.inputCurrency !== "NEXO";
        const key = t.inputCurrency;
        const existing = interestBreakdown.get(key) || {
          inKindAmount: 0,
          inKindUsd: 0,
          inNexoAmount: 0,
          inNexoUsd: 0,
        };
        if (isInNexo) {
          existing.inNexoAmount += Math.abs(t.outputAmount);
          existing.inNexoUsd += t.usdEquivalent;
        } else {
          existing.inKindAmount += Math.abs(t.inputAmount);
          existing.inKindUsd += t.usdEquivalent;
        }
        interestBreakdown.set(key, existing);
      }

      // Track per-currency balances for historic portfolio
      // Update balances the same way addAmount does (skip internal transfers)
      if (
        t.type !== TransactionType.LOCKINGTERMDEPOSIT &&
        t.type !== TransactionType.UNLOCKINGTERMDEPOSIT &&
        t.type !== TransactionType.EXCHANGETOWITHDRAW &&
        t.type !== TransactionType.EXCHANGEDEPOSITEDON &&
        t.type !== TransactionType.TRANSFERIN &&
        t.type !== TransactionType.TRANSFEROUT &&
        t.type !== TransactionType.CREDITCARDSTATUS &&
        t.type !== TransactionType.REPAYMENT &&
        t.type !== TransactionType.LIQUIDATION
      ) {
        const ic = t.inputCurrency;
        const oc = t.outputCurrency;
        if (ic === oc || (ic.length > 1 && (oc === "" || oc === "-"))) {
          currencyBalances.set(ic, (currencyBalances.get(ic) ?? 0) + t.inputAmount);
        } else {
          currencyBalances.set(ic, (currencyBalances.get(ic) ?? 0) + t.inputAmount);
          currencyBalances.set(oc, (currencyBalances.get(oc) ?? 0) + t.outputAmount);
        }
      }
      // Snapshot balances at end of each date
      dailySnapshots.set(date, new Map(currencyBalances));

      // Collect deposits
      if (
        t.type === TransactionType.DEPOSIT ||
        t.type === TransactionType.DEPOSITTOEXCHANGE ||
        t.type === TransactionType.TOPUPCRYPTO
      ) {
        if (depositData.get(date)) {
          // There is alrady an entry for that day
          depositData.set(date, (depositData.get(date) ?? 0) + t.usdEquivalent);
        } else depositData.set(date, t.usdEquivalent);
      }

      // Collect withdrawals
      if (
        t.type === TransactionType.WITHDRAWAL ||
        t.type === TransactionType.WITHDRAWEXCHANGED
      ) {
        if (withdrawData.get(date)) {
          // There is alrady an entry for that day
          withdrawData.set(
            date,
            (withdrawData.get(date) ?? 0) + -t.usdEquivalent
          );
        } else withdrawData.set(date, -t.usdEquivalent);
      }
    }

    // Dispatch data
    dispatch(setInterestData(ConvertMapToArray(interestData)));
    ConvertDepositsWithdrawals(depositData, withdrawData);

    // Fetch historic prices and compute portfolio value
    fetchHistoricPortfolioData(dailySnapshots);

    // Dispatch interest breakdown
    const breakdownArray: EarnedInterestBreakdown[] = [
      ...interestBreakdown.entries(),
    ].map(([currency, data]) => ({
      currency,
      ...data,
    }));
    dispatch(setEarnedInterestBreakdown(breakdownArray));

    setStatus("Counting complete!");
  }, [dispatch, transactions, ConvertDepositsWithdrawals, fetchHistoricPortfolioData]);

  /****************************************************************
   * Delayer (Simulate loading time)
   ***************************************************************/
  const Timeout = async (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  /****************************************************************
   * Load price data
   ***************************************************************/
  const currencies = useAppSelector((state) => state.currencies);

  const RefreshPriceFeed = useCallback(async () => {
    // 1. Gather currencies
    let ids: string[] = [];

    let hasGBP = false;
    let hasEUR = false;

    // 1.1. Grab a list of currencies to request
    //      + Filter out fiat and unsupported entries
    currencies.forEach((e) => {
      if (e.supported) {
        if (e.coingeckoId !== "") ids.push(e.coingeckoId);

        // While wer're here, work on fiat..
        // USD is easy enough.. 1USD = 1USD
        if (e.symbol === "USD") {
          dispatch(setUSDEquivalentSingle({ c: `USD`, a: 1 }));
        }

        // Check for EUR
        if (e.symbol === "EUR") {
          hasEUR = true;
        }

        // Check for GBP
        if (e.symbol === "GBP") {
          hasGBP = true;
        }
      }
    });

    // 2. Fetch crypto price data
    if (ids.length > 0) {
      fetch(COINGECKO_API_SIMPLE_PRICE(ids))
        .then((response) => response.json())
        .then((data) => {
          // console.log(data);

          // 2.1. Map data
          try {
            const usdData = ids
              .filter((item) => data[item] && data[item].usd !== undefined)
              .map((item) => {
                return { c: item, a: parseFloat(data[item].usd) };
              });

            if (usdData.length > 0) {
              dispatch(setUSDEquivalent(usdData));
              dispatch(setPriceFeedOk(true));
            }
          } catch (error) {
            console.log("Pricefeed failed! ", error);
            dispatch(setPriceFeedOk(false));
          }
        });
    }

    // Actually.. we could exit here if we already have FIAT data. It's not as volatile as crypto.

    // 3. Fetch EUR data from frankfurter.app
    if (hasEUR) {
      fetch(`https://api.frankfurter.app/latest?from=EUR&to=USD`)
        .then((response) => response.json())
        .then((data) => {
          try {
            const exchangeRatio = data.rates.USD;
            dispatch(setUSDEquivalentSingle({ c: "EUR", a: exchangeRatio }));
            dispatch(setFiatPriceFeedOk(true));
          } catch (err) {
            console.log(`EUR fetch failed.`, err);
            dispatch(setFiatPriceFeedOk(false));
          }
        })
        .catch((err) => {
          console.log(`Failed to fetch EUR data.`, err);
          dispatch(setFiatPriceFeedOk(false));
        });
    }

    if (hasGBP) {
      fetch(`https://api.frankfurter.app/latest?from=GBP`)
        .then((response) => {
          return response.json();
        })
        .then((data) => {
          try {
            const exchangeRatio = data.rates.USD;
            dispatch(setUSDEquivalentSingle({ c: "GBP", a: exchangeRatio }));
            dispatch(setFiatPriceFeedOk(true));
          } catch (err) {
            console.log(`GBP fetch, data extraction failed.`, err);
            dispatch(setFiatPriceFeedOk(false));
          }
        })
        .catch((err) => {
          console.log(`Failed to fetch gbp data.`);
          console.log(err);
          dispatch(setFiatPriceFeedOk(false));
        });
    }
  }, [currencies, dispatch]);

  useEffect(() => {
    RefreshPriceFeed();
    const interval = setInterval(() => {
      RefreshPriceFeed();
    }, PRICEFEED_PULL_RATE);
    return () => clearInterval(interval);
  }, [RefreshPriceFeed]);

  /****************************************************************
   * Loading queue
   ***************************************************************/
  /* Start loading and processing transactions */
  useEffect(() => {
    const load = async () => {
      await LoadCurrencies();
      await Timeout(1000);
      await CountCurrencies();
      await Timeout(1000);

      dispatch(setIsLoading(false));
    };

    load();
  }, [CountCurrencies, LoadCurrencies, dispatch]);

  /****************************************************************
   * Loading UI
   ***************************************************************/
  if (platform.isLoading) {
    return (
      <div className={classes["loading-container"]}>
        <div className={classes["loading-item"]}>
          <div className={classes["loading-spinner"]}>
            <div></div>
          </div>
          <p>{status}</p>
        </div>
      </div>
    );
  }

  /****************************************************************
   * Platform UI
   ***************************************************************/
  return (
    <div className={classes.platform}>
      <Sidebar />
      <ContentArea>
        <main>
          <Routes>
            <Route path="/home" element={<Home />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/coinlist" element={<Coinlist />} />
            <Route path="/transactions" element={<Transactions />} />

            <Route path="/" element={<Navigate to="/platform/home" />} />
            <Route path="*" element={<Navigate to="/oops" />} />
          </Routes>
        </main>
        <Footer />
      </ContentArea>
    </div>
  );
};

export default Platform;

/**
 * Simple animted dots.. i like this but idk yet if I will use it. Saved for later
 * 
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      if (dots === "") setDots(".");
      if (dots === ".") setDots("..");
      if (dots === "..") setDots("...");
      if (dots === "...") setDots("");
    }, 600);

    return () => clearInterval(interval);
  }, [dots]);
 * 
 */
