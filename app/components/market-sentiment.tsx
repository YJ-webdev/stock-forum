"use client";

import { useEffect, useState } from "react";

import {
  getMarketVoteStats,
  type MarketVoteStats,
} from "@/app/actions/market-vote";
import { getVotingWindow } from "@/lib/utils/get-voting-window";

interface MarketSentimentProps {
  symbol: string;
}

interface MarketSession {
  symbol: string;
  isMarketOpen: boolean;
  predictionMs: number | null;
}

interface SentimentResult {
  symbol: string;
  predictionMs: number;
  stats: MarketVoteStats;
}

export function MarketSentiment({ symbol }: MarketSentimentProps) {
  const [session, setSession] = useState<MarketSession | null>(null);
  const [result, setResult] = useState<SentimentResult | null>(null);
  const [hasError, setHasError] = useState(false);

  // Track market opening, closing, and the target voting session.
  useEffect(() => {
    function updateSession() {
      const votingWindow = getVotingWindow(symbol, Date.now());

      const nextSession: MarketSession = {
        symbol,
        isMarketOpen: votingWindow.isMarketOpen,
        predictionMs: votingWindow.predictionFor?.getTime() ?? null,
      };

      setSession((previous) => {
        if (
          previous?.symbol === nextSession.symbol &&
          previous.isMarketOpen === nextSession.isMarketOpen &&
          previous.predictionMs === nextSession.predictionMs
        ) {
          return previous;
        }

        return nextSession;
      });
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        updateSession();
      }
    }

    updateSession();

    const interval = window.setInterval(updateSession, 15_000);

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [symbol]);

  const currentSession = session?.symbol === symbol ? session : null;
  const isMarketOpen = currentSession?.isMarketOpen ?? null;
  const predictionMs = currentSession?.predictionMs ?? null;

  // Refresh sentiment while voting is available.
  useEffect(() => {
    setHasError(false);

    if (isMarketOpen !== false || predictionMs === null) {
      return;
    }

    const sessionMs = predictionMs;

    let cancelled = false;
    let fetching = false;

    async function loadSentiment() {
      if (fetching) return;

      // Avoid fetching the previous session at a market boundary.
      const votingWindow = getVotingWindow(symbol, Date.now());

      if (
        votingWindow.isMarketOpen ||
        votingWindow.predictionFor?.getTime() !== sessionMs
      ) {
        return;
      }

      fetching = true;

      try {
        const stats = await getMarketVoteStats({
          symbol,
          sessionDate: new Date(sessionMs),
        });

        if (cancelled) return;

        setResult({
          symbol,
          predictionMs: sessionMs,
          stats,
        });

        setHasError(false);
      } catch {
        if (!cancelled) {
          setHasError(true);
        }
      } finally {
        fetching = false;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void loadSentiment();
      }
    }

    void loadSentiment();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadSentiment();
      }
    }, 60_000);

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [symbol, isMarketOpen, predictionMs]);

  if (isMarketOpen === null) {
    return <div className="h-9" aria-hidden="true" />;
  }

  if (isMarketOpen) {
    return (
      <div className="outfit flex justify-end items-center gap-2">
        <span className="relative flex size-1.5" aria-hidden="true">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
          <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
        </span>

        <span className="text-xs font-normal text-zinc-800 dark:text-zinc-300">
          Market open
        </span>
      </div>
    );
  }

  if (predictionMs === null) {
    return (
      <div className="outfit flex h-7 items-center text-xs text-zinc-400 dark:text-zinc-500">
        Sentiment unavailable
      </div>
    );
  }

  const stats =
    result?.symbol === symbol && result.predictionMs === predictionMs
      ? result.stats
      : null;

  if (!stats) {
    return (
      <div className="outfit flex w-full items-center" aria-hidden="true">
        <div
          className="
          h-7 w-full overflow-hidden
          bg-zinc-100/50 dark:bg-zinc-800
          bg-[radial-gradient(circle,currentColor_0.75px,transparent_0.75px)]
          bg-size-[3px_3px]
          text-zinc-200 dark:text-zinc-600
        "
        />
      </div>
    );
  }

  const { totalVotes, bullPercent, bearPercent } = stats;
  const hasVotes = totalVotes > 0;

  return (
    <div className="outfit flex w-full items-center">
      <div
        role="img"
        aria-label={
          hasVotes
            ? `Bull ${bullPercent} percent, Bear ${bearPercent} percent, ${totalVotes} votes`
            : "No votes yet"
        }
        className={`relative flex h-7 w-full overflow-hidden bg-zinc-100/50 dark:bg-zinc-800 ${
          !hasVotes
            ? "bg-[radial-gradient(circle,currentColor_0.75px,transparent_0.75px)] bg-size-[3px_3px] text-zinc-200 dark:text-zinc-600"
            : ""
        }`}
      >
        {hasVotes && (
          <>
            <div
              className="h-full bg-neutral-300/50  dark:bg-stone-800/50 transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${bullPercent}%` }}
            />

            <div
              className="
              peer/bear
              h-full
              bg-[radial-gradient(circle,currentColor_0.75px,transparent_0.75px)]
              bg-size-[3px_3px]
              text-zinc-200
              dark:text-zinc-600
            
              transition-[width] duration-300
              motion-reduce:transition-none
            "
              style={{ width: `${bearPercent}%` }}
            />
          </>
        )}

        <div
          aria-hidden="true"
          className="
          pointer-events-none absolute inset-0
          flex items-center justify-around px-1.5
          text-[13px] font-medium leading-none tabular-nums
          text-zinc-900 dark:text-zinc-100"
        >
          {hasVotes ? (
            <>
              {bullPercent > 0 && (
                <span className="ibmPlexMono text-zinc-800 dark:text-zinc-100 font-normal">
                  {bullPercent}%
                </span>
              )}

              {bearPercent > 0 && (
                <span className="ibmPlexMono bear-percent text-zinc-800 dark:text-zinc-100 dark:font-light font-normal">
                  {bearPercent}%
                </span>
              )}
            </>
          ) : (
            <span className="text-zinc-800 dark:text-zinc-100 font-normal dark:font-light">
              No vote yet
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
