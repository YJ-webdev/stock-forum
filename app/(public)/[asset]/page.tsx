// app/[asset]/page.tsx
"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  ChartRange,
  SelectedRange,
  useMarketQuote,
} from "@/app/hooks/useMarketQuote";
import { refreshMarketQuote } from "@/app/hooks/market-quote-store";

import { DetailChart } from "@/app/components/detail-chart";
import { MarketDetailHeader } from "@/app/components/market-detail-header";
import { VoteButton } from "@/app/components/vote-button";
import { VotingCountdown } from "@/app/components/voting-countdown";

import { getVotingWindow } from "@/lib/utils/get-voting-window";
import { ALL_MARKET_SYMBOLS, AssetType } from "@/lib/data/market-symbols";

import {
  getMarketVote,
  removeMarketVote,
  submitMarketVote,
  type VoteDirection,
} from "@/app/actions/market-vote";

import { useCurrentUser } from "@/app/context/user-context";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendSparkline } from "@/app/components/trend-sparkline";
import { MarketComments } from "@/app/components/comment";
import { Badge } from "@/components/ui/badge";
import { BullBearGauge } from "@/app/components/bull-bear-gauge";

const RANGES: SelectedRange[] = ["1D", "5D", "1M", "3M", "1Y", "5Y", "MAX"];
const BET_AMOUNTS = [50, 100, 200, 300, 400, 500];
export default function MarketDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useCurrentUser();

  const [betAmount, setBetAmount] = useState(100);
  const [showDetailChart, setShowDetailChart] = useState(false);
  const [voteLoading, setVoteLoading] = useState(true);

  const chartRef = useRef<HTMLDivElement>(null);
  const discussionRef = useRef<HTMLDivElement>(null);

  const [activeRange, setActiveRange] = useState<SelectedRange>("1D");
  const [selectedVote, setSelectedVote] = useState<VoteDirection | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const [unavailableRanges, setUnavailableRanges] = useState<
    Record<string, Set<ChartRange>>
  >({});
  const [isPending, startTransition] = useTransition();

  // ------------------------------------------------------------
  // Market
  // ------------------------------------------------------------

  const rawSymbol = searchParams.get("symbol") ?? "^GSPC";
  const selectedSymbol = decodeURIComponent(rawSymbol);

  const symbolMeta = ALL_MARKET_SYMBOLS.find(
    (item) => item.symbol === selectedSymbol,
  );

  const selectedName = symbolMeta?.name ?? selectedSymbol;
  const selectedDisplaySymbol = symbolMeta?.displaySymbol ?? selectedSymbol;
  const selectedAssetType = symbolMeta?.assetType ?? "index";

  // ------------------------------------------------------------
  // Quote
  // ------------------------------------------------------------

  const { data, error } = useMarketQuote(
    selectedSymbol,
    selectedName,
    activeRange as ChartRange,
    selectedDisplaySymbol,
    selectedAssetType as AssetType,
    0,
    activeRange === "1D" ? "1m" : undefined,
  );

  // ------------------------------------------------------------
  // Voting
  // ------------------------------------------------------------

  const isLoggedIn = !!user;
  const nationality = user?.nationality ?? null;

  const votingWindow = getVotingWindow(selectedSymbol, now);

  const isMarketOpen = votingWindow?.isMarketOpen ?? false;

  // Load existing vote
  useEffect(() => {
    if (!selectedSymbol) return;

    let cancelled = false;

    async function loadVote() {
      try {
        const vote = await getMarketVote({
          symbol: selectedSymbol,
        });

        if (!cancelled) {
          setSelectedVote(vote);
          setVoteLoading(false);
        }
      } catch {
        if (!cancelled) {
          setSelectedVote(null);
          setVoteLoading(false);
        }
      }
    }

    loadVote();

    return () => {
      cancelled = true;
    };
  }, [selectedSymbol]);

  const handleCountdownExpire = useCallback(() => {
    setNow(Date.now());
  }, []);

  const handleVote = (direction: VoteDirection) => {
    if (!isLoggedIn) {
      toast.error("Please log in to vote.");
      return;
    }

    if (!nationality) {
      toast.error("Please set your nationality before voting.");
      return;
    }

    if (isMarketOpen) {
      toast.error("Vote closed.");
      return;
    }

    if (isPending) return;

    // Save previous state in case the server request fails
    const previousVote = selectedVote;

    // Same button clicked again → untick
    const nextVote: VoteDirection | null =
      selectedVote === direction ? null : direction;

    // ⚡ Update UI immediately
    setSelectedVote(nextVote);

    startTransition(async () => {
      try {
        if (nextVote === null) {
          await removeMarketVote({
            symbol: selectedSymbol,
          });

          toast.success("Vote cancelled.");
          return;
        }

        await submitMarketVote({
          symbol: selectedSymbol,
          nationality,
          direction: nextVote,
        });

        toast.success(
          nextVote === "BULL"
            ? "Bullish vote submitted."
            : "Bearish vote submitted.",
        );
      } catch (error) {
        // Server failed → restore previous UI
        setSelectedVote(previousVote);

        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to update prediction.",
        );
      }
    });
  };

  const handleRangeChange = async (range: SelectedRange) => {
    if (range === activeRange) return;

    if (unavailableRanges[selectedSymbol]?.has(range as ChartRange)) {
      return;
    }

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
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [selectedSymbol]);

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
          <div className="relative flex items-start justify-between mt-4 w-full mb-4">
            <MarketDetailHeader
              rawPrice={data.rawPrice}
              change={data.change}
              percent={data.percent}
              isPositive={data.isPositive}
              updatedAt={data.updatedAt}
              selectedRange={activeRange}
              onBack={() => router.back()}
              exchangeTimezone={
                data.exchangeTimezone ?? symbolMeta?.timezone ?? "UTC"
              }
            />
            {!showDetailChart ? (
              <div className="static z-auto mr-3 flex w-auto flex-col items-stretch gap-0 border-none bg-transparent p-0">
                <div
                  onClick={() => setShowDetailChart((prev) => !prev)}
                  className="flex cursor-pointer justify-start mt-5 mx-3"
                >
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
            ) : (
              <></>
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
      {/* Prediction Vote Buttons */}
      {/* <div className="mx-4">
        <div className="flex items-center gap-2">
          <VoteButton
            voteDirection="BULL"
            onClick={() => handleVote("BULL")}
            selectedVote={selectedVote}
            isPending={voteLoading}
            isMarketOpen={isMarketOpen}
          />

          <VoteButton
            voteDirection="BEAR"
            onClick={() => handleVote("BEAR")}
            selectedVote={selectedVote}
            isPending={voteLoading}
            isMarketOpen={isMarketOpen}
          />
        </div>

        {votingWindow && (
          <div className="ml-0.5 mt-1">
            <VotingCountdown
              targetMs={votingWindow.targetMs}
              type={votingWindow.countdownType}
              showCountdown={votingWindow.showCountdown}
              isMarketOpen={votingWindow.isMarketOpen}
              onExpire={handleCountdownExpire}
              selectedVote={selectedVote}
            />
          </div>
        )}
      </div> */}
      {/* BullBearGauge */}
      {/* <BullBearGauge bullish={824} bearish={460} /> */}
      {/* Prediction */}

      {/* Prediction */}
      {/* Prediction */}
      <div className="mt-5 w-full px-4">
        <div className="flex w-full items-center gap-8">
          {/* Voting */}
          <div className="min-w-0 flex-1">
            {/* Balance + Bet amount */}
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="text-[13px] text-zinc-500">Your points</p>

                <p className="mt-0.5 text-[18px] font-semibold text-zinc-900 dark:text-zinc-200">
                  2,840
                  <span className="ml-1 text-[12px] font-normal text-zinc-500">
                    pts
                  </span>
                </p>
              </div>

              <p className="text-[13px] text-zinc-500">Bet amount</p>
            </div>

            {/* Bet input */}
            <div
              className="
          flex h-12 w-full items-center
          rounded-xl border border-zinc-200
          bg-zinc-50 px-3
          dark:border-zinc-800 dark:bg-zinc-900
        "
            >
              <input
                type="number"
                min={0}
                max={2840}
                step={50}
                value={betAmount}
                onChange={(e) => setBetAmount(Number(e.target.value))}
                className="
            min-w-0 flex-1 bg-transparent
            text-[16px] font-semibold
            text-zinc-900 outline-none
            dark:text-zinc-200
          "
              />

              <span className="text-[12px] text-zinc-500">pts</span>
            </div>

            {/* Quick amounts */}
            <div className="mt-2 grid grid-cols-6 gap-1.5">
              {BET_AMOUNTS.map((amount) => {
                const selected = betAmount === amount;

                return (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setBetAmount(amount)}
                    className={`
                h-8 rounded-lg text-[12px] font-medium
                transition-colors
                ${
                  selected
                    ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }
              `}
                  >
                    {amount}
                  </button>
                );
              })}
            </div>

            {/* Vote Buttons */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <VoteButton
                voteDirection="BULL"
                onClick={() => handleVote("BULL")}
                selectedVote={selectedVote}
                isPending={voteLoading}
                isMarketOpen={isMarketOpen}
                className="h-14 w-full rounded-xl text-[16px] font-semibold"
              />

              <VoteButton
                voteDirection="BEAR"
                onClick={() => handleVote("BEAR")}
                selectedVote={selectedVote}
                isPending={voteLoading}
                isMarketOpen={isMarketOpen}
                className="h-14 w-full rounded-xl text-[16px] font-semibold"
              />
            </div>

            {/* Countdown */}
            {votingWindow && (
              <div className="mt-2">
                <VotingCountdown
                  targetMs={votingWindow.targetMs}
                  type={votingWindow.countdownType}
                  showCountdown={votingWindow.showCountdown}
                  isMarketOpen={votingWindow.isMarketOpen}
                  onExpire={handleCountdownExpire}
                  selectedVote={selectedVote}
                />
              </div>
            )}
          </div>

          {/* Gauge */}
          <div className="flex shrink-0 items-center justify-center px-6">
            <BullBearGauge bullish={824} bearish={460} />
          </div>
        </div>
      </div>
      {/* Comment */}
      <div className="mx-4 mt-10 mb-20">
        <MarketComments />
      </div>
    </div>
  );
}
