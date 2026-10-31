"use client";

import { TZDate } from "@date-fns/tz";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  type ChartRange,
  type SelectedRange,
  useMarketQuote,
} from "@/app/hooks/useMarketQuote";
import { refreshMarketQuote } from "@/app/hooks/market-quote-store";

import { MarketDetailHeader } from "@/app/components/market-detail-header";

import { getVotingWindow } from "@/lib/utils/get-voting-window";
import {
  ALL_MARKET_SYMBOLS,
  TRADING_HOURS,
  type AssetType,
} from "@/lib/data/market-symbols";

import {
  getMarketVote,
  getMarketVoteStats,
  submitMarketVote,
  updateMarketVote,
  type MarketVoteStats,
  type VoteDirection,
} from "@/app/actions/market-vote";

import {
  createComment,
  type MarketCommentsPage,
  type MarketPageComments,
} from "@/app/actions/post";

import type { GifResult } from "@/app/components/gif-picker";
import { buildCommentContent } from "@/lib/utils/build-comment-content";

import { useCurrentUser } from "@/app/context/user-context";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendSparkline } from "@/app/components/trend-sparkline";
import { MarketComments } from "@/app/components/comment";
import { usePointBalance } from "@/app/context/point-balance-context";
import { countryCodeToFlag } from "@/lib/utils/nationality-flag";

import MarketNews from "@/app/components/market-news";
import { MarketActionsMenu } from "@/app/components/market-action-menu";
import {
  CHART_LABELS,
  OTHER_LABELS,
  STATISTICS_LABELS,
  VOTE_LABELS,
  VOTE_TOAST_LABELS,
} from "@/lib/data/translations";
import { resolveLanguage } from "@/lib/data/languages";
import { IBM_Plex_Mono } from "next/font/google";
import dynamic from "next/dynamic";

const DetailChart = dynamic(
  () =>
    import("@/app/components/detail-chart").then(
      (module) => module.DetailChart,
    ),
  {
    loading: () => (
      <div
        aria-hidden="true"
        className="
          aspect-20/11 w-full animate-pulse rounded-2xl
          bg-zinc-100 motion-reduce:animate-none
          dark:bg-zinc-800
        "
      />
    ),
  },
);
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
});

const RANGES: SelectedRange[] = ["1D", "5D", "1M", "3M", "1Y", "5Y", "MAX"];

interface MarketPageClientProps {
  symbol: string;
  initialVoteStats: MarketVoteStats | null;
  initialVoteStatsSessionKey: string | null;
  initialIsWatchlist: boolean;
  initialCommentsPage: MarketCommentsPage;
  initialCommentsViewerId: string | null;
  initialCommentsSessionStartMs: number | null;
}

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

// Check deadlines every second; publish only changes consumed by this page.
function useLiveVotingWindow(symbol: string, enabled: boolean) {
  const [session, setSession] = useState(() => ({
    symbol,
    window: getVotingWindow(symbol, Date.now()),
  }));

  useEffect(() => {
    if (!enabled) return;

    function updateWindow() {
      if (document.visibilityState !== "visible") return;
      const next = getVotingWindow(symbol, Date.now());
      setSession((previous) => {
        const current = previous.window;
        if (
          previous.symbol === symbol &&
          current.isMarketOpen === next.isMarketOpen &&
          current.canVote === next.canVote &&
          current.predictionFor?.getTime() === next.predictionFor?.getTime() &&
          current.currentSessionStartMs === next.currentSessionStartMs &&
          current.targetMs === next.targetMs &&
          current.countdownType === next.countdownType &&
          current.showCountdown === next.showCountdown
        )
          return previous;
        return { symbol, window: next };
      });
    }

    updateWindow();
    const timer = window.setInterval(updateWindow, 1000);
    document.addEventListener("visibilitychange", updateWindow);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", updateWindow);
    };
  }, [symbol, enabled]);

  return session.symbol === symbol
    ? session.window
    : getVotingWindow(symbol, Date.now());
}

export default function MarketPageClient({
  symbol,
  initialVoteStats,
  initialVoteStatsSessionKey,
  initialIsWatchlist,
  initialCommentsPage,
  initialCommentsViewerId,
  initialCommentsSessionStartMs,
}: MarketPageClientProps) {
  const user = useCurrentUser();
  const userLanguage = resolveLanguage(user?.language);

  const chartLabels = CHART_LABELS[userLanguage];
  const statisticsLabels = STATISTICS_LABELS[userLanguage];
  const voteLabels = VOTE_LABELS[userLanguage];
  const otherLabel = OTHER_LABELS[userLanguage];
  const voteToastLabels = VOTE_TOAST_LABELS[userLanguage];

  const { points: userPoints, setPoints: setUserPoints } = usePointBalance();

  const [betAmount, setBetAmount] = useState(50);
  const [showDetailChart, setShowDetailChart] = useState(false);
  const [statsRefreshVersion, setStatsRefreshVersion] = useState(0);

  const [voteSelection, setVoteSelection] = useState<{
    key: string | null;
    direction: VoteDirection | null;
    pointsBet: number;
    status:
      | NonNullable<Awaited<ReturnType<typeof getMarketVote>>>["status"]
      | null;
  }>({
    key: null,
    direction: null,
    pointsBet: 0,
    status: null,
  });

  const [checkedVoteKey, setCheckedVoteKey] = useState<string | null>(null);
  const [voteLookupFailed, setVoteLookupFailed] = useState(false);
  const [voteRefreshVersion, setVoteRefreshVersion] = useState(0);

  const submittingVoteRef = useRef(false);
  const voteRevisionRef = useRef(0);
  const statsRevisionRef = useRef(0);

  const [voteStats, setVoteStats] = useState<MarketVoteStats | null>(
    initialVoteStats,
  );
  const statsSessionKeyRef = useRef(
    initialVoteStats !== null ? initialVoteStatsSessionKey : null,
  );

  const [activeRange, setActiveRange] = useState<SelectedRange>("1D");

  const [isPending, startTransition] = useTransition();
  const discussionRef = useRef<HTMLDivElement>(null);
  const rangeRequestRef = useRef(0);

  const selectedSymbol = symbol;

  const symbolMeta = useMemo(
    () => ALL_MARKET_SYMBOLS.find((item) => item.symbol === selectedSymbol),
    [selectedSymbol],
  );

  const selectedName = symbolMeta?.name ?? selectedSymbol;
  const selectedDisplaySymbol = symbolMeta?.displaySymbol ?? selectedSymbol;

  const selectedAssetType = symbolMeta?.assetType ?? "index";

  const canPredict = selectedAssetType === "index";

  const chartInterval = activeRange === "1D" ? "1m" : undefined;

  const { data, error } = useMarketQuote(
    selectedSymbol,
    selectedName,
    activeRange as ChartRange,
    selectedDisplaySymbol,
    selectedAssetType as AssetType,
    0,
    chartInterval,
  );

  const { sessionStartMs, sessionEndMs } = useMemo(
    () => getChartSession(selectedSymbol, data?.history, activeRange),
    [selectedSymbol, data?.history, activeRange],
  );

  const exchangeTimezone =
    data?.exchangeTimezone ?? symbolMeta?.timezone ?? "UTC";

  const votingWindow = useLiveVotingWindow(selectedSymbol, canPredict);

  const isMarketOpen = canPredict ? votingWindow.isMarketOpen : false;

  const voteSessionKey = votingWindow.predictionFor
    ? new Date(votingWindow.predictionFor).toISOString()
    : null;

  const voteLookupKey = JSON.stringify([
    user?.id ?? null,
    selectedSymbol,
    voteSessionKey,
  ]);

  const activeVoteKeyRef = useRef(voteLookupKey);
  activeVoteKeyRef.current = voteLookupKey;

  const selectedVote =
    voteSelection.key === voteLookupKey ? voteSelection.direction : null;

  const selectedPointsBet =
    voteSelection.key === voteLookupKey ? voteSelection.pointsBet : 0;

  const selectedVoteStatus =
    voteSelection.key === voteLookupKey ? voteSelection.status : null;

  const isVoteChecking =
    canPredict && Boolean(voteSessionKey) && checkedVoteKey !== voteLookupKey;

  useEffect(() => {
    let cancelled = false;
    const revision = voteRevisionRef.current;

    setVoteLookupFailed(false);

    if (!canPredict || !voteSessionKey) {
      setCheckedVoteKey(voteLookupKey);
      return;
    }

    const isCurrentRequest = () =>
      !cancelled &&
      revision === voteRevisionRef.current &&
      activeVoteKeyRef.current === voteLookupKey;

    const sessionDate = new Date(voteSessionKey);
    async function loadVote() {
      try {
        const vote = await getMarketVote({
          symbol: selectedSymbol,
          sessionDate,
        });

        if (!isCurrentRequest()) return;

        setVoteSelection({
          key: voteLookupKey,
          direction: vote?.direction ?? null,
          pointsBet: vote?.pointsBet ?? 0,
          status: vote?.status ?? null,
        });
        setVoteLookupFailed(false);
      } catch (error) {
        if (!isCurrentRequest()) return;

        setVoteLookupFailed(true);
        console.error("Failed to load prediction:", error);
      } finally {
        if (isCurrentRequest()) {
          setCheckedVoteKey(voteLookupKey);
        }
      }
    }

    void loadVote();

    return () => {
      cancelled = true;
    };
  }, [
    canPredict,
    selectedSymbol,
    voteSessionKey,
    voteLookupKey,
    voteRefreshVersion,
  ]);

  useEffect(() => {
    if (!canPredict || !voteSessionKey) {
      statsSessionKeyRef.current = null;
      setVoteStats(null);
      return;
    }

    if (
      statsRefreshVersion === 0 &&
      initialVoteStats !== null &&
      initialVoteStatsSessionKey === voteSessionKey &&
      statsSessionKeyRef.current === voteSessionKey
    ) {
      return;
    }

    const sessionKey = voteSessionKey;
    const revision = statsRevisionRef.current;
    let cancelled = false;

    if (statsSessionKeyRef.current !== sessionKey) {
      setVoteStats(null);
    }

    async function loadStats() {
      try {
        const stats = await getMarketVoteStats({
          symbol: selectedSymbol,
          sessionDate: new Date(sessionKey),
        });
        if (cancelled || revision !== statsRevisionRef.current) return;
        statsSessionKeyRef.current = sessionKey;
        setVoteStats(stats);
      } catch (error) {
        console.error("Failed to load vote statistics:", error);
      }
    }

    void loadStats();
    return () => {
      cancelled = true;
    };
  }, [
    canPredict,
    selectedSymbol,
    voteSessionKey,
    statsRefreshVersion,
    initialVoteStats,
    initialVoteStatsSessionKey,
  ]);

  useEffect(() => {
    return () => {
      rangeRequestRef.current += 1;
    };
  }, [selectedSymbol]);

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

    if (isPending || submittingVoteRef.current) return;

    if (isVoteChecking || voteLookupFailed) {
      toast.error("Unable to verify your vote yet. Please try again.");
      return;
    }

    if (selectedVote !== null) {
      toast.error("You have already voted for this round.");
      return;
    }

    if (direction !== "BULL" && direction !== "BEAR") {
      toast.error("Choose Bull or Bear.");
      return;
    }

    const currentWindow = getVotingWindow(selectedSymbol, Date.now());
    const sessionDate = currentWindow.predictionFor;

    if (!currentWindow.canVote || !sessionDate) {
      toast.error(
        currentWindow.isMarketOpen
          ? "Voting is closed while the market is open."
          : "Voting is currently unavailable.",
      );
      return;
    }

    const submittedKey = JSON.stringify([
      user?.id ?? null,
      selectedSymbol,
      sessionDate.toISOString(),
    ]);

    if (submittedKey !== activeVoteKeyRef.current) {
      toast.error("The voting session changed. Please try again.");
      return;
    }

    const submittedAmount = user?.id ? amount : 0;

    if (
      !Number.isInteger(submittedAmount) ||
      submittedAmount < 0 ||
      submittedAmount > 500 ||
      submittedAmount % 50 !== 0
    ) {
      toast.error("Use 0–500 points in steps of 50.");
      return;
    }

    if (user?.id && submittedAmount > userPoints) {
      toast.error("You do not have enough points.");
      return;
    }

    const canWriteComment =
      Boolean(user?.id) &&
      user?.status !== "BANNED" &&
      user?.status !== "MUTED";

    const trimmedComment = canWriteComment ? comment.trim() : "";
    const submittedGif = canWriteComment ? gif : null;

    const content =
      trimmedComment || submittedGif
        ? buildCommentContent(trimmedComment, submittedGif)
        : null;

    submittingVoteRef.current = true;

    // Invalidate any lookup that started before this submission.
    voteRevisionRef.current += 1;
    statsRevisionRef.current += 1;

    startTransition(async () => {
      let voteSubmitted = false;

      const isCurrentView = () => activeVoteKeyRef.current === submittedKey;

      try {
        let createdComment: MarketPageComments[number] | null = null;
        let updatedPoints: number | null = null;

        if (user?.id) {
          const result = await createComment({
            content,
            assetSymbols: [selectedSymbol],
            prediction: {
              direction,
              pointsBet: submittedAmount,
              sessionDate,
            },
          });

          voteSubmitted = true;
          createdComment = result.comment ?? null;
          updatedPoints = result.points;
        } else {
          await submitMarketVote({
            symbol: selectedSymbol,
            direction,
            pointsBet: 0,
            sessionDate,
          });

          voteSubmitted = true;
        }

        if (!isCurrentView()) return;

        setVoteSelection({
          key: submittedKey,
          direction,
          pointsBet: submittedAmount,
          status: "PENDING",
        });
        setCheckedVoteKey(submittedKey);
        setVoteLookupFailed(false);

        if (updatedPoints != null) {
          setUserPoints(updatedPoints);
        }

        const predictionLabel =
          direction === "BULL" ? voteLabels.bull : voteLabels.bear;

        toast.success(
          (submittedAmount > 0
            ? voteToastLabels.success_with_points
            : voteToastLabels.success
          )
            .replace("{voteDirection}", predictionLabel)
            .replace("{points}", submittedAmount.toLocaleString(userLanguage)),
        );

        const savedComment = createdComment;

        const refreshResults = await Promise.allSettled([
          Promise.resolve().then(() => {
            if (isCurrentView() && savedComment) {
              return onSuccess?.(savedComment);
            }
          }),

          getMarketVoteStats({
            symbol: selectedSymbol,
            sessionDate,
          }).then((stats) => {
            if (isCurrentView()) {
              statsSessionKeyRef.current = sessionDate.toISOString();
              setVoteStats(stats);
            }
          }),
        ]);

        for (const result of refreshResults) {
          if (result.status === "rejected") {
            console.error("Failed to refresh prediction UI:", result.reason);
          }
        }
      } catch (error) {
        if (!voteSubmitted && isCurrentView()) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to submit prediction.",
          );

          // Restore the server's vote state after an uncertain failure.
          setVoteRefreshVersion((value) => value + 1);
        } else {
          console.error("Failed to update prediction UI:", error);
        }
      } finally {
        submittingVoteRef.current = false;
      }
    });
  };

  const handleUpdateVote = async (
    direction: VoteDirection,
    amount: number,
  ): Promise<Awaited<ReturnType<typeof updateMarketVote>> | null> => {
    if (!canPredict || isPending || submittingVoteRef.current) {
      return null;
    }

    if (isVoteChecking || voteLookupFailed) {
      toast.error("Unable to verify your vote yet. Please try again.");
      return null;
    }

    if (selectedVote === null || selectedVoteStatus !== "PENDING") {
      toast.error("Only pending predictions can be edited.");
      return null;
    }

    if (direction !== "BULL" && direction !== "BEAR") {
      toast.error("Choose Bull or Bear.");
      return null;
    }

    const currentWindow = getVotingWindow(selectedSymbol, Date.now());
    const sessionDate = currentWindow.predictionFor;

    if (!currentWindow.canVote || !sessionDate) {
      toast.error(
        currentWindow.isMarketOpen
          ? "Voting is closed while the market is open."
          : "Voting is currently unavailable.",
      );
      return null;
    }

    const submittedKey = JSON.stringify([
      user?.id ?? null,
      selectedSymbol,
      sessionDate.toISOString(),
    ]);

    if (submittedKey !== activeVoteKeyRef.current) {
      toast.error("The voting session changed. Please try again.");
      return null;
    }

    const submittedAmount = user?.id ? amount : 0;

    if (
      !Number.isInteger(submittedAmount) ||
      submittedAmount < 0 ||
      submittedAmount > 500 ||
      submittedAmount % 50 !== 0
    ) {
      toast.error("Use 0–500 points in steps of 50.");
      return null;
    }

    if (user?.id && submittedAmount > userPoints + selectedPointsBet) {
      toast.error("You do not have enough points.");
      return null;
    }

    submittingVoteRef.current = true;

    // Prevent an older lookup from overwriting this save.
    voteRevisionRef.current += 1;
    statsRevisionRef.current += 1;

    const isCurrentView = () => activeVoteKeyRef.current === submittedKey;

    // The child awaits this promise to determine save success.
    const operation = (async () => {
      let result: Awaited<ReturnType<typeof updateMarketVote>>;

      try {
        result = await updateMarketVote({
          symbol: selectedSymbol,
          direction,
          pointsBet: submittedAmount,
          sessionDate,
        });
      } catch (error) {
        if (isCurrentView()) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to update prediction.",
          );

          setCheckedVoteKey(null);
          setVoteRefreshVersion((value) => value + 1);
        }

        return null;
      }

      if (!isCurrentView()) return null;

      setVoteSelection({
        key: submittedKey,
        direction: result.direction,
        pointsBet: result.pointsBet,
        status: result.status,
      });

      setCheckedVoteKey(submittedKey);
      setVoteLookupFailed(false);

      if (result.points !== null) {
        setUserPoints(result.points);
      }

      toast.success(
        userLanguage === "ko" ? "투표를 저장했어요." : "Prediction saved.",
      );

      // A statistics refresh failure must not turn a successful
      // save into a reported submission failure.
      try {
        const stats = await getMarketVoteStats({
          symbol: selectedSymbol,
          sessionDate,
        });

        if (isCurrentView()) {
          statsSessionKeyRef.current = sessionDate.toISOString();
          setVoteStats(stats);
        }
      } catch (error) {
        console.error("Failed to refresh prediction statistics:", error);
      }

      return isCurrentView() ? result : null;
    })();

    startTransition(async () => {
      await operation;
    });

    try {
      return await operation;
    } finally {
      submittingVoteRef.current = false;
    }
  };

  const handleRangeChange = async (range: SelectedRange) => {
    const requestId = ++rangeRequestRef.current;

    if (range === activeRange) return;

    const chartInterval = range === "1D" ? "1m" : undefined;

    const result = await refreshMarketQuote(
      selectedSymbol,
      selectedName,
      range,
      selectedDisplaySymbol,
      selectedAssetType as AssetType,
      chartInterval,
    );

    if (requestId !== rangeRequestRef.current) return;

    if (result.error || !result.data) {
      toast.error(chartLabels.data_unavailable);
      return;
    }

    setActiveRange(range);
  };

  const handlePredictionEdited = (
    prediction: NonNullable<MarketPageComments[number]["prediction"]>,
  ) => {
    // Reject a callback belonging to a previous viewer or session.
    if (activeVoteKeyRef.current !== voteLookupKey) return;

    if (!user?.id || !canPredict) return;
    if (prediction.symbol !== selectedSymbol) return;

    const sessionMs = new Date(prediction.sessionDate).getTime();

    if (
      !voteSessionKey ||
      !Number.isFinite(sessionMs) ||
      sessionMs !== new Date(voteSessionKey).getTime()
    ) {
      return;
    }

    // Prevent an older vote lookup from overwriting the saved result.
    voteRevisionRef.current += 1;
    statsRevisionRef.current += 1;

    setVoteSelection({
      key: voteLookupKey,
      direction: prediction.direction,
      pointsBet: prediction.pointsBet,
      status: prediction.status,
    });

    setCheckedVoteKey(voteLookupKey);
    setVoteLookupFailed(false);

    // Fetch updated Bull/Bear percentages using the existing effect.
    setStatsRefreshVersion((value) => value + 1);
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl">
      {/* News */}

      <div className="w-full min-w-0 px-4">
        <MarketNews symbol={selectedSymbol} />
      </div>

      {/* Title */}

      <div className="relative mt-5 w-full space-y-2 px-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="outfit mt-8 text-[44px] font-bold leading-none tracking-tight text-gray-500/50 dark:text-zinc-500/60">
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

      {error && !data ? (
        <div className="mt-4 md:mx-4">
          <div className="flex aspect-20/11 w-full items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs text-zinc-400">{error}</span>
          </div>
        </div>
      ) : data ? (
        <>
          {/* Header */}

          <div className="relative mt-3 flex min-h-28 w-full items-start justify-between">
            <MarketDetailHeader
              value={data.value}
              rawPrice={data.rawPrice}
              change={data.change}
              percent={data.percent}
              isPositive={data.isPositive}
              updatedAt={data.updatedAt}
              selectedRange={activeRange}
              exchangeTimezone={exchangeTimezone}
              currentUser={user}
            />

            {!showDetailChart && (
              <button
                type="button"
                aria-label={selectedName}
                aria-expanded={showDetailChart}
                onClick={() => setShowDetailChart(true)}
                className="
    relative mr-3 flex w-auto cursor-pointer
    flex-col items-stretch gap-0
    rounded-md border-none bg-transparent p-0
    focus-visible:outline-none
    focus-visible:ring-2 focus-visible:ring-ring
  "
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
              </button>
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
                  <div className="md:mx-4">
                    <DetailChart
                      userLanguage={userLanguage}
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

                    <div className="mt-4 mx-4 md:mx-0 flex flex-wrap gap-1 sm:gap-2 items-center justify-start sm:justify-start">
                      {RANGES.map((range) => {
                        const isActive = activeRange === range;

                        return (
                          <button
                            key={range}
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => void handleRangeChange(range)}
                            className={`
        cursor-pointer rounded-full
        px-3.25 py-1.25 text-xs font-medium
        transition-colors
        focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-ring
        ${
          isActive
            ? "bg-zinc-100/50 text-zinc-600 dark:bg-zinc-600/50 dark:text-zinc-400"
            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-600/50"
        }
      `}
                          >
                            {chartLabels.ranges[range] ?? range}
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
        <div aria-hidden="true" className="relative mt-3 min-h-28 w-full px-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Skeleton className="h-[42.5px] w-40 rounded-md sm:h-9" />
            <Skeleton className="h-10 w-44 rounded-md sm:h-7" />
          </div>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-1.5">
            <Skeleton className="h-4 w-48 rounded-sm" />
            <Skeleton className="h-3.75 w-24 rounded-sm" />
          </div>
        </div>
      )}

      {/* Market sentiment */}

      {canPredict && (
        <div
          className={`${ibmPlexMono.className} mx-4 sm:pb-6 ${
            showDetailChart ? "pt-12 sm:pt-16" : "pt-8 sm:pt-2"
          }`}
        >
          {voteStats ? (
            <div className="flex flex-col gap-5 rounded-xl border bg-zinc-50 px-5 py-4 dark:bg-zinc-800/50 sm:flex-row sm:items-start sm:justify-between">
              {/* Voter nationalities */}

              <div className="min-w-0">
                <p className="text-[14px] font-medium">
                  {statisticsLabels.voters}
                </p>
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
                            ? otherLabel
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
                    {statisticsLabels.no_vote_yet}
                  </p>
                )}
              </div>

              {/* Bull / Bear sentiment */}

              <div className="w-full border-t border-zinc-200 pt-4 dark:border-zinc-700 sm:w-1/2 sm:shrink-0 sm:border-t-0 sm:pt-0">
                <div className="flex items-center justify-between text-[14px] font-medium">
                  <span>
                    {voteStats.totalVotes > 0
                      ? voteStats.bullPercent >= voteStats.bearPercent
                        ? voteLabels.bull
                        : voteLabels.bear
                      : statisticsLabels.no_vote_yet}
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
                      className="h-full bg-[radial-gradient(circle,currentColor_0.75px,transparent_0.75px)] bg-size-[2.5px_2.5px] text-zinc-100 dark:text-zinc-600"
                      style={{
                        width: `${voteStats.bearPercent}%`,
                      }}
                    />
                  </div>
                </div>

                <p className="mt-2 text-end text-[14px] font-medium">
                  {voteStats.totalVotes}{" "}
                  {userLanguage === "en" && voteStats.totalVotes === 1
                    ? "vote"
                    : statisticsLabels.votes}
                </p>
              </div>
            </div>
          ) : (
            <Skeleton className="h-30 w-full rounded-xl" />
          )}
        </div>
      )}

      {/* Discussion */}

      <div
        ref={discussionRef}
        className={`mx-4 ${showDetailChart ? "mt-10" : "mt-8"}`}
      >
        {canPredict && voteLookupFailed && (
          <button
            type="button"
            onClick={() => setVoteRefreshVersion((value) => value + 1)}
            className="mb-3 cursor-pointer text-sm underline underline-offset-4"
          >
            Retry checking vote
          </button>
        )}

        <MarketComments
          initialCommentsPage={initialCommentsPage}
          initialCommentsViewerId={initialCommentsViewerId}
          initialCommentsSessionStartMs={initialCommentsSessionStartMs}
          key={selectedSymbol}
          assetSymbol={selectedSymbol}
          onPredictionEdited={handlePredictionEdited}
          prediction={
            canPredict
              ? {
                  selectedVote,
                  selectedPointsBet,
                  selectedVoteStatus,
                  canVote: votingWindow.canVote,
                  voteLookupKey,
                  isMarketOpen,
                  userPoints: user?.id ? userPoints : 0,
                  betAmount: user?.id ? betAmount : 0,
                  setBetAmount,
                  handleVote,
                  handleUpdateVote,
                  isPending: isPending || isVoteChecking || voteLookupFailed,
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
