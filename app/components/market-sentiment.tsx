"use client";

import { useEffect, useState } from "react";

import type { MarketVoteListStats } from "@/app/actions/market-vote";
import { useCurrentUser } from "@/app/context/user-context";
import { getBatchedMarketVotes } from "@/app/hooks/batched-market-votes";
import { resolveLanguage } from "@/lib/data/languages";
import { STATISTICS_LABELS } from "@/lib/data/translations";
import { getVotingWindow } from "@/lib/utils/get-voting-window";

interface MarketSentimentProps {
  symbol: string;
  userLanguage?: string | null;
  enabled?: boolean;
}

interface MarketSession {
  symbol: string;
  isMarketOpen: boolean;
  predictionMs: number | null;
}

interface SentimentResult {
  viewerId: string | null;
  symbol: string;
  predictionMs: number;
  stats: MarketVoteListStats;
}

const SESSION_REFRESH_MS = 15_000;
const SENTIMENT_REFRESH_MS = 60_000;

const DOT_PATTERN = `
  bg-[radial-gradient(circle,currentColor_0.75px,transparent_0.75px)]
  bg-size-[3px_3px] text-zinc-200 dark:text-zinc-600/50
`;

const BAR_CLASS = `
  h-full transition-[width] duration-300 motion-reduce:transition-none
`;

function getSentimentSession(symbol: string): MarketSession {
  const votingWindow = getVotingWindow(symbol, Date.now());

  return {
    symbol,
    isMarketOpen: votingWindow.isMarketOpen,
    predictionMs: votingWindow.isMarketOpen
      ? (votingWindow.currentSessionStartMs ?? null)
      : (votingWindow.predictionFor?.getTime() ?? null),
  };
}

function isSameSession(previous: MarketSession | null, next: MarketSession) {
  return (
    previous?.symbol === next.symbol &&
    previous.isMarketOpen === next.isMarketOpen &&
    previous.predictionMs === next.predictionMs
  );
}

export function MarketSentiment({
  symbol,
  userLanguage,
  enabled = true,
}: MarketSentimentProps) {
  const user = useCurrentUser();
  const viewerId = user?.id ?? null;
  const language = resolveLanguage(userLanguage);
  const labels = STATISTICS_LABELS[language];

  const [session, setSession] = useState<MarketSession | null>(null);
  const [result, setResult] = useState<SentimentResult | null>(null);

  const currentSession = session?.symbol === symbol ? session : null;
  const isMarketOpen = currentSession?.isMarketOpen ?? null;
  const predictionMs = currentSession?.predictionMs ?? null;

  // Recalculate the trading session without rerendering when it is unchanged.
  useEffect(() => {
    if (!enabled) return;

    function updateSession() {
      const next = getSentimentSession(symbol);
      setSession((previous) =>
        isSameSession(previous, next) ? previous : next,
      );
    }

    function updateVisibleSession() {
      if (document.visibilityState === "visible") updateSession();
    }

    updateSession();
    const timer = window.setInterval(updateVisibleSession, SESSION_REFRESH_MS);
    document.addEventListener("visibilitychange", updateVisibleSession);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", updateVisibleSession);
    };
  }, [symbol, enabled]);

  // Fetch at session changes and on return; poll while the market is closed.
  useEffect(() => {
    if (!enabled || isMarketOpen === null || predictionMs === null) return;

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
        const stats = await getBatchedMarketVotes({
          symbol,
          sessionDate: new Date(sessionMs),
          viewerId,
        });

        if (cancelled || !matchesCurrentSession()) return;
        setResult({ viewerId, symbol, predictionMs: sessionMs, stats });
      } catch {
        // Keep the last successful result for this viewer and session.
      } finally {
        fetching = false;
      }
    }

    function refreshVisibleSentiment() {
      if (document.visibilityState === "visible") void loadSentiment();
    }

    void loadSentiment();
    const timer = isMarketOpen
      ? null
      : window.setInterval(refreshVisibleSentiment, SENTIMENT_REFRESH_MS);

    document.addEventListener("visibilitychange", refreshVisibleSentiment);

    return () => {
      cancelled = true;
      if (timer !== null) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshVisibleSentiment);
    };
  }, [symbol, isMarketOpen, predictionMs, enabled, viewerId]);

  const stats =
    predictionMs !== null &&
    result?.viewerId === viewerId &&
    result.symbol === symbol &&
    result.predictionMs === predictionMs
      ? result.stats
      : null;

  const hasVotes = stats !== null && stats.totalVotes > 0;
  const bullPercent = stats?.bullPercent ?? 0;
  const bearPercent = stats?.bearPercent ?? 0;

  const ariaLabel = stats
    ? hasVotes
      ? `Bull ${bullPercent}%, Bear ${bearPercent}%, ${labels.votes}: ${stats.totalVotes.toLocaleString(language)}`
      : labels.no_vote_yet
    : undefined;

  return (
    <div className="w-full">
      <div
        role={stats ? "img" : undefined}
        aria-label={ariaLabel}
        aria-hidden={stats ? undefined : true}
        className={`relative flex h-7 w-full items-center overflow-hidden bg-white dark:bg-zinc-900 ${DOT_PATTERN}`}
      >
        <div
          aria-hidden="true"
          className="z-1 flex w-full items-center justify-around text-[13px] leading-none text-white tabular-nums"
        >
          {hasVotes ? (
            <>
              {bullPercent > 0 && (
                <span className="font-normal">{bullPercent}%</span>
              )}
              {bearPercent > 0 && (
                <span className="font-normal dark:font-light">
                  {bearPercent}%
                </span>
              )}
            </>
          ) : (
            <span className="font-normal text-zinc-800 dark:font-light dark:text-zinc-100">
              {stats ? labels.no_vote_yet : "—"}
            </span>
          )}
        </div>

        {hasVotes && (
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 flex h-7 rounded-full"
          >
            <div
              className={`${BAR_CLASS} bg-[#4bbd82]/50`}
              style={{ width: `${bullPercent}%` }}
            />
            <div
              className={`${BAR_CLASS} bg-[#f07197]/50`}
              style={{ width: `${bearPercent}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
