import classes from "./Sidebar.module.css";
import { useNavigate } from "react-router-dom";

const Sidebar = () => {
  const navigate = useNavigate();

  return (
    <>
      <aside className={classes.sidebar}>
        <p className={classes["sidebar-logo"]}>nexo-ta.com</p>
        <div className={classes["sidebar-list"]}>
          <ul>
            <p>Menu</p>
            <li>
              <button
                onClick={() => {
                  navigate("/home");
                }}
                className={classes["sidebar-item"]}
              >
                <i className="ph-house-line-light"></i>Home
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  navigate("/overview");
                }}
                className={classes["sidebar-item"]}
              >
                <i className="ph-gauge-light"></i>Overview
              </button>
            </li>
            <li>
              <button className={classes["sidebar-item"]}>
                <i className="ph-coins-light"></i>Coinlist
              </button>
            </li>
            <li>
              <button className={classes["sidebar-item"]}>
                <i className="ph-list-checks-light"></i>Transactions
              </button>
            </li>
          </ul>
          <ul>
            <p>Actions</p>
            <li>
              <button className={classes["sidebar-item"]}>
                <i className="ph-floppy-disk-light"></i> Save
              </button>
            </li>
            <li>
              <button className={classes["sidebar-item"]}>
                <i className="ph-trash-light"></i> Delete
              </button>
            </li>
            <li>
              <button className={classes["sidebar-item"]}>
                <i className="ph-sign-out-light"></i> Exit
              </button>
            </li>
          </ul>
        </div>
        <div></div>
      </aside>
    </>
  );
};

export default Sidebar;
