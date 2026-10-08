"use client";

import { TZDate } from "@date-fns/tz";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  ChartRange,
  SelectedRange,
  useMarketQuote,
} from "@/app/hooks/useMarketQuote";
import { refreshMarketQuote } from "@/app/hooks/market-quote-store";

import { DetailChart } from "@/app/components/detail-chart";
import { MarketDetailHeader } from "@/app/components/market-detail-header";

import { getVotingWindow } from "@/lib/utils/get-voting-window";
import {
  ALL_MARKET_SYMBOLS,
  TRADING_HOURS,
  type AssetType,
} from "@/lib/data/market-symbols";

import {
  getMarketVoteStats,
  type MarketVoteStats,
  type VoteDirection,
} from "@/app/actions/market-vote";

import { createComment, type MarketPageComments } from "@/app/actions/post";

import type { GifResult } from "@/app/components/gif-picker";
import type { JSONContent } from "@tiptap/react";

import { useCurrentUser } from "@/app/context/user-context";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendSparkline } from "@/app/components/trend-sparkline";
import { MarketComments } from "@/app/components/comment";
import { usePointBalance } from "@/app/context/point-balance-context";
import { countryCodeToFlag } from "@/lib/utils/nationality-flag";

import MarketNews from "@/app/components/market-news";
import { MarketActionsMenu } from "@/app/components/market-action-menu";

const RANGES: SelectedRange[] = ["1D", "5D", "1M", "3M", "1Y", "5Y", "MAX"];

interface MarketPageClientProps {
  symbol: string;
  initialVoteStats: MarketVoteStats | null;
  initialVote: VoteDirection | null;
  initialIsWatchlist: boolean;
}

/**
 * Use the date of the actual chart data.
 * This also keeps the correct session when the API returns
 * the last available trading day during a holiday or weekend.
 */
function getChartSession(
  symbol: string,
  history: { timestampMs: number }[] | undefined,
  range: string,
): {
  sessionStartMs: number | null;
  sessionEndMs: number | null;
} {
  const emptySession = {
    sessionStartMs: null,
    sessionEndMs: null,
  };

  if (range !== "1D" || !history?.length) {
    return emptySession;
  }

  const market = ALL_MARKET_SYMBOLS.find((item) => item.symbol === symbol);

  if (!market?.marketSchedule) {
    return emptySession;
  }

  const schedule = TRADING_HOURS[market.marketSchedule];

  if (!schedule) {
    return emptySession;
  }

  let latestTimestampMs = -Infinity;

  for (const point of history) {
    if (
      Number.isFinite(point.timestampMs) &&
      point.timestampMs > latestTimestampMs
    ) {
      latestTimestampMs = point.timestampMs;
    }
  }

  if (!Number.isFinite(latestTimestampMs)) {
    return emptySession;
  }

  const dataDate = new TZDate(latestTimestampMs, schedule.timezone);

  const [openHour, openMinute] = schedule.open.split(":").map(Number);

  const [closeHour, closeMinute] = schedule.close.split(":").map(Number);

  if (![openHour, openMinute, closeHour, closeMinute].every(Number.isFinite)) {
    return emptySession;
  }

  const year = dataDate.getFullYear();
  const month = dataDate.getMonth();
  const day = dataDate.getDate();

  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;

  const isOvernight = closeMinutes <= openMinutes;

  let startDay = day;

  // For an overnight session, a candle before the closing
  // time belongs to the session that started the day before.
  if (isOvernight) {
    const dataMinutes = dataDate.getHours() * 60 + dataDate.getMinutes();

    if (dataMinutes <= closeMinutes) {
      startDay -= 1;
    }
  }

  const sessionStartMs = new TZDate(
    year,
    month,
    startDay,
    openHour,
    openMinute,
    0,
    0,
    schedule.timezone,
  ).getTime();

  const sessionEndMs = new TZDate(
    year,
    month,
    startDay + (isOvernight ? 1 : 0),
    closeHour,
    closeMinute,
    0,
    0,
    schedule.timezone,
  ).getTime();

  return {
    sessionStartMs,
    sessionEndMs,
  };
}

export default function MarketPageClient({
  symbol,
  initialVoteStats,
  initialVote,
  initialIsWatchlist,
}: MarketPageClientProps) {
  const user = useCurrentUser();

  const { points: userPoints, setPoints: setUserPoints } = usePointBalance();

  const [betAmount, setBetAmount] = useState(50);
  const [showDetailChart, setShowDetailChart] = useState(false);

  const [selectedVote, setSelectedVote] = useState<VoteDirection | null>(
    initialVote,
  );

  const [voteStats, setVoteStats] = useState<MarketVoteStats | null>(
    initialVoteStats,
  );

  const [activeRange, setActiveRange] = useState<SelectedRange>("1D");

  const [unavailableRanges, setUnavailableRanges] = useState<
    Record<string, Set<ChartRange>>
  >({});

  const [isPending, startTransition] = useTransition();
  const discussionRef = useRef<HTMLDivElement>(null);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const selectedSymbol = symbol;

  const symbolMeta = ALL_MARKET_SYMBOLS.find(
    (item) => item.symbol === selectedSymbol,
  );

  const selectedName = symbolMeta?.name ?? selectedSymbol;
  const selectedDisplaySymbol = symbolMeta?.displaySymbol ?? selectedSymbol;

  const selectedAssetType = symbolMeta?.assetType ?? "index";

  const canPredict = selectedAssetType === "index";

  const chartInterval =
    activeRange === "1D" ? (showDetailChart ? "1m" : "15m") : undefined;

  const { data, error } = useMarketQuote(
    selectedSymbol,
    selectedName,
    activeRange as ChartRange,
    selectedDisplaySymbol,
    selectedAssetType as AssetType,
    0,
    chartInterval,
  );

  const { sessionStartMs, sessionEndMs } = getChartSession(
    selectedSymbol,
    data?.history,
    activeRange,
  );

  const exchangeTimezone =
    data?.exchangeTimezone ?? symbolMeta?.timezone ?? "UTC";

  const isLoggedIn = !!user;
  const nationality = user?.nationality ?? null;

  const votingWindow = getVotingWindow(selectedSymbol, now);

  const isMarketOpen = canPredict ? votingWindow.isMarketOpen : false;

  const canVote = canPredict ? votingWindow.canVote : false;

  const handleVote = (
    direction: VoteDirection,
    amount: number,
    comment: string,
    gif: GifResult | null,
    onSuccess?: (comment: MarketPageComments[number]) => void | Promise<void>,
  ) => {
    if (!canPredict) {
      toast.error("Predictions are not available for this asset.");
      return;
    }

    if (!isLoggedIn) {
      toast.error("Log in to make your prediction.");
      return;
    }

    if (!nationality) {
      toast.error("Please set your nationality before voting.");
      return;
    }

    if (selectedVote !== null) {
      toast.error("You have already voted for this round.");
      return;
    }

    if (isPending) {
      return;
    }

    const sessionDate = votingWindow.predictionFor;

    if (!canVote || !sessionDate) {
      toast.error(
        isMarketOpen
          ? "Voting is closed while the market is open."
          : "Voting is currently unavailable.",
      );
      return;
    }

    if (userPoints < 50) {
      toast.error("Please add balance to continue voting.");
      return;
    }

    if (amount < 50 || amount > 500 || amount > userPoints) {
      toast.error(
        `Bet amount must be between 50 and ${Math.min(
          500,
          userPoints,
        )} points.`,
      );
      return;
    }

    if (!data) {
      toast.error("Market data is unavailable.");
      return;
    }

    const referenceClose = Number(data.rawPrice);

    if (!Number.isFinite(referenceClose) || referenceClose <= 0) {
      toast.error("Invalid market price.");
      return;
    }

    let content: JSONContent | null = null;

    if (comment.trim() || gif) {
      content = {
        type: "doc",
        content: [
          ...(comment.trim()
            ? [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: comment.trim(),
                    },
                  ],
                },
              ]
            : []),
          ...(gif
            ? [
                {
                  type: "image",
                  attrs: {
                    src: gif.src,
                    alt: gif.title,
                  },
                },
              ]
            : []),
        ],
      };
    }

    setSelectedVote(direction);

    startTransition(async () => {
      try {
        const result = await createComment({
          content,
          assetSymbols: [selectedSymbol],
          prediction: {
            direction,
            pointsBet: amount,
            sessionDate,
          },
        });

        if (result.points !== null) {
          setUserPoints(result.points);
        }

        if (result.comment) {
          await onSuccess?.(result.comment);
        }

        const stats = await getMarketVoteStats({
          symbol: selectedSymbol,
          sessionDate,
        });

        setVoteStats(stats);

        toast.success(
          direction === "BULL"
            ? `Bullish prediction submitted with ${amount} pts.`
            : `Bearish prediction submitted with ${amount} pts.`,
        );
      } catch (error) {
        setSelectedVote(null);

        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to submit prediction.",
        );
      }
    });
  };

  const handleRangeChange = async (range: SelectedRange) => {
    if (range === activeRange) {
      return;
    }

    if (unavailableRanges[selectedSymbol]?.has(range as ChartRange)) {
      return;
    }

    // handleRangeChange
    const chartInterval = range === "1D" ? "1m" : undefined;

    const result = await refreshMarketQuote(
      selectedSymbol,
      selectedName,
      range as ChartRange,
      selectedDisplaySymbol,
      selectedAssetType as AssetType,
      chartInterval,
    );

    if (result.error || !result.data) {
      setUnavailableRanges((previous) => ({
        ...previous,
        [selectedSymbol]: new Set([
          ...(previous[selectedSymbol] ?? []),
          range as ChartRange,
        ]),
      }));
      return;
    }

    setActiveRange(range);
  };

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [selectedSymbol]);

  return (
    <div className="mx-auto max-w-4xl">
      {/* News */}

      <div className="mx-4 flex w-full self-end gap-2">
        <MarketNews symbol={selectedSymbol} />
      </div>

      {/* Title */}

      <div className="relative mt-5 w-full space-y-2 px-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="mt-8 text-[44px] font-bold leading-none tracking-tight text-gray-500/50 dark:text-zinc-700">
            {selectedName}
          </h1>

          <MarketActionsMenu
            key={selectedSymbol}
            symbol={selectedSymbol}
            marketName={selectedName}
            initialIsWatchlist={initialIsWatchlist}
          />
        </div>
      </div>

      {/* Market data */}

      {error ? (
        <div className="mt-4 md:mx-4">
          <div className="flex aspect-20/11 w-full items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs text-zinc-400">{error}</span>
          </div>
        </div>
      ) : data ? (
        <>
          {/* Header */}

          <div className="relative mb-4 mt-3 flex w-full items-start justify-between">
            <MarketDetailHeader
              rawPrice={data.rawPrice}
              change={data.change}
              percent={data.percent}
              isPositive={data.isPositive}
              updatedAt={data.updatedAt}
              selectedRange={activeRange}
              exchangeTimezone={exchangeTimezone}
            />

            {!showDetailChart && (
              <div
                onClick={() => setShowDetailChart(true)}
                className="relative mr-3 flex w-auto flex-col items-stretch gap-0 border-none p-0"
              >
                <div className="relative mx-3 mt-5 flex cursor-pointer justify-start">
                  <TrendSparkline
                    data={data.history}
                    isPositive={data.isPositive}
                    previousClose={data.previousClose}
                    sessionStartMs={sessionStartMs}
                    sessionEndMs={sessionEndMs}
                    lunchStartMs={
                      activeRange === "1D" ? data.lunchStartMs : null
                    }
                    lunchEndMs={activeRange === "1D" ? data.lunchEndMs : null}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Chart */}

          <div className="overflow-hidden">
            <AnimatePresence initial={false}>
              {showDetailChart && (
                <motion.div
                  initial={{
                    height: 0,
                    opacity: 0,
                    scale: 0.92,
                    x: 20,
                    y: -10,
                  }}
                  animate={{
                    height: "auto",
                    opacity: 1,
                    scale: 1,
                    x: 0,
                    y: 0,
                  }}
                  exit={{
                    height: 0,
                    opacity: 0,
                    scale: 0.6,
                    x: 20,
                    y: -10,
                  }}
                  transition={{
                    height: {
                      duration: 0.4,
                      ease: [0.4, 0, 0.2, 1],
                    },
                    scale: {
                      duration: 0.35,
                      ease: [0.4, 0, 0.2, 1],
                    },
                    x: {
                      duration: 0.35,
                      ease: [0.4, 0, 0.2, 1],
                    },
                    y: {
                      duration: 0.35,
                      ease: [0.4, 0, 0.2, 1],
                    },
                    opacity: {
                      duration: 0.3,
                    },
                  }}
                  style={{
                    transformOrigin: "top right",
                  }}
                >
                  <div className="mx-4">
                    <DetailChart
                      key={`${selectedSymbol}-${activeRange}`}
                      history={data.history}
                      isPositive={data.isPositive}
                      isClosed={data.isClosed}
                      previousClose={data.previousClose}
                      sessionStartMs={sessionStartMs}
                      sessionEndMs={sessionEndMs}
                      lunchStartMs={
                        activeRange === "1D" ? data.lunchStartMs : null
                      }
                      lunchEndMs={activeRange === "1D" ? data.lunchEndMs : null}
                      exchangeTimezone={exchangeTimezone}
                      range={activeRange}
                      onClick={() => setShowDetailChart(false)}
                    />

                    {/* Range selector */}

                    <div className="mt-4 flex flex-wrap gap-1 sm:gap-2 items-center justify-start sm:justify-start">
                      {RANGES.map((range) => {
                        const isUnavailable =
                          unavailableRanges[selectedSymbol]?.has(
                            range as ChartRange,
                          ) ||
                          (range === activeRange && !!error);

                        const isActive = activeRange === range;

                        return (
                          <button
                            key={range}
                            type="button"
                            title={
                              isUnavailable ? "Data unavailable" : undefined
                            }
                            disabled={isUnavailable}
                            onClick={() => handleRangeChange(range)}
                            className={`rounded-full px-3.25 py-1.25 text-xs font-medium transition-all ${
                              isUnavailable
                                ? "cursor-default bg-zinc-100 font-thin text-zinc-400 dark:bg-zinc-700/50 dark:text-zinc-600"
                                : isActive
                                  ? "cursor-pointer bg-zinc-300/50 text-zinc-600 dark:bg-zinc-600/50 dark:text-zinc-400"
                                  : "cursor-pointer bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-600/50"
                            }`}
                          >
                            {range}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      ) : (
        <div className="relative mt-4 w-full space-y-2 px-4 pb-2">
          <div className="mb-2 flex w-full flex-col gap-2">
            <Skeleton className="h-8 w-44 rounded-xl" />
            <Skeleton className="h-5 w-36 rounded-full" />
          </div>
        </div>
      )}

      {/* Market sentiment */}

      {canPredict && (
        <div className="ibmPlexMono mx-4 mt-7">
          {voteStats ? (
            <div className="flex flex-col gap-5 rounded-xl border bg-zinc-50 px-5 py-4 dark:bg-zinc-800/50 sm:flex-row sm:items-start sm:justify-between">
              {/* Voter nationalities */}

              <div className="min-w-0">
                <p className="text-[14px] font-medium">Voters</p>

                {voteStats.totalVotes > 0 ? (
                  <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13px] text-zinc-500 dark:text-zinc-400">
                    {voteStats.nationalities.map((country) => (
                      <div
                        key={country.nationality}
                        className="flex items-center gap-2 whitespace-nowrap"
                      >
                        <span>
                          {country.nationality === "OTHER"
                            ? "🌐"
                            : countryCodeToFlag(country.nationality)}
                        </span>

                        <span>
                          {country.nationality === "OTHER"
                            ? "Other"
                            : country.nationality}
                        </span>

                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {country.percent}% ({country.votes})
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[13px] text-zinc-500 dark:text-zinc-400">
                    No votes yet
                  </p>
                )}
              </div>

              {/* Bull / Bear sentiment */}

              <div className="w-full border-t border-zinc-200 pt-4 dark:border-zinc-700 sm:w-1/2 sm:shrink-0 sm:border-t-0 sm:pt-0">
                <div className="flex items-center justify-between text-[14px] font-medium">
                  <span>
                    {voteStats.totalVotes > 0
                      ? voteStats.bullPercent >= voteStats.bearPercent
                        ? "Bullish"
                        : "Bearish"
                      : "No sentiment"}
                  </span>

                  <span>
                    {voteStats.bullPercent}% / {voteStats.bearPercent}%
                  </span>
                </div>

                <div className="mt-2 flex w-full overflow-hidden whitespace-nowrap text-[15px] leading-none">
                  <div className="mt-2 flex h-5 w-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600"
                      style={{
                        width: `${voteStats.bullPercent}%`,
                      }}
                    />

                    <div
                      className="h-full bg-[radial-gradient(circle,currentColor_0.75px,transparent_0.75px)] bg-size-[2.5px_2.5px] text-zinc-300 dark:text-zinc-600"
                      style={{
                        width: `${voteStats.bearPercent}%`,
                      }}
                    />
                  </div>
                </div>

                <p className="mt-2 text-end text-[14px] font-medium">
                  {voteStats.totalVotes}{" "}
                  {voteStats.totalVotes === 1 ? "vote" : "votes"}
                </p>
              </div>
            </div>
          ) : (
            <Skeleton className="h-30 w-full rounded-xl" />
          )}
        </div>
      )}

      {/* Discussion */}

      <div ref={discussionRef} className="mx-4 mt-8">
        <MarketComments
          key={selectedSymbol}
          assetSymbol={selectedSymbol}
          prediction={
            canPredict
              ? {
                  selectedVote,
                  isMarketOpen,
                  userPoints,
                  betAmount,
                  setBetAmount,
                  handleVote,
                  isPending,
                  targetMs: votingWindow.targetMs,
                  countdownType: votingWindow.countdownType,
                  showCountdown: votingWindow.showCountdown,
                }
              : null
          }
          currentSessionStartMs={
            canPredict ? votingWindow.currentSessionStartMs : null
          }
        />
      </div>
    </div>
  );
}
