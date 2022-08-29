import classes from "./HeadingPrimary.module.css";

type HeadingPrimaryProps = {
  text: string;
};

const HeadingPrimary = ({ text }: HeadingPrimaryProps) => {
  return <h1 className={classes["heading-primary"]}>{text}</h1>;
};

export default HeadingPrimary;
