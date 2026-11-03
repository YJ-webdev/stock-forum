"use client";

import { useEffect, useRef, useState } from "react";

import { getVotingWindow } from "@/lib/utils/get-voting-window";

type VotingWindow = ReturnType<typeof getVotingWindow>;

interface LiveVotingWindowOptions {
  enabled?: boolean;
  initialNowMs?: number;
  intervalMs?: number;
  onFocus?: () => void;
}

function sameVotingWindow(a: VotingWindow, b: VotingWindow): boolean {
  return (
    a.isMarketOpen === b.isMarketOpen &&
    a.canVote === b.canVote &&
    a.predictionFor?.getTime() === b.predictionFor?.getTime() &&
    a.currentSessionStartMs === b.currentSessionStartMs &&
    a.targetMs === b.targetMs &&
    a.countdownType === b.countdownType &&
    a.showCountdown === b.showCountdown
  );
}

export function useLiveVotingWindow(
  symbol: string,
  {
    enabled = true,
    initialNowMs,
    intervalMs = 15_000,
    onFocus,
  }: LiveVotingWindowOptions = {},
): VotingWindow {
  const [snapshot, setSnapshot] = useState(() => ({
    symbol,
    window: getVotingWindow(symbol, initialNowMs ?? Date.now()),
  }));

  const onFocusRef = useRef(onFocus);
  onFocusRef.current = onFocus;

  useEffect(() => {
    if (!enabled) return;

    function update() {
      if (document.visibilityState !== "visible") return;

      const next = getVotingWindow(symbol, Date.now());
      setSnapshot((previous) =>
        previous.symbol === symbol && sameVotingWindow(previous.window, next)
          ? previous
          : { symbol, window: next },
      );
    }

    function handleFocus() {
      if (document.visibilityState !== "visible") return;
      update();
      onFocusRef.current?.();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") handleFocus();
    }

    update();
    const timer = window.setInterval(update, intervalMs);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [symbol, enabled, intervalMs]);

  return snapshot.symbol === symbol
    ? snapshot.window
    : getVotingWindow(symbol, initialNowMs ?? Date.now());
}
