"use client";

import { TZDate } from "@date-fns/tz";

import { useMarketQuote } from "@/app/hooks/useMarketQuote";
import type { VoteDirection } from "@/app/actions/market-vote";
import type { HomeMarketItem } from "@/types/home-market";

import { ALL_MARKET_SYMBOLS, TRADING_HOURS } from "@/lib/data/market-symbols";
import { resolveLanguage } from "@/lib/data/languages";
import { CHART_LABELS } from "@/lib/data/translations";
import { formatChange } from "@/lib/utils/format-number";

import { Numeric } from "./numeric";
import { TrendSparkline } from "./trend-sparkline";
import { MarketVoteButton } from "./market-vote-button";
import { MarketSentiment } from "./market-sentiment";

interface BullBearVoteCardProps {
  market: HomeMarketItem;
  initialIsWatchlist: boolean;
  initialVote?: VoteDirection | null;
  initialVoteSessionKey?: string | null;
  userLanguage?: string | null;
}

function getSparklineSession(
  market: HomeMarketItem,
  history?: { timestampMs: number }[],
): {
  sessionStartMs: number | null;
  sessionEndMs: number | null;
} {
  const emptySession = {
    sessionStartMs: null,
    sessionEndMs: null,
  };

  if (!history?.length) return emptySession;

  const marketMeta =
    ALL_MARKET_SYMBOLS.find((item) => item.symbol === market.symbol) ??
    ALL_MARKET_SYMBOLS.find((item) => item.symbol === market.providerSymbol);

  if (!marketMeta?.marketSchedule) return emptySession;

  const schedule = TRADING_HOURS[marketMeta.marketSchedule];

  if (!schedule) return emptySession;

  let latestTimestampMs = -Infinity;

  for (const point of history) {
    if (
      Number.isFinite(point.timestampMs) &&
      point.timestampMs > latestTimestampMs
    ) {
      latestTimestampMs = point.timestampMs;
    }
  }

  if (!Number.isFinite(latestTimestampMs)) return emptySession;

  // Use the actual trading date when holiday data is returned.
  const dataDate = new TZDate(latestTimestampMs, schedule.timezone);

  const [openHour, openMinute] = schedule.open.split(":").map(Number);
  const [closeHour, closeMinute] = schedule.close.split(":").map(Number);

  if (![openHour, openMinute, closeHour, closeMinute].every(Number.isFinite)) {
    return emptySession;
  }

  const year = dataDate.getFullYear();
  const month = dataDate.getMonth();

  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;
  const isOvernight = closeMinutes <= openMinutes;

  let startDay = dataDate.getDate();

  if (isOvernight) {
    const dataMinutes = dataDate.getHours() * 60 + dataDate.getMinutes();

    if (dataMinutes <= closeMinutes) {
      startDay -= 1;
    }
  }

  return {
    sessionStartMs: new TZDate(
      year,
      month,
      startDay,
      openHour,
      openMinute,
      0,
      0,
      schedule.timezone,
    ).getTime(),

    sessionEndMs: new TZDate(
      year,
      month,
      startDay + (isOvernight ? 1 : 0),
      closeHour,
      closeMinute,
      0,
      0,
      schedule.timezone,
    ).getTime(),
  };
}

export function BullBearVoteCard({
  market,
  initialVote = null,
  initialVoteSessionKey = null,
  userLanguage,
}: BullBearVoteCardProps) {
  const language = resolveLanguage(userLanguage);
  const chartLabels = CHART_LABELS[language];

  const { data, loading } = useMarketQuote(
    market.providerSymbol ?? market.symbol,
    market.name,
    "1D",
    market.displaySymbol,
    market.assetType,
    0,
    "5m",
  );

  const { sessionStartMs, sessionEndMs } = getSparklineSession(
    market,
    data?.history,
  );

  const changeColor = !data
    ? "text-zinc-400 dark:text-zinc-500"
    : data.isPositive
      ? "text-[#07b056] dark:text-emerald-400"
      : "text-[#d94141] dark:text-[#ff4545] dark:font-[550]";

  const hasChartData = data?.history.some((point) =>
    Number.isFinite(point.price),
  );

  return (
    <article
      aria-busy={loading && !data}
      className="relative w-44 shrink-0 text-zinc-900 dark:text-zinc-300"
    >
      <header>
        <h3
          title={market.name}
          className="outfit truncate pl-3 text-2xl font-bold tracking-normal text-gray-500/50 dark:text-zinc-600"
        >
          {market.name}
        </h3>
      </header>

      <div className="pb-2 mt-2">
        <div className="flex h-7 items-center pl-3">
          {data ? (
            <Numeric className="outfit text-[18px] font-extrabold tracking-normal text-zinc-800 tabular-nums dark:text-zinc-300">
              {data.value}
            </Numeric>
          ) : loading ? (
            <span
              aria-hidden="true"
              className="h-4.5 w-24 animate-pulse rounded-sm bg-zinc-100 motion-reduce:animate-none dark:bg-zinc-800/50"
            />
          ) : (
            <span className="text-[18px] text-zinc-400 dark:text-zinc-500">
              —
            </span>
          )}
        </div>

        <div className="flex h-5 items-center pl-3">
          {data ? (
            <p
              className={`jakarta text-sm font-medium tabular-nums dark:font-[450] ${changeColor}`}
            >
              {formatChange(data.change)} ({data.percent})
            </p>
          ) : loading ? (
            <span
              aria-hidden="true"
              className="h-3 w-28 animate-pulse rounded-sm bg-zinc-100 motion-reduce:animate-none dark:bg-zinc-800/50"
            />
          ) : (
            <span className="text-sm text-zinc-400 dark:text-zinc-500">—</span>
          )}
        </div>

        <div className="mt-2 flex h-16 items-center justify-center">
          {data && hasChartData ? (
            <div className="opacity-50">
              <TrendSparkline
                data={data.history}
                isPositive={data.isPositive}
                previousClose={data.previousClose}
                sessionStartMs={sessionStartMs}
                sessionEndMs={sessionEndMs}
                width={174}
                height={64}
                lunchStartMs={data.lunchStartMs}
                lunchEndMs={data.lunchEndMs}
              />
            </div>
          ) : loading && !data ? (
            <div className="flex h-full w-full items-center px-3">
              <span
                aria-hidden="true"
                className="h-10 w-full animate-pulse rounded-sm bg-zinc-100 motion-reduce:animate-none dark:bg-zinc-800/50"
              />
            </div>
          ) : (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {chartLabels.data_unavailable}
            </span>
          )}
        </div>

        <div className="relative h-16 pt-1.5">
          {market.assetType === "index" && (
            <div className="relative z-20 flex flex-col gap-2.5">
              <MarketSentiment symbol={market.symbol} userLanguage={language} />

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
