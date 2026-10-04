"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getLatestMarketNews } from "@/app/actions/news";

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
}

// -----------------------------------------------------------------------------
// CLIENT NEWS CACHE
// -----------------------------------------------------------------------------

const NEWS_CLIENT_CACHE_TIME = 60 * 60 * 1000; // 1 hour

interface NewsCacheEntry {
  news: MarketNewsItem[];
  cachedAt: number;
}

const newsCache = new Map<string, NewsCacheEntry>();

function getCachedNews(symbol: string): MarketNewsItem[] | null {
  const cached = newsCache.get(symbol);

  if (!cached) {
    return null;
  }

  const isExpired = Date.now() - cached.cachedAt >= NEWS_CLIENT_CACHE_TIME;

  if (isExpired) {
    newsCache.delete(symbol);
    return null;
  }

  return cached.news;
}

function setCachedNews(symbol: string, news: MarketNewsItem[]) {
  newsCache.set(symbol, {
    news,
    cachedAt: Date.now(),
  });
}

// -----------------------------------------------------------------------------
// FORMAT DATE
// -----------------------------------------------------------------------------

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

export default function MarketNews({ symbol }: MarketNewsProps) {
  const [news, setNews] = useState<MarketNewsItem[]>(
    () => getCachedNews(symbol) ?? [],
  );

  const [index, setIndex] = useState(0);

  // ---------------------------------------------------------------------------
  // LOAD NEWS
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const cached = getCachedNews(symbol);

    // We already have fresh news for this market.
    // No server action / DB request is necessary.
    if (cached) {
      setNews(cached);
      setIndex(0);

      return () => {
        cancelled = true;
      };
    }

    async function loadNews() {
      try {
        const result = await getLatestMarketNews(symbol);

        if (cancelled) {
          return;
        }

        setCachedNews(symbol, result);

        setNews(result);
        setIndex(0);
      } catch (error) {
        console.error(`Failed to load market news for ${symbol}:`, error);

        if (!cancelled) {
          setNews([]);
          setIndex(0);
        }
      }
    }

    void loadNews();

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  // ---------------------------------------------------------------------------
  // ROTATE HEADLINES
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (news.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setIndex((current) => (current + 1) % news.length);
    }, 6000);

    return () => {
      window.clearInterval(interval);
    };
  }, [news.length]);

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  if (news.length === 0) {
    return null;
  }

  const currentNews = news[index];

  if (!currentNews) {
    return null;
  }

  return (
    <div className="flex min-w-0 items-center">
      <Link
        href={`/market/${encodeURIComponent(symbol)}/news`}
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
