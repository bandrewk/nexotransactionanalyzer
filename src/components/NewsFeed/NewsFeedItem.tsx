import classes from "./NewsFeedItem.module.css";

type NewsFeedItemProps = {
  title: string;
  content: string;
  details: string;
  image: string;
  url: string;
};

const NewsFeedItem = ({
  title,
  content,
  details,
  image,
  url,
}: NewsFeedItemProps) => {
  return (
    <a
      href={url}
      rel="noreferrer"
      target="_blank"
      className={classes["news-card"]}
    >
      <img src={image} />
      <div>
        <p className={classes["news-card--heading"]}>{title}</p>
        <p className={classes["news-card--text"]}>{content}</p>
        <p className={classes["news-card--details"]}>{details}</p>
      </div>
    </a>
  );
};

export default NewsFeedItem;
