"use client";

import { useEffect, useState } from "react";

import {
  getGlobalMarketNews,
  type GlobalMarketNewsItem,
  type MarketNewsItem,
} from "@/app/actions/news";

import {
  NewsRegionFilters,
  type NewsFilter,
  type NewsRegion,
} from "./news-region-filters";

import { NewsRow } from "./news-row";

interface NewsFeedProps {
  initialNews: GlobalMarketNewsItem[] | MarketNewsItem[];
  marketName?: string;
  initialRegion?: NewsRegion;
}

interface CacheEntry {
  news: GlobalMarketNewsItem[];
  cachedAt: number;
}

interface RegionData {
  region: NewsRegion;
  news: GlobalMarketNewsItem[];
}

const CACHE_TTL_MS = 60 * 60 * 1000;
const NEWS_LIMIT = 50;

const newsCache = new Map<NewsRegion, CacheEntry>();
const pendingRequests = new Map<NewsRegion, Promise<GlobalMarketNewsItem[]>>();

function getCachedNews(region: NewsRegion): GlobalMarketNewsItem[] | null {
  const cached = newsCache.get(region);

  if (!cached) return null;

  if (Date.now() - cached.cachedAt >= CACHE_TTL_MS) {
    newsCache.delete(region);
    return null;
  }

  return cached.news;
}

function setCachedNews(region: NewsRegion, news: GlobalMarketNewsItem[]) {
  newsCache.set(region, {
    news,
    cachedAt: Date.now(),
  });
}

async function loadRegionNews(
  region: NewsRegion,
): Promise<GlobalMarketNewsItem[]> {
  const cached = getCachedNews(region);

  if (cached) return cached;

  const pending = pendingRequests.get(region);

  if (pending) return pending;

  const request = getGlobalMarketNews(NEWS_LIMIT, region)
    .then((news) => {
      setCachedNews(region, news);
      return news;
    })
    .finally(() => {
      pendingRequests.delete(region);
    });

  pendingRequests.set(region, request);

  return request;
}

export function NewsFeed({
  initialNews,
  marketName,
  initialRegion = "All",
}: NewsFeedProps) {
  const isMarketPage = Boolean(marketName);

  const [filter, setFilter] = useState<NewsFilter>(
    isMarketPage ? "Market" : initialRegion,
  );

  const [regionData, setRegionData] = useState<RegionData | null>(() =>
    isMarketPage
      ? null
      : {
          region: initialRegion,
          news: initialNews as GlobalMarketNewsItem[],
        },
  );

  const [errorRegion, setErrorRegion] = useState<NewsRegion | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (isMarketPage) return;

    setCachedNews(initialRegion, initialNews as GlobalMarketNewsItem[]);
  }, [initialNews, initialRegion, isMarketPage]);

  useEffect(() => {
    if (filter === "Market") return;

    const region = filter;
    let cancelled = false;

    const cached = getCachedNews(region);

    if (cached) {
      setRegionData({ region, news: cached });
      setErrorRegion(null);
      return;
    }

    if (!isMarketPage && region === initialRegion && retryKey === 0) {
      setRegionData({
        region,
        news: initialNews as GlobalMarketNewsItem[],
      });
      setErrorRegion(null);
      return;
    }

    async function fetchNews() {
      setErrorRegion(null);

      try {
        const news = await loadRegionNews(region);

        if (cancelled) return;

        setRegionData({ region, news });
        setErrorRegion(null);
      } catch (error) {
        console.error(`Failed to load news for ${region}:`, error);

        if (!cancelled) {
          setErrorRegion(region);
        }
      }
    }

    void fetchNews();

    return () => {
      cancelled = true;
    };
  }, [filter, isMarketPage, initialRegion, initialNews, retryKey]);

  function handleFilterChange(nextFilter: NewsFilter) {
    if (nextFilter === filter) return;

    setFilter(nextFilter);
    setErrorRegion(null);
  }

  function handleRetry() {
    if (filter === "Market") return;

    newsCache.delete(filter);
    setRegionData(null);
    setErrorRegion(null);
    setRetryKey((current) => current + 1);
  }

  const isMarketSelected = filter === "Market";

  const activeRegion: NewsRegion | null = isMarketSelected
    ? null
    : (filter as NewsRegion);

  const cachedRegionNews = activeRegion ? getCachedNews(activeRegion) : null;

  const hasCurrentRegionData =
    activeRegion !== null && regionData?.region === activeRegion;

  const globalNews =
    activeRegion !== null && errorRegion === activeRegion
      ? null
      : (cachedRegionNews ?? (hasCurrentRegionData ? regionData.news : null));

  const news = isMarketSelected
    ? (initialNews as MarketNewsItem[])
    : (globalNews ?? []);

  const error =
    activeRegion !== null &&
    errorRegion === activeRegion &&
    globalNews === null;

  const loading = activeRegion !== null && globalNews === null && !error;

  return (
    <>
      <NewsRegionFilters
        value={filter}
        onChange={handleFilterChange}
        marketName={marketName}
      />

      {loading ? (
        <div
          role="status"
          className="flex min-h-64 items-center justify-center"
        >
          <div
            aria-hidden="true"
            className="size-5 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-700 dark:border-zinc-700 dark:border-t-zinc-200"
          />
          <span className="sr-only">Loading news...</span>
        </div>
      ) : error ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Unable to load news.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="cursor-pointer text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
          >
            Try again
          </button>
        </div>
      ) : news.length === 0 ? (
        <div
          role="status"
          className="flex min-h-64 flex-col items-center justify-center gap-2 text-center"
        >
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            No news available.
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Check back later for updates.
          </p>
        </div>
      ) : (
        <div>
          {news.map((item) => (
            <NewsRow key={item.id} item={item} showMarket={!isMarketSelected} />
          ))}
        </div>
      )}
    </>
  );
}
