import classes from "./Sidebar.module.css";
import { Link, useNavigate } from "react-router-dom";
import SidebarMenu from "./SidebarMenu";

const Sidebar = () => {
  const navigate = useNavigate();

  return (
    <>
      <aside className={classes.sidebar}>
        <p className={classes["sidebar-logo"]}>nexo-ta.com</p>

        <SidebarMenu />

        {/* The empty div is needed for spacing, don't remove. */}
        <div></div>
      </aside>
    </>
  );
};

export default Sidebar;
