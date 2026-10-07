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

const SESSION_REFRESH_MS = 15_000;
const SENTIMENT_REFRESH_MS = 60_000;

const DOT_PATTERN =
  "bg-[radial-gradient(circle,currentColor_0.75px,transparent_0.75px)] " +
  "bg-size-[3px_3px] text-zinc-200 dark:text-zinc-600/50";

const WIDTH_TRANSITION =
  "transition-[width] duration-300 motion-reduce:transition-none";

const PERCENT_TEXT = "outfit font-normal text-zinc-800 dark:text-zinc-100";

function getSentimentSession(symbol: string): MarketSession {
  const window = getVotingWindow(symbol, Date.now());

  return {
    symbol,
    isMarketOpen: window.isMarketOpen,
    predictionMs: window.isMarketOpen
      ? (window.currentSessionStartMs ?? null)
      : (window.predictionFor?.getTime() ?? null),
  };
}

export function MarketSentiment({ symbol }: MarketSentimentProps) {
  const [session, setSession] = useState<MarketSession | null>(null);
  const [result, setResult] = useState<SentimentResult | null>(null);

  // Track the current session and market opening/closing.
  useEffect(() => {
    function updateSession() {
      const next = getSentimentSession(symbol);

      setSession((previous) =>
        previous?.symbol === next.symbol &&
        previous.isMarketOpen === next.isMarketOpen &&
        previous.predictionMs === next.predictionMs
          ? previous
          : next,
      );
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        updateSession();
      }
    }

    updateSession();

    const interval = window.setInterval(updateSession, SESSION_REFRESH_MS);

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [symbol]);

  const currentSession = session?.symbol === symbol ? session : null;
  const isMarketOpen = currentSession?.isMarketOpen ?? null;
  const predictionMs = currentSession?.predictionMs ?? null;

  // Fetch once during market hours; poll while the market is closed.
  useEffect(() => {
    if (isMarketOpen === null || predictionMs === null) return;

    const sessionMs = predictionMs;
    let cancelled = false;
    let fetching = false;

    function matchesCurrentSession() {
      const current = getSentimentSession(symbol);

      return (
        current.predictionMs === sessionMs &&
        current.isMarketOpen === isMarketOpen
      );
    }

    async function loadSentiment() {
      if (cancelled || fetching || !matchesCurrentSession()) return;

      fetching = true;

      try {
        const stats = await getMarketVoteStats({
          symbol,
          sessionDate: new Date(sessionMs),
        });

        if (cancelled || !matchesCurrentSession()) return;

        setResult({
          symbol,
          predictionMs: sessionMs,
          stats,
        });
      } catch {
        // Preserve the previous stats or default display.
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

    const interval = isMarketOpen
      ? null
      : window.setInterval(() => {
          if (document.visibilityState === "visible") {
            void loadSentiment();
          }
        }, SENTIMENT_REFRESH_MS);

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;

      if (interval !== null) {
        window.clearInterval(interval);
      }

      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [symbol, isMarketOpen, predictionMs]);

  const stats =
    predictionMs !== null &&
    result?.symbol === symbol &&
    result.predictionMs === predictionMs
      ? result.stats
      : null;

  const hasVotes = stats !== null && stats.totalVotes > 0;
  const bullPercent = stats?.bullPercent ?? 0;
  const bearPercent = stats?.bearPercent ?? 0;

  return (
    <div className="outfit w-full">
      <div
        role={stats ? "img" : undefined}
        aria-label={
          stats
            ? hasVotes
              ? `Bull ${bullPercent} percent, Bear ${bearPercent} percent, ${stats.totalVotes} votes`
              : "No votes yet"
            : undefined
        }
        aria-hidden={stats ? undefined : true}
        className={`relative flex h-7 w-full items-center overflow-hidden bg-white dark:bg-zinc-900 ${DOT_PATTERN}`}
      >
        <div
          aria-hidden="true"
          className="flex w-full items-center justify-around text-[13px] leading-none tabular-nums"
        >
          {hasVotes ? (
            <>
              {bullPercent > 0 && (
                <span className={PERCENT_TEXT}>{bullPercent}%</span>
              )}

              {bearPercent > 0 && (
                <span className={`${PERCENT_TEXT} dark:font-light`}>
                  {bearPercent}%
                </span>
              )}
            </>
          ) : (
            <span className="font-normal text-zinc-800 dark:font-light dark:text-zinc-100">
              No vote yet
            </span>
          )}
        </div>

        {hasVotes && (
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 flex h-[1.5px]"
          >
            <div
              className={`h-full bg-emerald-600 dark:bg-emerald-400 ${WIDTH_TRANSITION}`}
              style={{ width: `${bullPercent}%` }}
            />

            <div
              className={`h-full bg-[#cf0000] dark:bg-[#ff4545] ${WIDTH_TRANSITION}`}
              style={{ width: `${bearPercent}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
