import SidebarMenuItem from "./SidebarMenuItem";
import classes from "./SidebarMenu.module.css";
import {
  Coins,
  FloppyDisk,
  Gauge,
  HouseLine,
  ListChecks,
  SignOut,
  Trash,
} from "phosphor-react";

const SidebarMenu = () => {
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
        <SidebarMenuItem
          title="Save"
          icon={<FloppyDisk weight="light" size={24} />}
          linkTo="#save"
        />
        <SidebarMenuItem
          icon={<Trash weight="light" size={24} />}
          title="Delete"
          linkTo="#delete"
        />
        <SidebarMenuItem
          icon={<SignOut weight="light" size={24} />}
          title="Exit"
          linkTo="/"
        />
      </ul>
    </div>
  );
};

export default SidebarMenu;
