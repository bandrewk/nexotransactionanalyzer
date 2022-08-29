import SidebarMenuItem from "./SidebarMenuItem";
import classes from "./SidebarMenu.module.css";
import {
  Coins,
  FloppyDisk,
  Gauge,
  HouseLine,
  ListChecks,
  SignOut,
} from "phosphor-react";
import { useAppSelector } from "../../hooks";
import { CHECKDATA, saveState, STATE } from "../../localStorageIO";
import { useEffect, useState } from "react";

const SidebarMenu = () => {
  const transactions = useAppSelector((state) => state.transactions);
  const [hasSaved, setHasSaved] = useState(false);

  // Hide save button if data is already saved
  useEffect(() => {
    const check = localStorage.getItem(`HasDataSaved`);

    if (check) {
      setHasSaved(true);
    }
  }, [setHasSaved]);

  const saveDataHandler = () => {
    // Save data in local storage
    // Only save the transactions from the .csv file, everything else will be reconstructed automatically.
    saveState(STATE.TRANSACTIONS, transactions);

    localStorage.setItem(CHECKDATA, `true`);
    localStorage.setItem(`VERSION`, `1`);

    alert(`Data successfully saved!`);

    // Hide save button
    setHasSaved(true);
  };

  const eraseDataHandler = () => {
    // Delete data in local storage and return to homepage
    localStorage.clear();
    window.location.href = "/";

    // Show save button
    setHasSaved(false);
  };

  return (
    <div className={classes["sidebar-list"]}>
      <ul>
        <p>Menu</p>
        <SidebarMenuItem
          title="Home"
          icon={<HouseLine weight="light" size={24} />}
          linkTo="home"
        />
        <SidebarMenuItem
          icon={<Gauge weight="light" size={24} />}
          title="Overview"
          linkTo="overview"
        />
        <SidebarMenuItem
          icon={<Coins weight="light" size={24} />}
          title="Coinlist"
          linkTo="coinlist"
        />
        <SidebarMenuItem
          icon={<ListChecks weight="light" size={24} />}
          title="Transactions"
          linkTo="transactions"
        />
      </ul>
      <ul>
        <p>Actions</p>
        {!hasSaved && (
          <SidebarMenuItem
            title="Save"
            icon={<FloppyDisk weight="light" size={24} />}
            linkTo="#save"
            callback={saveDataHandler.bind(this)}
          />
        )}
        <SidebarMenuItem
          icon={<SignOut weight="light" size={24} />}
          title="Exit"
          linkTo="/"
          callback={eraseDataHandler.bind(this)}
        />
      </ul>
    </div>
  );
};

export default SidebarMenu;
