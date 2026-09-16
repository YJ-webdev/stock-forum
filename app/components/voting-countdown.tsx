"use client";

import { useCountdown } from "../hooks/useCountdown";

interface VotingCountdownProps {
  targetMs: number | null;
  type: "VOTING_OPENS" | "VOTING_CLOSES" | null;
  showCountdown: boolean;
  isMarketOpen: boolean;
  onExpire?: () => void;
}

export function VotingCountdown({
  targetMs,
  type,
  showCountdown,
  isMarketOpen,
  onExpire,
}: VotingCountdownProps) {
  const { hours, minutes, seconds } = useCountdown(
    showCountdown ? targetMs : null,
    onExpire,
  );
  // More than 6 hours remaining
  if (!showCountdown || !targetMs || !type) {
    return (
      <div className="mr-2 text-[12px] text-zinc-500 dark:text-zinc-400">
        {isMarketOpen ? "Voting closed" : "Voting currently open"}
      </div>
    );
  }

  // 6 hours or less remaining
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
