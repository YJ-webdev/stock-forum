"use client";

import { useCountdown } from "../hooks/useCountdown";

interface VotingCountdownProps {
  targetMs: number | null;
  type: "VOTING_OPENS" | "VOTING_CLOSES" | null;
  showCountdown: boolean;
  isMarketOpen: boolean;
  onExpire?: () => void;
  selectedVote?: "BULL" | "BEAR" | null;
}

export function VotingCountdown({
  targetMs,
  type,
  showCountdown,
  isMarketOpen,
  onExpire,
  selectedVote,
}: VotingCountdownProps) {
  // VOTING_OPENS → always countdown
  // VOTING_CLOSES → only when showCountdown === true (within 6 hours)
  const shouldShowCountdown =
    !!targetMs &&
    !!type &&
    (type === "VOTING_OPENS" || (type === "VOTING_CLOSES" && showCountdown));

  const { hours, minutes, seconds } = useCountdown(
    shouldShowCountdown ? targetMs : null,
    onExpire,
  );

  if (!shouldShowCountdown) {
    return (
      <div className="mr-2 text-[12px] text-zinc-500 dark:text-zinc-400">
        {isMarketOpen ? "Voting closed" : ""}
      </div>
    );
  }

  return (
    <div className="mr-2 flex items-center gap-1 text-[12px] text-zinc-500 dark:text-zinc-400">
      <span>
        {type === "VOTING_OPENS" ? "Voting opens in" : "Voting closes in"}
      </span>

      <span className="tabular-nums">
        {hours}:{minutes}:{seconds}
      </span>
    </div>
  );
}
