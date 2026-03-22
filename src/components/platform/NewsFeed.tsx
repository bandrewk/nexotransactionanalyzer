import { Newspaper } from "lucide-react";
import { useNewsFeed } from "../../hooks/use-news-feed";
import Spinner from "../ui/Spinner";

export default function NewsFeed() {
  const { items, isLoading, error } = useNewsFeed();

  if (isLoading) return <Spinner text="Loading news..." />;
  if (error) return <p className="text-[1.3rem] text-red-400">{error}</p>;

  return (
    <section className="flex-1 flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <Newspaper size={18} className="text-slate-400" />
        <h2 className="text-[1.8rem] font-bold text-slate-900 dark:text-white tracking-tight">
          Market News
        </h2>
      </div>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 content-start">
        {items.map((item) => (
          <a
            key={item.link}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex gap-4 p-4 rounded-xl
              bg-white dark:bg-white/[0.03]
              border border-slate-100 dark:border-white/[0.06]
              hover:border-accent/30 dark:hover:border-accent/20
              transition-all duration-200 no-underline"
          >
            {item.thumbnail && (
              <img
                src={item.thumbnail}
                alt=""
                className="w-[8rem] h-[5.6rem] object-cover rounded-lg shrink-0 opacity-90 group-hover:opacity-100 transition-opacity"
              />
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-[1.3rem] font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 mb-1 group-hover:text-accent transition-colors">
                {item.title}
              </h3>
              <p className="text-[1.1rem] text-slate-400">
                {item.pubDate.substring(0, 10)} &middot; {item.author}
              </p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
