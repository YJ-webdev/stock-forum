// app/[asset]/page.tsx
"use client";

import { useCallback, useRef, useState, useTransition } from "react";
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
  submitMarketVote,
  type VoteDirection,
} from "@/app/actions/market-vote";

import { useCurrentUser } from "@/app/context/user-context";
import { Skeleton } from "@/components/ui/skeleton";

const RANGES: SelectedRange[] = ["1D", "5D", "1M", "3M", "1Y", "5Y", "MAX"];

export default function MarketDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useCurrentUser();

  const chartRef = useRef<HTMLDivElement>(null);

  const [activeRange, setActiveRange] = useState<SelectedRange>("1D");

  const [selectedVote, setSelectedVote] = useState<VoteDirection | null>(null);

  const [voteLoading] = useState(false);
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

  const selectedName = searchParams.get("name") ?? "S&P 500";

  const selectedAssetType = searchParams.get("assetType") ?? "index";

  const symbolMeta = ALL_MARKET_SYMBOLS.find(
    (item) => item.symbol === selectedSymbol,
  );

  const selectedDisplaySymbol =
    searchParams.get("displaySymbol") ??
    symbolMeta?.displaySymbol ??
    selectedSymbol;

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

    startTransition(async () => {
      try {
        const vote = await submitMarketVote({
          symbol: selectedSymbol,
          nationality,
          direction,
        });

        setSelectedVote(vote.direction);

        toast.success(
          direction === "BULL"
            ? "Prediction to Bullish."
            : "Prediction to Bearish.",
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to submit prediction.",
        );
      }
    });
  };

  // ------------------------------------------------------------
  // Range
  // ------------------------------------------------------------

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

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------

  return (
    <div className="mx-auto mt-20 max-w-4xl">
      {/* Title */}
      <div className="relative w-full space-y-2 px-2.5">
        <div className="mt-2 flex items-center justify-between gap-4">
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
          <div className="relative flex items-baseline-last justify-between mt-4 w-full">
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
            <div
              className="
    fixed bottom-0 left-0 z-50
    flex w-full flex-row-reverse items-end justify-start gap-2
    bg-white px-3 py-2 dark:bg-zinc-900 border-t border-zinc-100

    md:static md:z-auto
    md:mr-3 md:w-auto md:flex-col md:items-stretch md:gap-0
    md:bg-transparent md:p-0 md:border-none
  "
            >
              <div className="flex items-center gap-2">
                <VoteButton
                  voteDirection="BULL"
                  onClick={() => handleVote("BULL")}
                  selectedVote={selectedVote}
                  isPending={isPending || voteLoading}
                  isMarketOpen={isMarketOpen}
                />

                <VoteButton
                  voteDirection="BEAR"
                  onClick={() => handleVote("BEAR")}
                  selectedVote={selectedVote}
                  isPending={isPending || voteLoading}
                  isMarketOpen={isMarketOpen}
                />
              </div>

              {votingWindow && (
                <div className="ml-auto md:mt-1">
                  <VotingCountdown
                    targetMs={votingWindow.targetMs}
                    type={votingWindow.countdownType}
                    showCountdown={votingWindow.showCountdown}
                    isMarketOpen={votingWindow.isMarketOpen}
                    onExpire={handleCountdownExpire}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Chart */}
          <div ref={chartRef} className="mt-2 scroll-mt-70 md:mx-3">
            <DetailChart
              history={data.history}
              isPositive={data.isPositive}
              isClosed={data.isClosed}
              previousClose={data.previousClose}
              lunchStartMs={activeRange === "1D" ? data.lunchStartMs : null}
              lunchEndMs={activeRange === "1D" ? data.lunchEndMs : null}
              exchangeTimezone={
                data.exchangeTimezone ?? symbolMeta?.timezone ?? "UTC"
              }
              range={activeRange}
            />
          </div>
        </>
      ) : (
        <>
          {/* Header skeleton */}
          <div className="relative mt-4 w-full space-y-2 px-3">
            <div className="mb-2 flex w-full flex-col gap-2">
              <Skeleton className="h-9 w-44 rounded-xl" />
              <Skeleton className="h-5 w-36 rounded-full" />
            </div>
          </div>

          {/* Chart skeleton */}
          <div className="mt-1 mx-3">
            <Skeleton className="aspect-800/372 w-full rounded-lg" />
          </div>
        </>
      )}

      {/* Range selector */}
      <div className="my-4 flex flex-wrap gap-2 mx-2">
        {RANGES.map((range) => {
          const isUnavailable =
            unavailableRanges[selectedSymbol]?.has(range as ChartRange) ||
            (range === activeRange && !!error);

          const isActive = activeRange === range;

          return (
            <button
              key={range}
              type="button"
              title={isUnavailable ? "Data unavailable" : undefined}
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

      <div className="mb-24 mt-10 w-full bg-zinc-100 h-20 rounded-lg">
        Discussion
      </div>
    </div>
  );
}
