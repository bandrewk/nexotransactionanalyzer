import { Link } from "react-router-dom";
import classes from "./SidebarMenuItem.module.css";

type SidebarMenuItemProps = {
  title: string;
  icon?: React.ReactNode;
  linkTo: string;
};

const SidebarMenuItem = ({ title, icon, linkTo }: SidebarMenuItemProps) => {
  return (
    <li>
      <Link to={linkTo} className={classes["sidebar-item"]}>
        {icon} {title}
      </Link>
    </li>
  );
};

export default SidebarMenuItem;
