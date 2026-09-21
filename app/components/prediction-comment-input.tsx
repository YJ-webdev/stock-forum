"use client";

import { Flag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { VotingCountdown } from "./voting-countdown";
import { toast } from "sonner";

type VoteDirection = "BULL" | "BEAR";

interface PredictionCommentInputProps {
  direction: VoteDirection | null;
  setDirection: React.Dispatch<React.SetStateAction<VoteDirection | null>>;

  betAmount: number;
  setBetAmount: React.Dispatch<React.SetStateAction<number>>;

  userPoints: number;
  maxBet: number;

  voteLoading: boolean;
  isMarketOpen: boolean;
  buttonDisabled: boolean;

  submitVote: () => void;

  // countdown
  targetMs: number | null;
  countdownType: "VOTING_OPENS" | "VOTING_CLOSES" | null;
  showCountdown: boolean;
}

export function PredictionCommentInput({
  direction,
  setDirection,
  betAmount,
  setBetAmount,
  userPoints,
  maxBet,
  voteLoading,
  isMarketOpen,
  buttonDisabled,
  submitVote,
  targetMs,
  countdownType,
  showCountdown,
}: PredictionCommentInputProps) {
  const handleDirectionClick = (direction: VoteDirection) => {
    if (buttonDisabled) return;

    if (userPoints < 50) {
      toast.error("Please add balance to continue voting.");
      return;
    }

    setDirection(direction);
  };

  return (
    <div className="mb-8 flex gap-3">
      <Avatar label="YJ" />

      <div className="min-w-0 flex-1">
        <div className="rounded-lg bg-zinc-100 px-4 dark:bg-zinc-800">
          {/* Prediction */}
          <div className="flex items-center gap-3 pt-2">
            {/* Bull / Bear */}
            <div
              className={`
                relative flex h-8 w-30 items-center
                rounded-full p-0.5
                text-[14px] font-normal
                transition-colors duration-200

                ${
                  direction === "BULL"
                    ? "bg-emerald-600/15"
                    : direction === "BEAR"
                      ? "bg-rose-700/15"
                      : "bg-zinc-200 dark:bg-zinc-700"
                }

                ${buttonDisabled ? "opacity-50" : ""}
              `}
            >
              {/* Sliding selected background */}
              {direction && (
                <span
                  className={`
                    pointer-events-none
                    absolute top-0.5
                    h-7 w-14.5
                    rounded-full
                    transition-transform duration-200 ease-out

                    ${
                      direction === "BULL"
                        ? "translate-x-14.5 bg-emerald-600"
                        : "translate-x-0 bg-rose-700"
                    }
                  `}
                />
              )}

              {/* Bear */}
              <button
                type="button"
                disabled={buttonDisabled}
                onClick={() => handleDirectionClick("BEAR")}
                className={`
    relative z-10 flex h-full flex-1
    cursor-pointer items-center justify-center
    rounded-full
    transition-colors
    disabled:cursor-not-allowed

    ${direction === "BEAR" ? "text-white" : "text-zinc-500"}
  `}
              >
                Bear
              </button>

              {/* Bull */}
              <button
                type="button"
                disabled={buttonDisabled}
                onClick={() => handleDirectionClick("BULL")}
                className={`
    relative z-10 flex h-full flex-1
    cursor-pointer items-center justify-center
    rounded-full
    transition-colors
    disabled:cursor-not-allowed

    ${direction === "BULL" ? "text-white" : "text-zinc-500"}
  `}
              >
                Bull
              </button>
            </div>

            {/* Points */}
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={betAmount}
                onChange={(e) => {
                  setBetAmount(Number(e.target.value));
                }}
                min={50}
                max={maxBet}
                step={50}
                disabled={buttonDisabled}
                className="
                  field-sizing-content
                  min-w-[3.5ch]
                  bg-transparent
                  text-sm
                  text-zinc-500
                  outline-none

                  disabled:cursor-not-allowed
                  disabled:opacity-50

                  [&::-webkit-inner-spin-button]:cursor-pointer
                  [&::-webkit-inner-spin-button]:opacity-100
                "
              />

              <span className="jakarta text-sm font-light text-zinc-500">
                / {userPoints.toLocaleString()}pts
              </span>
            </div>
          </div>

          {/* Comment */}
          <textarea
            rows={1}
            placeholder="Write a text to add comments..."
            className="
              min-h-11 w-full resize-none
              bg-transparent py-3
              text-[15px] outline-none
              placeholder:text-zinc-500
            "
          />

          {/* Bottom actions */}
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="
                  cursor-pointer rounded-md
                  px-2 py-1
                  text-sm font-medium text-zinc-500
                  hover:bg-zinc-200
                  dark:hover:bg-zinc-700
                "
              >
                GIF
              </button>
            </div>

            <div className="flex items-baseline gap-2">
              {showCountdown && countdownType === "VOTING_CLOSES" && (
                <VotingCountdown
                  targetMs={targetMs}
                  type={countdownType}
                  showCountdown={showCountdown}
                  isMarketOpen={isMarketOpen}
                />
              )}

              <Button
                type="button"
                size="sm"
                disabled={buttonDisabled}
                onClick={submitVote}
                className="
      cursor-pointer
      border-none
      bg-transparent
      text-black
      shadow-none
      transition-colors

      hover:bg-transparent
      dark:bg-transparent
      dark:text-zinc-100
      dark:hover:bg-transparent

      disabled:cursor-not-allowed
      disabled:bg-transparent
      disabled:opacity-100
      dark:disabled:bg-transparent
    "
              >
                <Flag
                  size={18}
                  className={
                    direction === "BULL"
                      ? "fill-emerald-600/50 dark:fill-emerald-600"
                      : direction === "BEAR"
                        ? "fill-rose-700/50 dark:fill-rose-700"
                        : ""
                  }
                />

                {voteLoading
                  ? "Loading..."
                  : isMarketOpen
                    ? "Voting closed"
                    : "Vote"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Avatar({ label }: { label: string }) {
  return (
    <div
      className="
        flex size-9 shrink-0
        items-center justify-center
        rounded-full
        bg-zinc-200
        text-sm font-medium text-zinc-700
        dark:bg-zinc-700 dark:text-zinc-200
      "
    >
      {label.slice(0, 2).toUpperCase()}
    </div>
  );
}
