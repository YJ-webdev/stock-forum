"use client";

import { useMarketQuote } from "@/app/hooks/useMarketQuote";
import type { VoteDirection } from "@/app/actions/market-vote";
import type { HomeMarketItem } from "@/types/home-market";

import { Numeric } from "./numeric";
import { TrendSparkline } from "./trend-sparkline";
import { MarketVoteButton } from "./market-vote-button";
import { MarketSentiment } from "./market-sentiment";

interface BullBearVoteCardProps {
  market: HomeMarketItem;
  initialIsWatchlist: boolean;
  initialVote?: VoteDirection | null;
  initialVoteSessionKey?: string | null;
}

export function BullBearVoteCard({
  market,
  initialVote = null,
  initialVoteSessionKey = null,
}: BullBearVoteCardProps) {
  const { data, loading, error } = useMarketQuote(
    market.providerSymbol ?? market.symbol,
    market.name,
    "1D",
    market.displaySymbol,
    market.assetType,
    0,
    "5m",
  );

  const changeColor = !data
    ? "text-zinc-400 dark:text-zinc-500"
    : data.isPositive
      ? "text-[#047857] dark:text-emerald-400"
      : "text-[#cf0000] dark:text-[#ff1414] dark:font-semibold";

  return (
    <article className="relative w-44 shrink-0 text-zinc-900 dark:text-zinc-300">
      <header className="pb-3">
        <p className="outfit min-w-0 truncate pl-3 text-[13px] tracking-wide text-zinc-800 dark:font-light dark:text-zinc-100">
          {market.displaySymbol}
        </p>

        <h3
          title={market.name}
          className="outfit truncate pl-3 text-2xl font-semibold tracking-normal text-gray-500/50 dark:text-zinc-600"
        >
          {market.name}
        </h3>
      </header>

      <div className="pb-2">
        <Numeric className="pl-3 text-[18px] font-extrabold tracking-normal tabular-nums text-zinc-800 dark:text-zinc-200">
          {data?.value ?? "—"}
        </Numeric>

        <p
          className={`jakarta min-h-5 pl-3 text-sm font-medium tabular-nums ${changeColor}`}
        >
          {data ? `${data.change} (${data.percent})` : "—"}
        </p>

        <div
          role="img"
          aria-label={`${market.name} price trend`}
          className="mt-2 flex h-16 items-center justify-center"
        >
          {data && data.history.length >= 2 ? (
            <TrendSparkline
              data={data.history}
              isPositive={data.isPositive}
              width={174}
              height={64}
              lunchStartMs={data.lunchStartMs}
              lunchEndMs={data.lunchEndMs}
            />
          ) : (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {loading && !data
                ? "Loading…"
                : error
                  ? "Data unavailable"
                  : "Chart unavailable"}
            </span>
          )}
        </div>

        <div className="outfit relative h-17 pt-1.5">
          {market.assetType === "index" && (
            <div className="relative z-20 flex flex-col gap-2">
              <MarketSentiment symbol={market.symbol} />

              <MarketVoteButton
                marketName={market.name}
                symbol={market.symbol}
                initialVote={initialVote}
                initialVoteSessionKey={initialVoteSessionKey}
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
