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
import { collection, getDocs } from "firebase/firestore";
import { storage } from "../firebase";
import { useAppDispatch, useAppSelector } from "../hooks";
import {
  addAmount,
  addCurrencies,
  setUSDEquivalent,
  setUSDEquivalentSingle,
} from "../reducers/currenciesReducer";
import { TransactionType } from "../reducers/transactionReducer";
import {
  COINGECKO_API_SIMPLE_PRICE,
  ECB_API_EUR,
  PRICEFEED_PULL_RATE,
} from "../config";
import {
  DateValueArray,
  DepositsWithdrawalsArray,
  setDepositAndWithdrawalData,
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
   * Load currencies from firebase
   ***************************************************************/
  const LoadCurrencies = useCallback(async () => {
    setStatus("Loading available currencies");
    const querySnapshot = await getDocs(collection(storage, "currencies"));

    dispatch(
      addCurrencies(
        querySnapshot.docs.map((doc) => {
          return {
            name: doc.id,
            amount: 0,
            usdEquivalent: 0,
            coingeckoId: doc.data()["coingecko-id"],
            symbol: doc.data().symbol,
            type: doc.data().type,
            supported: true,
          };
        })
      )
    );

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
        t.type !== TransactionType.CREDITCARDSTATUS
      ) {
        dispatch(addAmount({ t }));
      }

      /****************************************************************
       * Statistics logic
       ***************************************************************/
      const date = t.dateTime.substring(0, 10);

      // Gather interest data (per day basis)
      if (t.type === TransactionType.INTEREST) {
        if (interestData.get(date)) {
          interestData.set(
            date,
            (interestData.get(date) ?? 0) + t.usdEquivalent
          );
        } else {
          interestData.set(date, t.usdEquivalent);
        }
      }

      // Collect deposits
      if (
        t.type === TransactionType.DEPOSIT ||
        t.type === TransactionType.DEPOSITTOEXCHANGE
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

    setStatus("Counting complete!");
  }, [dispatch, transactions, ConvertDepositsWithdrawals]);

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
            const usdData = ids.map((item) => {
              return { c: item, a: parseFloat(data[item].usd) };
            });

            dispatch(setUSDEquivalent(usdData));
            dispatch(setPriceFeedOk(true));
          } catch (error) {
            console.log("Pricefeed failed! ", error);
            dispatch(setPriceFeedOk(false));
          }
        });
    }

    // Actually.. we could exit here if we already have FIAT data. It's not as volatile as crypto.

    // 3. Fetch EUR data

    // 3.1. Get date of yesterday (last dataset is usually yesterday)
    let yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // We get valid data only from Monday - Friday
    function isBusinessDay(date: Date) {
      const day = date.getDay();
      if (day === 0 || day === 6) {
        // Exclude sunday and saturday
        return false;
      }
      return true;
    }

    while (!isBusinessDay(yesterday)) {
      yesterday.setDate(yesterday.getDate() - 1);
    }

    // 3.2. Fetch data from ecb
    if (hasEUR) {
      const dateStr = yesterday.toISOString().split("T")[0];
      fetch(ECB_API_EUR(dateStr, dateStr))
        .then((respone) => {
          return respone.json();
        })
        .then((data) => {
          try {
            const exchangeRatio =
              data.dataSets[0].series["0:0:0:0:0"].observations[0][0];

            dispatch(setUSDEquivalentSingle({ c: "EUR", a: exchangeRatio }));
            dispatch(setFiatPriceFeedOk(true));
          } catch (err) {
            console.log(`EUR fetch, data extraction failed.`, err);
            dispatch(setFiatPriceFeedOk(false));
          }
        })
        .catch((err) => {
          console.log(`Failed to fetch data from ECB.`);
          console.log(err);
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
