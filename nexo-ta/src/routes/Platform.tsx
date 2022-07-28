import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Footer from "../components/Footer/Footer";
import Coinlist from "../components/Platform/Coinlist";
import Home from "../components/Platform/Home";
import Overview from "../components/Platform/Overview";
import Transactions from "../components/Platform/Transactions";
import Sidebar from "../components/Sidebar/Sidebar";
import ContentArea from "../components/UI/Layout/ContentArea";
import classes from "./Platform.module.css";
import { collection, getDocs } from "firebase/firestore";
import { storage } from "../firebase";
import { useAppDispatch } from "../hooks";
import { addCurrency, Currency } from "../reducers/currenciesReducer";

const Platform = () => {
  /****************************************************************
   * LOADING
   ***************************************************************/
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState("Initializing");

  const dispatch = useAppDispatch();

  const LoadCurrencies = async () => {
    setStatus("Loading available currencies..");
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
  };

  // Simulate loading
  const Timeout = async () => {
    return new Promise((resolve) => setTimeout(resolve, 1000));
  };

  useEffect(() => {
    const Load = async () => {
      await LoadCurrencies();

      await Timeout();

      setIsLoading(false);
    };

    Load();
  }, []);

  /* Start loading and processing transactions */

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
