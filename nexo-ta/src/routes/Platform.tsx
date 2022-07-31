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
  addCurrency,
  Currency,
} from "../reducers/currenciesReducer";
import { TransactionType } from "../reducers/transactionReducer";

const Platform = () => {
  /****************************************************************
   * LOADING
   ***************************************************************/
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState("Initializing");
  const dispatch = useAppDispatch();

  // Load currencies from firebase
  const LoadCurrencies = useCallback(async () => {
    setStatus("Loading available currencies");
    const querySnapshot = await getDocs(collection(storage, "currencies"));

    querySnapshot.forEach((doc) => {
      console.log(doc.id, " => ", doc.data().symbol);

      let c: Currency = {
        name: doc.id,
        amount: 0,
        coingeckoId: doc.data()["coingecko-id"],
        symbol: doc.data().symbol,
        type: doc.data().type,
      };

      dispatch(addCurrency(c));
    });

    setStatus("Loaded currencies!");
  }, [dispatch]);

  // Go trough transactions and calculate coin amounts
  const transactions = useAppSelector((state) => state.transactions);
  // const currencies = useAppSelector((state) => state.currencies);

  const CountCurrencies = useCallback(async () => {
    setStatus("Counting currencies");

    // Give it some time to update ui..
    await Timeout(1000);

    for (let t of transactions) {
      if (t.details.search(`pending`) >= 0) {
        // Transaction is pending
        return;
      }

      // When counting currencies ignore fixed terms  (deposits and withdraws) as the depot value stays the same
      if (
        t.type !== TransactionType.LOCKINGTERMDEPOSIT && // Internal transaction
        t.type !== TransactionType.UNLOCKINGTERMDEPOSIT && // Internal transaction
        t.type !== TransactionType.EXCHANGETOWITHDRAW && //FiatX to Fiat
        t.type !== TransactionType.EXCHANGEDEPOSITEDON // Fiat to FiatX
      ) {
        dispatch(
          addAmount({
            inputAmount: t.inputAmount,
            inputCurrency: t.inputCurrency,
            outputAmount: t.outputAmount,
            outputCurrency: t.outputCurrency,
          })
        );
      }
    }

    setStatus("Counting complete!");
  }, [dispatch, transactions]);

  // Simulate loading
  const Timeout = async (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

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
   * LOADING IS COMPLETE
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
