"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { VoteDirection } from "@/app/actions/market-vote";
import { getMarketVote } from "@/app/actions/market-vote";
import { getBatchedMarketVotes } from "@/app/hooks/batched-market-votes";

type VoteStatus = NonNullable<
  Awaited<ReturnType<typeof getMarketVote>>
>["status"];

export interface MarketVoteState {
  lookupKey: string | null;
  direction: VoteDirection | null;
  pointsBet: number;
  status: VoteStatus | null;
}

type LookupMode = "batch" | "single";

interface Options {
  symbol: string;
  viewerId: string | null;
  sessionKey: string | null;
  enabled?: boolean;
  mode: LookupMode;
  refreshVersion?: number;
  initialVote?: VoteDirection | null;
  initialVoteSessionKey?: string | null;
}

/**
 * Owns vote lookup and local vote state.
 *
 * Call invalidateRequests() before a mutation to prevent
 * an older lookup response from overwriting the saved vote.
 *
 * After invalidation, update the local vote state or
 * trigger a fresh lookup.
 */
export function useMarketVoteState({
  symbol,
  viewerId,
  sessionKey,
  enabled = true,
  mode,
  refreshVersion = 0,
  initialVote = null,
  initialVoteSessionKey = null,
}: Options) {
  const lookupKey = JSON.stringify([viewerId, symbol, sessionKey]);

  const activeLookupKeyRef = useRef(lookupKey);
  activeLookupKeyRef.current = lookupKey;

  const voteRevisionRef = useRef(0);

  const invalidateRequests = useCallback(() => {
    voteRevisionRef.current += 1;
  }, []);

  const [voteState, setVoteState] = useState<MarketVoteState>(() => ({
    lookupKey:
      viewerId && initialVoteSessionKey
        ? JSON.stringify([viewerId, symbol, initialVoteSessionKey])
        : null,
    direction: initialVote,
    pointsBet: 0,
    status: null,
  }));

  const [checkedLookupKey, setCheckedLookupKey] = useState<string | null>(null);

  const [voteLookupFailed, setVoteLookupFailed] = useState(false);

  const currentVote = voteState.lookupKey === lookupKey ? voteState : null;

  const isVoteLoading =
    enabled && Boolean(sessionKey) && checkedLookupKey !== lookupKey;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const revision = voteRevisionRef.current;

    setVoteLookupFailed(false);

    if (!sessionKey) {
      setCheckedLookupKey(lookupKey);
      return;
    }

    const sessionDate = new Date(sessionKey);

    const isCurrent = () =>
      !cancelled &&
      revision === voteRevisionRef.current &&
      activeLookupKeyRef.current === lookupKey;

    async function load() {
      try {
        const vote =
          mode === "batch"
            ? (
                await getBatchedMarketVotes({
                  symbol,
                  sessionDate,
                  viewerId,
                })
              ).myPrediction
            : await getMarketVote({
                symbol,
                sessionDate,
              });

        if (!isCurrent()) return;

        setVoteState({
          lookupKey,
          direction: vote?.direction ?? null,
          pointsBet: vote?.pointsBet ?? 0,
          status: vote?.status ?? null,
        });

        setVoteLookupFailed(false);
      } catch (error) {
        if (!isCurrent()) return;

        setVoteLookupFailed(true);

        console.error("Failed to load market vote:", error);
      } finally {
        if (isCurrent()) {
          setCheckedLookupKey(lookupKey);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [enabled, mode, symbol, viewerId, sessionKey, lookupKey, refreshVersion]);

  return {
    lookupKey,
    activeLookupKeyRef,
    invalidateRequests,
    voteState,
    setVoteState,
    currentVote,
    checkedLookupKey,
    setCheckedLookupKey,
    voteLookupFailed,
    setVoteLookupFailed,
    isVoteLoading,
  };
}
