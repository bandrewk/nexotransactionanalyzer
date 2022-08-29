import { useEffect, useState } from "react";
import { NEWSFEED_PULL_RATE } from "../../config";
// import classes from "./index.module.css";
import NewsFeedItem from "./NewsFeedItem";

const NewsFeed = () => {
  const [items, setItems] = useState<JSX.Element[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    const loadData = () => {
      setIsLoading(true);
      setItems([]);

      const url =
        "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.coindesk.com%2Farc%2Foutboundfeeds%2Frss%2F%3FoutputType%3Dxml";

      fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not OK");
          }

          return response.json();
        })
        .then(
          (data) => {
            if (data.items) {
              let newItems: any = [];

              data.items.forEach((item: any) =>
                newItems.push(
                  <NewsFeedItem
                    title={item.title}
                    content={item.description}
                    details={`On ${item.pubDate.substr(0, 10)} from ${
                      item.author
                    } via ${data.feed.title}`}
                    image={item.enclosure.link}
                    url={item.link}
                    key={Math.random()}
                  />
                )
              );

              setItems(newItems);

              setIsLoading(false);
            }
          },
          (error) => {
            setIsLoading(false);
            setError(error);
          }
        );
    };

    loadData();
    setInterval(() => {
      loadData();
    }, NEWSFEED_PULL_RATE);
  }, []);

  if (isLoading) {
    return (
      <p>
        <br />
        Loading data..
      </p>
    );
  }

  if (items.length === 0 || error) {
    return (
      <p>
        <br />
        {`${`Could not load news feed.`} ${error}`}
      </p>
    );
  }

  return <div className="grid">{items}</div>;
};

export default NewsFeed;
