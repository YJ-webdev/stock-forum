import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

interface NewsRowItem {
  id: string;
  title: string;
  url: string;
  summary: string | null;
  imageUrl: string | null;
  source: string;
  sourceIcon: string | null;
  publishedAt: Date | string;
  market?: {
    symbol: string;
    displaySymbol?: string | null;
  };
}

interface NewsRowProps {
  item: NewsRowItem;
  showMarket?: boolean;
}

export function NewsRow({ item, showMarket = false }: NewsRowProps) {
  const publishedAt = new Date(item.publishedAt);
  const validDate = Number.isFinite(publishedAt.getTime());

  return (
    <article
      className="
        group border-b border-zinc-100 py-5
        dark:border-zinc-800/70
      "
    >
      <div className="flex gap-5">
        <div className="min-w-0 flex-1">
          {/* Metadata */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {showMarket && item.market && (
              <>
                <Link
                  href={`/market/${encodeURIComponent(item.market.symbol)}`}
                  className="
                    rounded-md bg-zinc-100 px-2 py-0.5
                    text-xs font-medium text-zinc-600
                    transition-colors
                    hover:bg-zinc-200 hover:text-zinc-900
                    dark:bg-zinc-800 dark:text-zinc-100
                    dark:hover:bg-zinc-700
                  "
                >
                  {item.market.displaySymbol ?? item.market.symbol}
                </Link>

                <span
                  aria-hidden="true"
                  className="text-xs text-zinc-200 dark:text-zinc-700"
                >
                  •
                </span>
              </>
            )}

            <div className="flex min-w-0 items-center gap-1.5">
              {item.sourceIcon && (
                <img
                  src={item.sourceIcon}
                  alt=""
                  width={16}
                  height={16}
                  loading="lazy"
                  decoding="async"
                  className="size-4 shrink-0 rounded-sm"
                />
              )}

              <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {item.source}
              </span>
            </div>

            {validDate && (
              <>
                <span
                  aria-hidden="true"
                  className="text-xs text-zinc-200 dark:text-zinc-700"
                >
                  •
                </span>

                <time
                  dateTime={publishedAt.toISOString()}
                  title={publishedAt.toUTCString()}
                  className="text-xs text-zinc-400"
                >
                  {formatRelativeTime(publishedAt)}
                </time>
              </>
            )}
          </div>

          {/* Headline */}
          <h2 className="text-base font-semibold leading-6">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="
                text-zinc-900 transition-colors
                hover:underline
                group-hover:text-zinc-600
                dark:text-zinc-100
                dark:group-hover:text-zinc-100
              "
            >
              {item.title}

              <ArrowUpRight
                aria-hidden="true"
                className="
                  ml-1 inline size-3.5
                  -translate-y-px text-zinc-400
                "
              />
            </a>
          </h2>

          {/* Summary */}
          {item.summary && (
            <p
              className="
                mt-2 line-clamp-2 max-w-3xl
                text-sm leading-5
                text-zinc-500 dark:text-zinc-400
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
            aria-label={item.title}
            className="
              relative hidden h-22.5 w-35
              shrink-0 overflow-hidden rounded-lg
              bg-zinc-100 sm:block dark:bg-zinc-800
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
                motion-reduce:transition-none
              "
            />
          </a>
        )}
      </div>
    </article>
  );
}

function formatRelativeTime(date: Date): string {
  const diff = Math.max(0, Date.now() - date.getTime());

  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;

  return `${days}d ago`;
}
