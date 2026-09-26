"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export interface MarketNewsItem {
  id: string;
  marketSymbol: string;
  title: string;
  summary: string | null;
  source: string;
  sourceIcon: string | null;
  url: string;
  publishedAt: Date | string;
}

interface MarketNewsProps {
  symbol: string;
  news: MarketNewsItem[];
}

function formatNewsDate(value: Date | string) {
  const date = new Date(value);

  const diff = Date.now() - date.getTime();

  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function MarketNews({ symbol, news }: MarketNewsProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (news.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setIndex((current) => (current + 1) % news.length);
    }, 6000);

    return () => window.clearInterval(interval);
  }, [news.length]);

  if (news.length === 0) {
    return null;
  }

  const currentNews = news[index];

  return (
    <div className="flex min-w-0 items-center">
      <Link
        href={`/${encodeURIComponent(symbol)}/news`}
        className="
          group
          flex min-w-0 items-center gap-2
          text-[15px]
        "
      >
        {currentNews.sourceIcon && (
          <img
            src={currentNews.sourceIcon}
            alt=""
            className="size-4 shrink-0 rounded-sm"
          />
        )}

        <span
          className="
            max-w-162.5
            truncate
            text-zinc-900
            transition-colors
            group-hover:text-zinc-500
            dark:text-zinc-200
            dark:group-hover:text-zinc-400
          "
        >
          {currentNews.title}
        </span>

        <span className="shrink-0 text-zinc-400">·</span>

        <span className="shrink-0 text-zinc-500 dark:text-zinc-400">
          {formatNewsDate(currentNews.publishedAt)}
        </span>
      </Link>
    </div>
  );
}
