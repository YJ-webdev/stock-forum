"use client";

import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { VotingCountdown } from "./voting-countdown";

interface CommentOnlyInputProps {
  targetMs: number | null;
  countdownType: "VOTING_OPENS" | "VOTING_CLOSES" | null;
  showCountdown: boolean;
  isMarketOpen: boolean;
}

export function CommentOnlyInput({
  targetMs,
  countdownType,
  showCountdown,
  isMarketOpen,
}: CommentOnlyInputProps) {
  return (
    <div className="mb-8 flex gap-3">
      <Avatar label="YJ" />

      <div className="min-w-0 flex-1">
        <div className="rounded-lg bg-zinc-100 px-4 dark:bg-zinc-800">
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
            {/* Left */}
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

            {/* Right */}
            <div className="flex items-center gap-2">
              {/* Voting opens countdown */}
              {showCountdown && countdownType === "VOTING_OPENS" && (
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
                "
              >
                <MessageCircle size={18} />
                Comment
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
