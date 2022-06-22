import Sidebar from "../components/Sidebar/Sidebar";
import classes from "./Platform.module.css";

const Platform = () => {
  return (
    <div className={classes.platform}>
      <Sidebar />
      <p>Content</p>
    </div>
  );
};

export default Platform;
