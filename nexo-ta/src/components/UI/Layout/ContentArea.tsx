import classes from "./ContentArea.module.css";

type ContentAreaProps = {
  children: React.ReactNode;
};
const ContentArea = ({ children }: ContentAreaProps) => {
  return <div className={classes["content-area"]}>{children}</div>;
};

export default ContentArea;
