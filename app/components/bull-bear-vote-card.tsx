"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TZDate } from "@date-fns/tz";

import type { VoteDirection } from "@/app/actions/market-vote";
import type { HomeMarketItem } from "@/types/home-market";

import { useMarketQuote } from "@/app/hooks/useMarketQuote";
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
  initialVote?: VoteDirection | null;
  initialVoteSessionKey?: string | null;
  userLanguage?: string | null;
}

interface SparklineSession {
  sessionStartMs: number | null;
  sessionEndMs: number | null;
}

const MARKET_BY_SYMBOL = new Map(
  ALL_MARKET_SYMBOLS.map((market) => [market.symbol, market]),
);

const EMPTY_SESSION: SparklineSession = {
  sessionStartMs: null,
  sessionEndMs: null,
};

function getSparklineSession(
  symbol: string,
  providerSymbol: string | null | undefined,
  history?: { timestampMs: number }[],
): SparklineSession {
  if (!history?.length) return EMPTY_SESSION;

  const metadata =
    MARKET_BY_SYMBOL.get(symbol) ??
    (providerSymbol ? MARKET_BY_SYMBOL.get(providerSymbol) : undefined);

  if (!metadata?.marketSchedule) return EMPTY_SESSION;

  const schedule = TRADING_HOURS[metadata.marketSchedule];
  if (!schedule) return EMPTY_SESSION;

  let latestTimestamp = -Infinity;

  for (const { timestampMs } of history) {
    if (Number.isFinite(timestampMs)) {
      latestTimestamp = Math.max(latestTimestamp, timestampMs);
    }
  }

  if (!Number.isFinite(latestTimestamp)) return EMPTY_SESSION;

  const [openHour, openMinute] = schedule.open.split(":").map(Number);
  const [closeHour, closeMinute] = schedule.close.split(":").map(Number);

  if (![openHour, openMinute, closeHour, closeMinute].every(Number.isFinite)) {
    return EMPTY_SESSION;
  }

  // Use the latest candle's exchange-local date, not today's date.
  const date = new TZDate(latestTimestamp, schedule.timezone);

  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;
  const overnight = closeMinutes <= openMinutes;

  const startsPreviousDay =
    overnight && date.getHours() * 60 + date.getMinutes() <= closeMinutes;

  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate() - (startsPreviousDay ? 1 : 0);

  return {
    sessionStartMs: new TZDate(
      year,
      month,
      day,
      openHour,
      openMinute,
      0,
      0,
      schedule.timezone,
    ).getTime(),

    sessionEndMs: new TZDate(
      year,
      month,
      day + (overnight ? 1 : 0),
      closeHour,
      closeMinute,
      0,
      0,
      schedule.timezone,
    ).getTime(),
  };
}

function QuoteSkeleton({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`animate-pulse rounded-sm bg-zinc-100 motion-reduce:animate-none dark:bg-zinc-800/50 ${className}`}
    />
  );
}

export function BullBearVoteCard({
  market,
  initialVote = null,
  initialVoteSessionKey = null,
  userLanguage,
}: BullBearVoteCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const [quoteEnabled, setQuoteEnabled] = useState(false);

  const language = resolveLanguage(userLanguage);
  const chartLabels = CHART_LABELS[language];

  // Fetch quotes only when the card approaches the visible area.
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    if (typeof IntersectionObserver === "undefined") {
      setQuoteEnabled(true);
      return;
    }

    const scrollContainer = card.closest("[data-carousel-card]")?.parentElement
      ?.parentElement;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;

        setQuoteEnabled(true);
        observer.disconnect();
      },
      {
        root: scrollContainer ?? null,
        rootMargin: "0px 200px",
      },
    );

    observer.observe(card);

    return () => observer.disconnect();
  }, []);

  const { data, loading, error } = useMarketQuote(
    market.providerSymbol ?? market.symbol,
    market.name,
    "1D",
    market.displaySymbol,
    market.assetType,
    60_000,
    "5m",
    quoteEnabled,
  );

  const isQuoteLoading = !data && !error;
  const hasChartData =
    data?.history.some(({ price }) => Number.isFinite(price)) ?? false;

  const showVoting = quoteEnabled && market.assetType === "index";

  const { sessionStartMs, sessionEndMs } = useMemo(
    () =>
      getSparklineSession(market.symbol, market.providerSymbol, data?.history),
    [market.symbol, market.providerSymbol, data?.history],
  );

  const changeColor = !data
    ? "text-zinc-400 dark:text-zinc-500"
    : data.isPositive
      ? "text-[#07b056] dark:text-emerald-400"
      : "text-[#d94141] dark:text-[#ff4545] dark:font-[550]";

  return (
    <article
      ref={cardRef}
      data-tour="predict"
      aria-busy={loading && !data}
      className="relative w-44 shrink-0 text-zinc-900 dark:text-zinc-100"
    >
      <header>
        <h3
          title={market.name}
          className="outfit truncate pl-2.5 text-[30px] font-extrabold tracking-normal text-gray-500/50 dark:text-zinc-500/60"
        >
          {market.name}
        </h3>
      </header>

      <div className="mt-2 pb-2">
        <div className="flex h-7 items-center pl-3">
          {data ? (
            <Numeric className="outfit text-[18px] font-extrabold tracking-normal text-zinc-800 tabular-nums dark:text-zinc-100">
              {data.value}
            </Numeric>
          ) : isQuoteLoading ? (
            <QuoteSkeleton className="h-4.5 w-24" />
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
          ) : isQuoteLoading ? (
            <QuoteSkeleton className="h-3 w-28" />
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
                width={180}
                height={64}
                lunchStartMs={data.lunchStartMs}
                lunchEndMs={data.lunchEndMs}
              />
            </div>
          ) : isQuoteLoading ? (
            <div className="flex h-full w-full items-center px-3">
              <QuoteSkeleton className="h-10 w-full" />
            </div>
          ) : (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {chartLabels.data_unavailable}
            </span>
          )}
        </div>

        <div className="relative h-18 pt-1.5">
          {showVoting && (
            <div className="relative z-20 flex flex-col gap-2.5">
              <MarketSentiment
                symbol={market.symbol}
                userLanguage={language}
                enabled={quoteEnabled}
              />
              <MarketVoteButton
                marketName={market.name}
                symbol={market.symbol}
                initialVote={initialVote}
                initialVoteSessionKey={initialVoteSessionKey}
                enabled={quoteEnabled}
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
