import HeadingPrimary from "../UI/Text/HeadingPrimary";
// import classes from "./Home.module.css";

import NewsFeed from "../NewsFeed";

const Home = () => {
  return (
    <>
      <HeadingPrimary text="Home" />
      <p>Welcome back!</p>
      <br />
      Have a peek at the latest crypto industry news or go ahead and explore
      your portfolio.
      <br />
      <br />
      <br />
      <p className="subheading">Latest News in Crypto</p>
      <NewsFeed />
    </>
  );
};

export default Home;
