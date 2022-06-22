import { useLocation, Route, BrowserRouter, Routes } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import SidebarMenuItem from "../components/Sidebar/SidebarMenuItem";
import classes from "./Platform.module.css";

const Platform = () => {
  let location = useLocation();

  return (
    <div className={classes.platform}>
      <Sidebar />
      <p>
        <Routes>
          <Route path="/home" element={<p>Home</p>} />
          <Route path="/overview" element={<p>Overview</p>} />
          <Route path="/coinlist" element={<p>Coinlist</p>} />
          <Route path="/transactions" element={<p>Transactions</p>} />
        </Routes>
      </p>
    </div>
  );
};

export default Platform;
