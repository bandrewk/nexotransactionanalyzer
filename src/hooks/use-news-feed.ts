import { useState, useEffect, useRef } from "react";

const PULL_RATE = 300_000; // 5 minutes
const RSS_URL =
  "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.coindesk.com%2Farc%2Foutboundfeeds%2Frss%2F%3FoutputType%3Dxml";

export type NewsItem = {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  author: string;
  thumbnail: string;
};

export function useNewsFeed() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(RSS_URL);
        if (!res.ok) throw new Error(`News feed: ${res.status}`);
        const data = await res.json();

        const newsItems: NewsItem[] = (data.items ?? []).map(
          (item: Record<string, unknown>) => ({
            title: item.title ?? "",
            description: item.description ?? "",
            link: item.link ?? "",
            pubDate: item.pubDate ?? "",
            author: item.author ?? "",
            thumbnail: (item.enclosure as Record<string, string>)?.link ?? "",
          })
        );

        setItems(newsItems);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load news");
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();
    intervalRef.current = setInterval(fetchNews, PULL_RATE);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { items, isLoading, error };
}
