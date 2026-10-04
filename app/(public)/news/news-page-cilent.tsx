"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

import type { GlobalMarketNewsItem } from "@/app/actions/news";

type Region = "All" | "America" | "Asia" | "Europe" | "Middle_East" | "Africa";

interface NewsPageClientProps {
  initialNews: GlobalMarketNewsItem[];
}

const REGIONS: Region[] = ["All", "America", "Asia", "Middle_East", "Europe"];

export default function NewsPageClient({ initialNews }: NewsPageClientProps) {
  const [region, setRegion] = useState<Region>("All");

  const news = useMemo(() => {
    if (region === "All") {
      return initialNews;
    }

    return initialNews.filter((item) => item.market.category === region);
  }, [initialNews, region]);

  return (
    <main className="mx-auto w-full mt-10 max-w-5xl px-4 py-8 sm:px-6">
      {/* Header */}
      {/* <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Market News
        </h1>

        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Latest headlines from global markets
        </p>
      </div> */}

      {/* Region filters */}
      <div className="mb-6 flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {REGIONS.map((item) => {
          const active = region === item;

          return (
            <button
              key={item}
              type="button"
              onClick={() => setRegion(item)}
              className={`
                relative px-3 pb-3 text-sm
                transition-colors
                ${
                  active
                    ? "font-medium text-zinc-950 dark:text-zinc-50"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                }
              `}
            >
              {item}

              {active && (
                <span
                  className="
                    absolute right-2 bottom-0 left-2
                    h-0.5 rounded-full
                    bg-zinc-900 dark:bg-zinc-100
                  "
                />
              )}
            </button>
          );
        })}
      </div>

      {/* News */}
      {news.length === 0 ? (
        <div className="flex min-h-80 items-center justify-center">
          <p className="text-sm text-zinc-500">No recent news available.</p>
        </div>
      ) : (
        <div>
          {news.map((item) => (
            <NewsRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </main>
  );
}

function NewsRow({ item }: { item: GlobalMarketNewsItem }) {
  return (
    <article
      className="
        group
        border-b border-zinc-100
        py-5
        dark:border-zinc-800/70
      "
    >
      <div className="flex gap-5">
        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Meta */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Link
              href={`/market/${encodeURIComponent(item.market.symbol)}`}
              className="
                rounded-md
                bg-zinc-100
                px-2 py-0.5
                text-xs font-medium
                text-zinc-600
                transition-colors
                hover:bg-zinc-200
                hover:text-zinc-900
                dark:bg-zinc-800
                dark:text-zinc-300
                dark:hover:bg-zinc-700
                dark:hover:text-zinc-100
              "
            >
              {item.market.displaySymbol ?? item.market.symbol}
            </Link>

            <span className="text-xs text-zinc-300 dark:text-zinc-700">•</span>

            <div className="flex min-w-0 items-center gap-1.5">
              {item.sourceIcon && (
                <img
                  src={item.sourceIcon}
                  alt=""
                  className="size-4 rounded-sm"
                />
              )}

              <span className="truncate text-xs text-zinc-500">
                {item.source}
              </span>
            </div>

            <span className="text-xs text-zinc-300 dark:text-zinc-700">•</span>

            <time
              dateTime={item.publishedAt.toISOString()}
              className="text-xs text-zinc-400"
            >
              {formatRelativeTime(item.publishedAt)}
            </time>
          </div>

          {/* Headline */}
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="
              inline
              text-[16px] font-semibold leading-6
              text-zinc-900
              transition-colors
              group-hover:text-zinc-600
              dark:text-zinc-100
              dark:group-hover:text-zinc-300
            "
          >
            {item.title}

            <ArrowUpRight
              className="
                ml-1 inline size-3.5
                -translate-y-px
                text-zinc-400
              "
            />
          </a>

          {/* Summary */}
          {item.summary && (
            <p
              className="
                mt-2
                line-clamp-2
                max-w-3xl
                text-sm leading-5
                text-zinc-500
                dark:text-zinc-400
              "
            >
              {item.summary}
            </p>
          )}
        </div>

        {/* Image */}
        {item.imageUrl && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="
              relative hidden
              h-22.5 w-35
              shrink-0 overflow-hidden
              rounded-lg
              bg-zinc-100
              sm:block
              dark:bg-zinc-800
            "
          >
            <Image
              src={item.imageUrl}
              alt=""
              fill
              unoptimized
              sizes="140px"
              className="
                object-cover
                transition-transform duration-300
                group-hover:scale-[1.02]
              "
            />
          </a>
        )}
      </div>
    </article>
  );
}

function formatRelativeTime(date: Date) {
  const now = Date.now();
  const time = new Date(date).getTime();

  const diff = Math.max(0, now - time);

  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${days}d ago`;
}
