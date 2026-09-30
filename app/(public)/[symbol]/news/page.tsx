import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getMarketNews } from "@/app/actions/news";

interface PageProps {
  params: Promise<{
    symbol: string;
  }>;
}

export default async function MarketNewsPage({ params }: PageProps) {
  const { symbol } = await params;

  const decodedSymbol = decodeURIComponent(symbol);

  const market = await prisma.marketAsset.findUnique({
    where: {
      symbol: decodedSymbol,
    },

    select: {
      symbol: true,
      displaySymbol: true,
      name: true,
    },
  });

  if (!market) {
    notFound();
  }

  const news = await getMarketNews(decodedSymbol);

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 pt-14">
      <div className="mb-8">
        {/* <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {market.displaySymbol ?? market.symbol}
        </p> */}

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {market.name} News
        </h1>
      </div>

      {news.length === 0 ? (
        <div className="flex min-h-80 items-center justify-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No recent news available.
          </p>
        </div>
      ) : (
        <div>
          {news.map((item) => (
            <article
              key={item.id}
              className="
                border-b border-zinc-100
                py-5
                dark:border-zinc-800
              "
            >
              <div className="flex gap-5">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    {item.sourceIcon && (
                      <img
                        src={item.sourceIcon}
                        alt=""
                        className="size-4 rounded-sm"
                      />
                    )}

                    <span className="text-xs text-zinc-500">{item.source}</span>

                    <span className="text-xs text-zinc-300 dark:text-zinc-700">
                      •
                    </span>

                    <span className="text-xs text-zinc-400">
                      {formatRelativeTime(item.publishedAt)}
                    </span>
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                      text-base font-semibold leading-6
                      text-zinc-900
                      hover:underline
                      dark:text-zinc-100
                    "
                  >
                    {item.title}
                  </a>

                  {item.summary && (
                    <p
                      className="
                        mt-2 line-clamp-2
                        text-sm leading-5
                        text-zinc-500
                        dark:text-zinc-400
                      "
                    >
                      {item.summary}
                    </p>
                  )}
                </div>

                {item.imageUrl && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                      hidden h-22.5 w-35
                      shrink-0 overflow-hidden
                      rounded-lg
                      bg-zinc-100
                      sm:block
                      dark:bg-zinc-800
                    "
                  >
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

function formatRelativeTime(date: Date) {
  const diff = Math.max(0, Date.now() - new Date(date).getTime());

  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;

  return `${days}d ago`;
}
