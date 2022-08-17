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
} from "../reducers/currenciesReducer";
import { TransactionType } from "../reducers/transactionReducer";
import { COINGECKO_API_SIMPLE_PRICE, PRICEFEED_PULL_RATE } from "../config";
import { InterestData, setInterestData } from "../reducers/statisticsReducer";

const Platform = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState("Initializing");
  const dispatch = useAppDispatch();

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

    let interestData = new Map<string, number>();

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

      // Gather interest data (per day basis)
      if (t.type === TransactionType.INTEREST) {
        const date = t.dateTime.substring(0, 10);

        if (interestData.get(date)) {
          interestData.set(
            date,
            (interestData.get(date) ?? 0) + t.usdEquivalent
          );
        } else {
          interestData.set(date, t.usdEquivalent);
        }
      }
    }

    const tmpDates = [...interestData.keys()];
    const tmpValues = [...interestData.values()];

    let interestDataConv: InterestData[] = [];

    tmpDates.forEach((item, index) => {
      interestDataConv.push({
        date: tmpDates[index],
        value: tmpValues[index],
      });
    });

    dispatch(setInterestData(interestDataConv));

    setStatus("Counting complete!");
  }, [dispatch, transactions]);

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

    currencies.forEach((e) => {
      if (e.supported) {
        if (e.coingeckoId !== "") ids.push(e.coingeckoId);
      }
    });

    // 2. Fetch
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
          } catch (error) {
            console.log("Pricefeed failed! ", error);
          }
        });
    }
  }, [currencies, dispatch]);

  useEffect(() => {
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

      setIsLoading(false);
    };

    load();
  }, [CountCurrencies, LoadCurrencies]);

  /****************************************************************
   * Loading UI
   ***************************************************************/
  if (isLoading) {
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
