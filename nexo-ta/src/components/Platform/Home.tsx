import HeadingPrimary from "../UI/Text/HeadingPrimary";
import classes from "./Home.module.css";

import NewsFeed from "../NewsFeed/NewsFeed";

const Home = () => {
  return (
    <>
      <HeadingPrimary text="Home" />
      <p>Welcome back!</p>
      <br />
      Lorem ipsum dolor sit amet consectetur adipisicing elit. Accusamus
      repellat vero, a dolorem fugiat ut omnis sed explicabo neque perferendis
      obcaecati in saepe soluta, incidunt ipsum velit accusantium. Labore, quis.
      <br />
      <br />
      <br />
      <p className="subheading">Latest News in Crypto</p>
      <NewsFeed />
    </>
  );
};

export default Home;
