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
  const language = resolveLanguage(userLanguage);
  const labels = VOTING_COUNTDOWN_LABELS[language];

  const { hours, minutes, seconds } = useCountdown(targetMs, onExpire);

  const countdown = `${hours}:${minutes}:${seconds}`;

  const isExpired =
    Number(hours) === 0 && Number(minutes) === 0 && Number(seconds) === 0;

  const shouldShowCountdown =
    targetMs !== null &&
    type !== null &&
    (type === "VOTING_OPENS" || (type === "VOTING_CLOSES" && showCountdown));

  if (!shouldShowCountdown) {
    return (
      <div className="mr-2 text-[12px] text-zinc-500 dark:text-zinc-400">
        {isMarketOpen ? labels.closed : ""}
      </div>
    );
  }

  const countdownLabel = (
    type === "VOTING_OPENS" ? labels.opens_in : labels.closes_in
  ).replace("{countdown}", countdown);

  return (
    <div
      className="
        hidden shrink-0 items-center gap-1
        whitespace-nowrap text-[12px] text-zinc-500
        dark:text-zinc-400 sm:flex
      "
    >
      <span className="tabular-nums">
        {isExpired
          ? type === "VOTING_OPENS"
            ? labels.now_open
            : labels.closed
          : countdownLabel}
      </span>
    </div>
  );
}
