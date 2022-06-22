import { useLocation, Route, BrowserRouter, Routes } from "react-router-dom";
import Footer from "../components/Footer/Footer";
import Coinlist from "../components/Platform/Coinlist";
import Home from "../components/Platform/Home";
import Overview from "../components/Platform/Overview";
import Transactions from "../components/Platform/Transactions";
import Sidebar from "../components/Sidebar/Sidebar";
import ContentArea from "../components/UI/Layout/ContentArea";
import HeadingPrimary from "../components/UI/Text/HeadingPrimary";
import classes from "./Platform.module.css";

const Platform = () => {
  let location = useLocation();

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
          </Routes>
        </main>
        <Footer />
      </ContentArea>
    </div>
  );
};

export default Platform;
