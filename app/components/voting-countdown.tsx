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
  const { hours, minutes, seconds } = useCountdown(
    showCountdown ? targetMs : null,
    onExpire,
  );
  // More than 6 hours remaining

  if (!showCountdown || !targetMs || !type) {
    return (
      <div className="mr-2 text-[12px] text-zinc-500 dark:text-zinc-400">
        {isMarketOpen ? (
          "Voting closed"
        ) : selectedVote ? (
          <>
            {/* You just voted{" "}
            <span
              className={
                selectedVote === "BULL" ? "text-emerald-600" : "text-rose-700"
              }
            >
              {selectedVote === "BULL" ? "Bullish" : "Bearish"}
            </span> */}
          </>
        ) : (
          ""
        )}
      </div>
    );
  }

  // 6 hours or less remaining
  return (
    <div className="mr-2 flex items-center gap-1 text-[12px] text-zinc-500 dark:text-zinc-400">
      <span>
        {type === "VOTING_OPENS" && "Voting opens in"}
        {type === "VOTING_CLOSES" && !selectedVote && "Voting closes in"}
        {type === "VOTING_CLOSES" && selectedVote && (
          <>
            {/* You just voted{" "}
            <span
              className={
                selectedVote === "BULL" ? "text-emerald-600" : "text-rose-700"
              }
            >
              {selectedVote === "BULL" ? "Bullish" : "Bearish"}
            </span> */}
            Voting closing in
          </>
        )}
      </span>
      <span className="tabular-nums">
        {hours}:{minutes}:{seconds}
      </span>
    </div>
  );
}
