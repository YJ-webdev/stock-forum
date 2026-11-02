"use client";

import { resolveLanguage } from "@/lib/data/languages";
import { VOTING_COUNTDOWN_LABELS } from "@/lib/data/translations";

import { useCountdown } from "../hooks/useCountdown";

interface VotingCountdownProps {
  targetMs: number | null;
  showCountdown: boolean;
  isMarketOpen: boolean;
  onExpire?: () => void;
  userLanguage?: string | null;
}

export function VotingCountdown({
  targetMs,
  showCountdown,
  isMarketOpen,
  onExpire,
  userLanguage,
}: VotingCountdownProps) {
  if (
    targetMs === null ||
    !Number.isFinite(targetMs) ||
    !showCountdown ||
    isMarketOpen
  ) {
    return null;
  }

  return (
    <ClosingCountdown
      targetMs={targetMs}
      onExpire={onExpire}
      userLanguage={userLanguage}
    />
  );
}

interface ClosingCountdownProps {
  targetMs: number;
  onExpire?: () => void;
  userLanguage?: string | null;
}

function ClosingCountdown({
  targetMs,
  onExpire,
  userLanguage,
}: ClosingCountdownProps) {
  const language = resolveLanguage(userLanguage);
  const labels = VOTING_COUNTDOWN_LABELS[language];

  const { hours, minutes, seconds, isExpired } = useCountdown(
    targetMs,
    onExpire,
  );

  const countdown = `${hours}:${minutes}:${seconds}`;

  return (
    <div className="shrink-0 whitespace-nowrap text-[12px] text-zinc-800 dark:text-zinc-300">
      <span className="tabular-nums">
        {isExpired
          ? labels.closed
          : labels.closes_in.replace("{countdown}", countdown)}
      </span>
    </div>
  );
}
