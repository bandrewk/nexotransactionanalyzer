import { Link } from "react-router-dom";
import classes from "./SidebarMenuItem.module.css";

type SidebarMenuItemProps = {
  title: string;
  icon?: React.ReactNode;
  linkTo: string;
  callback?: () => void;
};

const SidebarMenuItem = ({
  title,
  icon,
  linkTo,
  callback,
}: SidebarMenuItemProps) => {
  return (
    <li>
      <Link
        to={linkTo}
        className={classes["sidebar-item"]}
        onClick={callback ? callback : () => {}}
      >
        {icon} {title}
      </Link>
    </li>
  );
};

export default SidebarMenuItem;
