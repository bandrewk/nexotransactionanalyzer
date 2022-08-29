import classes from "./index.module.css";
import SidebarMenu from "./SidebarMenu";

const Sidebar = () => {
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
