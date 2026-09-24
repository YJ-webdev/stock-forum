"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  ChartRange,
  SelectedRange,
  useMarketQuote,
} from "@/app/hooks/useMarketQuote";
import { refreshMarketQuote } from "@/app/hooks/market-quote-store";

import { DetailChart } from "@/app/components/detail-chart";
import { MarketDetailHeader } from "@/app/components/market-detail-header";

import { getVotingWindow } from "@/lib/utils/get-voting-window";
import { ALL_MARKET_SYMBOLS, AssetType } from "@/lib/data/market-symbols";

import {
  getMarketVote,
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

const RANGES: SelectedRange[] = ["1D", "5D", "1M", "3M", "1Y", "5Y", "MAX"];

interface MarketPageClientProps {
  symbol: string;
  initialComments: MarketPageComments;
}

export default function MarketPageClient({
  symbol,
  initialComments,
}: MarketPageClientProps) {
  const user = useCurrentUser();
  const {
    points: userPoints,
    isLoading: pointsLoading,
    setPoints: setUserPoints,
  } = usePointBalance();

  const [betAmount, setBetAmount] = useState(50);
  const [showDetailChart, setShowDetailChart] = useState(false);
  const [voteLoading, setVoteLoading] = useState(true);

  const discussionRef = useRef<HTMLDivElement>(null);

  const [activeRange, setActiveRange] = useState<SelectedRange>("1D");
  const [selectedVote, setSelectedVote] = useState<VoteDirection | null>(null);
  const [voteStats, setVoteStats] = useState<MarketVoteStats | null>(null);

  const [now] = useState(() => Date.now());

  const [unavailableRanges, setUnavailableRanges] = useState<
    Record<string, Set<ChartRange>>
  >({});

  const [isPending, startTransition] = useTransition();

  const selectedSymbol = symbol;

  const symbolMeta = ALL_MARKET_SYMBOLS.find(
    (item) => item.symbol === selectedSymbol,
  );

  const selectedName = symbolMeta?.name ?? selectedSymbol;
  const selectedDisplaySymbol = symbolMeta?.displaySymbol ?? selectedSymbol;
  const selectedAssetType = symbolMeta?.assetType ?? "index";

  const { data, error } = useMarketQuote(
    selectedSymbol,
    selectedName,
    activeRange as ChartRange,
    selectedDisplaySymbol,
    selectedAssetType as AssetType,
    0,
    activeRange === "1D" ? "5m" : undefined,
  );

  const isLoggedIn = !!user;
  const nationality = user?.nationality ?? null;

  const votingWindow = getVotingWindow(selectedSymbol, now);

  const isMarketOpen = votingWindow.isMarketOpen;
  const canVote = votingWindow.canVote;

  // Use a primitive timestamp instead of Date as an effect dependency.
  // getVotingWindow() creates a new Date object on every render.
  const predictionForMs = votingWindow.predictionFor?.getTime() ?? null;

  useEffect(() => {
    if (!selectedSymbol || predictionForMs === null) {
      setSelectedVote(null);
      setVoteLoading(false);
      return;
    }

    let cancelled = false;

    async function loadVote(sessionMs: number) {
      setVoteLoading(true);

      try {
        const vote = await getMarketVote({
          symbol: selectedSymbol,
          sessionDate: new Date(sessionMs),
        });

        if (!cancelled) {
          setSelectedVote(vote);
        }
      } catch {
        if (!cancelled) {
          setSelectedVote(null);
        }
      } finally {
        if (!cancelled) {
          setVoteLoading(false);
        }
      }
    }

    loadVote(predictionForMs);

    return () => {
      cancelled = true;
    };
  }, [selectedSymbol, predictionForMs]);

  useEffect(() => {
    if (!selectedSymbol || predictionForMs === null) {
      setVoteStats(null);
      return;
    }

    let cancelled = false;

    async function loadVoteStats(sessionMs: number) {
      try {
        const stats = await getMarketVoteStats({
          symbol: selectedSymbol,
          sessionDate: new Date(sessionMs),
        });

        if (!cancelled) {
          setVoteStats(stats);
        }
      } catch {
        if (!cancelled) {
          setVoteStats(null);
        }
      }
    }

    loadVoteStats(predictionForMs);

    return () => {
      cancelled = true;
    };
  }, [selectedSymbol, predictionForMs]);

  const handleVote = (
    direction: VoteDirection,
    betAmount: number,
    comment: string,
    gif: GifResult | null,
    onSuccess?: () => void | Promise<void>,
  ) => {
    if (!isLoggedIn) {
      toast.error("Please log in to vote.");
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

    if (betAmount < 50 || betAmount > 500 || betAmount > userPoints) {
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

    // ------------------------------------------------------------
    // Optional comment / GIF
    // ------------------------------------------------------------

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

    // Optimistic UI
    setSelectedVote(direction);

    startTransition(async () => {
      try {
        const result = await createComment({
          content,
          assetSymbols: [selectedSymbol],

          prediction: {
            direction,
            pointsBet: betAmount,
            sessionDate,
          },
        });

        if (result.points !== null) {
          setUserPoints(result.points);
        }

        await onSuccess?.();

        const stats = await getMarketVoteStats({
          symbol: selectedSymbol,
          sessionDate,
        });
        setVoteStats(stats);

        toast.success(
          direction === "BULL"
            ? `Bullish prediction submitted with ${betAmount} pts.`
            : `Bearish prediction submitted with ${betAmount} pts.`,
        );
      } catch (error) {
        // Roll back optimistic UI
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
    if (range === activeRange) return;

    if (unavailableRanges[selectedSymbol]?.has(range as ChartRange)) {
      return;
    }

    const chartInterval = range === "1D" ? "5m" : undefined;

    const result = await refreshMarketQuote(
      selectedSymbol,
      selectedName,
      range as ChartRange,
      selectedDisplaySymbol,
      selectedAssetType as AssetType,
      chartInterval,
    );

    if (result.error || !result.data) {
      setUnavailableRanges((prev) => ({
        ...prev,

        [selectedSymbol]: new Set([
          ...(prev[selectedSymbol] ?? []),
          range as ChartRange,
        ]),
      }));

      return;
    }

    setActiveRange(range);
  };

  useEffect(() => {
    setBetAmount(50);

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }, [selectedSymbol]);

  // const SENTIMENT_BLOCKS = 17;
  // const bullBlocks = voteStats
  //   ? Math.round((voteStats.bullPercent / 100) * SENTIMENT_BLOCKS)
  //   : 0;
  // const bearBlocks = SENTIMENT_BLOCKS - bullBlocks;
  // const bullBar = "█".repeat(bullBlocks);
  // const bearBar = "░".repeat(bearBlocks);

  return (
    <div className="mx-auto mt-20 max-w-4xl">
      {/* Title */}
      <div className="relative w-full space-y-2 px-4">
        <div className="mt-2 flex items-baseline justify-between gap-4">
          <h1 className="text-[44px] font-bold leading-none tracking-tight text-gray-500/50 dark:text-zinc-700">
            {selectedName}
          </h1>
        </div>
      </div>

      {/* Market data */}
      {error ? (
        <div className="mt-5 md:mx-4">
          <div className="flex aspect-20/11 w-full items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs text-zinc-400">{error}</span>
          </div>
        </div>
      ) : data ? (
        <>
          {/* Header + voting */}
          <div className="relative mt-4 mb-4 flex w-full items-start justify-between">
            <MarketDetailHeader
              rawPrice={data.rawPrice}
              change={data.change}
              percent={data.percent}
              isPositive={data.isPositive}
              updatedAt={data.updatedAt}
              selectedRange={activeRange}
              exchangeTimezone={
                data.exchangeTimezone ?? symbolMeta?.timezone ?? "UTC"
              }
            />

            {!showDetailChart && (
              <div
                onClick={() => setShowDetailChart((prev) => !prev)}
                className="relative mr-3 flex w-auto flex-col items-stretch gap-0 border-none p-0"
              >
                <div className="relative mx-3 mt-5 flex cursor-pointer justify-start">
                  <TrendSparkline
                    data={data.history}
                    isPositive={data.isPositive}
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
                  {/* DetailChart + range selector */}
                  <div className="mx-4">
                    <DetailChart
                      history={data.history}
                      isPositive={data.isPositive}
                      isClosed={data.isClosed}
                      previousClose={data.previousClose}
                      lunchStartMs={
                        activeRange === "1D" ? data.lunchStartMs : null
                      }
                      lunchEndMs={activeRange === "1D" ? data.lunchEndMs : null}
                      exchangeTimezone={
                        data.exchangeTimezone ?? symbolMeta?.timezone ?? "UTC"
                      }
                      range={activeRange}
                      onClick={() => setShowDetailChart(false)}
                    />

                    {/* Range selector */}
                    <div className="mt-4 mb-10 flex flex-wrap gap-2">
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
                            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
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
        <>
          {/* Header skeleton */}
          <div className="relative mt-4 w-full space-y-2 px-4 pb-2">
            <div className="mb-2 flex w-full flex-col gap-2">
              <Skeleton className="h-8 w-44 rounded-xl" />
              <Skeleton className="h-5 w-36 rounded-full" />
            </div>
          </div>
        </>
      )}

      {/* Market sentiment */}
      <div className="ibmPlexMono mx-4 mt-8">
        {data && voteStats ? (
          <div
            className="
        flex flex-col gap-5
        rounded-xl
        bg-zinc-50
        px-5 py-4
        dark:bg-zinc-800/50
        sm:flex-row sm:items-start sm:justify-between
        border
      "
          >
            {/* Voter nationalities */}
            <div className="min-w-0">
              <p className="text-[14px] font-medium">Voters</p>

              {voteStats.totalVotes > 0 ? (
                <div
                  className="
              mt-2
              grid grid-cols-2
              gap-x-6 gap-y-1.5
              text-[13px]
              text-zinc-500
              dark:text-zinc-400
            "
                >
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
            <div
              className="
          w-full
          border-t border-zinc-200
          pt-4
          dark:border-zinc-700
          sm:w-1/2 sm:shrink-0
          sm:border-t-0 sm:pt-0
         
        "
            >
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

              <div
                className="
            mt-2
            flex w-full
            overflow-hidden
            whitespace-nowrap
            text-[15px]
            leading-none
           
         
          "
              >
                <div className="mt-2 flex h-5 w-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600"
                    style={{
                      width: `${voteStats.bullPercent}%`,
                    }}
                  />

                  <div
                    className="
      h-full
      bg-[radial-gradient(circle,currentColor_0.75px,transparent_0.75px)]
      bg-size-[2.5px_2.5px]
      text-zinc-300
      dark:text-zinc-600
    "
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

      <div ref={discussionRef} className="mx-4 mt-10 mb-20">
        <MarketComments
          key={selectedSymbol}
          assetSymbol={selectedSymbol}
          selectedVote={selectedVote}
          voteLoading={voteLoading || isPending || pointsLoading}
          isMarketOpen={isMarketOpen}
          userPoints={userPoints}
          betAmount={betAmount}
          setBetAmount={setBetAmount}
          handleVote={handleVote}
          targetMs={votingWindow.targetMs}
          countdownType={votingWindow.countdownType}
          showCountdown={votingWindow.showCountdown}
          initialComments={initialComments}
        />
      </div>
    </div>
  );
}
