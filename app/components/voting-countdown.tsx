"use client";

import { resolveLanguage } from "@/lib/data/languages";
import { VOTING_COUNTDOWN_LABELS } from "@/lib/data/translations";

import { useCountdown } from "../hooks/useCountdown";

interface VotingCountdownProps {
  targetMs: number | null;
  type: "VOTING_OPENS" | "VOTING_CLOSES" | null;
  showCountdown: boolean;
  isMarketOpen: boolean;
  onExpire?: () => void;
  selectedVote?: "BULL" | "BEAR" | null;
  userLanguage?: string | null;
}

export function VotingCountdown({
  targetMs,
  type,
  showCountdown,
  isMarketOpen,
  onExpire,
  userLanguage,
}: VotingCountdownProps) {
  const shouldShow =
    targetMs !== null &&
    Number.isFinite(targetMs) &&
    type === "VOTING_CLOSES" &&
    showCountdown &&
    !isMarketOpen;

  if (!shouldShow || targetMs === null) return null;

  return (
    <ClosingCountdown
      key={targetMs}
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

  const { hours, minutes, seconds } = useCountdown(targetMs, onExpire);

  const isExpired =
    Number(hours) === 0 && Number(minutes) === 0 && Number(seconds) === 0;

  const countdown = `${hours}:${minutes}:${seconds}`;

  const label = isExpired
    ? labels.closed
    : labels.closes_in.replace("{countdown}", countdown);

  return (
    <div
      className="
        hidden shrink-0 items-center gap-1
        whitespace-nowrap text-[12px]
        text-zinc-800 dark:text-zinc-300 sm:flex
      "
    >
      <span className="tabular-nums">{label}</span>
    </div>
  );
}
