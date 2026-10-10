"use client";

import { useRef, useState } from "react";
import { Flag, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { resolveLanguage } from "@/lib/data/languages";
import { COMMENT_LABELS, VOTE_LABELS } from "@/lib/data/translations";

import { VotingCountdown } from "./voting-countdown";
import { GifPicker, type GifResult } from "./gif-picker";

type VoteDirection = "BULL" | "BEAR";

interface PredictionCommentInputProps {
  variant?: "default" | "popup";

  direction: VoteDirection | null;
  setDirection: React.Dispatch<React.SetStateAction<VoteDirection | null>>;

  betAmount: number;
  setBetAmount: React.Dispatch<React.SetStateAction<number>>;

  userPoints: number;
  maxBet: number;

  currentUser: {
    name?: string | null;
    image?: string | null;
    language?: string | null;
  } | null;

  isMarketOpen: boolean;
  buttonDisabled: boolean;
  isPending: boolean;

  submitVote: (comment: string, gif: GifResult | null) => void;

  targetMs: number | null;
  countdownType: "VOTING_OPENS" | "VOTING_CLOSES" | null;
  showCountdown: boolean;
}

const POINT_BUTTON_CLASS = `
  flex h-9 w-7 shrink-0 touch-manipulation
  items-center justify-center rounded-md
  text-lg text-zinc-500 transition-colors
  hover:bg-zinc-200 active:bg-zinc-200
  focus-visible:outline-none
  focus-visible:ring-2 focus-visible:ring-zinc-400
  disabled:cursor-default disabled:opacity-30
  disabled:hover:bg-transparent
  dark:hover:bg-zinc-700 dark:active:bg-zinc-700
  dark:disabled:hover:bg-transparent
`;

export function PredictionCommentInput({
  direction,
  setDirection,
  betAmount,
  setBetAmount,
  userPoints,
  maxBet,
  currentUser,
  isMarketOpen,
  buttonDisabled,
  isPending,
  submitVote,
  targetMs,
  countdownType,
  showCountdown,
}: PredictionCommentInputProps) {
  const gifButtonRef = useRef<HTMLButtonElement>(null);

  const language = resolveLanguage(currentUser?.language);
  const voteLabels = VOTE_LABELS[language];
  const commentLabels = COMMENT_LABELS[language];

  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [selectedGif, setSelectedGif] = useState<GifResult | null>(null);
  const [comment, setComment] = useState("");
  const [pointsDraft, setPointsDraft] = useState<string | null>(null);

  const pointsDisabled = buttonDisabled || isPending || !currentUser;

  const pointsLimit =
    Math.floor(Math.max(0, Math.min(500, maxBet, userPoints)) / 50) * 50;

  function normalizePoints(value: number) {
    if (!Number.isFinite(value)) return 0;

    return Math.floor(Math.max(0, Math.min(pointsLimit, value)) / 50) * 50;
  }

  function adjustPoints(change: number) {
    const value = pointsDraft === null ? betAmount : Number(pointsDraft);

    setBetAmount(normalizePoints(value + change));
    setPointsDraft(null);
  }

  function handleDirectionClick(nextDirection: VoteDirection) {
    if (buttonDisabled || isPending) return;

    if (!currentUser) {
      toast.error("Log in to make your prediction.");
      return;
    }

    setDirection(nextDirection);
  }

  const showMax = betAmount === 500 && Number(pointsDraft ?? betAmount) === 500;

  return (
    <div className="mb-8 flex gap-3">
      <Avatar className="size-9 shrink-0">
        <AvatarImage
          src={currentUser?.image ?? undefined}
          alt={currentUser?.name ?? "User"}
          className="object-cover"
        />

        <AvatarFallback className="text-sm">
          {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : "G"}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="rounded-lg bg-zinc-100 px-4 dark:bg-zinc-800">
          {/* Prediction */}
          <div className="flex items-center gap-3 pt-2">
            {/* Bull / Bear */}
            <div
              className={`
                relative flex h-8 w-30 shrink-0 items-center
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
                ${buttonDisabled || isPending ? "opacity-50" : ""}
              `}
            >
              {/* Sliding selected background */}
              {direction && (
                <span
                  className={`
                    pointer-events-none
                    absolute top-0.5
                    h-7 w-14.5 rounded-full
                    transition-transform duration-200 ease-out
                    ${
                      direction === "BULL"
                        ? "translate-x-0 bg-emerald-600"
                        : "translate-x-14.5 bg-rose-700"
                    }
                  `}
                />
              )}

              <button
                type="button"
                aria-pressed={direction === "BULL"}
                disabled={buttonDisabled || isPending}
                onClick={() => handleDirectionClick("BULL")}
                className={`
                  relative z-10 flex h-full flex-1
                  cursor-pointer touch-manipulation
                  items-center justify-center rounded-full
                  transition-colors
                  disabled:cursor-default
                  ${
                    currentUser
                      ? ""
                      : "active:translate-y-0.5 active:scale-[0.98]"
                  }
                  ${direction === "BULL" ? "text-white" : "text-zinc-500"}
                `}
              >
                {voteLabels.bull}
              </button>

              <button
                type="button"
                aria-pressed={direction === "BEAR"}
                disabled={buttonDisabled || isPending}
                onClick={() => handleDirectionClick("BEAR")}
                className={`
                  relative z-10 flex h-full flex-1
                  cursor-pointer touch-manipulation
                  items-center justify-center rounded-full
                  transition-colors
                  disabled:cursor-default
                  ${
                    currentUser
                      ? ""
                      : "active:translate-y-0.5 active:scale-[0.98]"
                  }
                  ${direction === "BEAR" ? "text-white" : "text-zinc-500"}
                `}
              >
                {voteLabels.bear}
              </button>
            </div>

            {/* Points */}
            <div className=" flex shrink-0 items-center -gap-5">
              <button
                type="button"
                aria-label="Decrease points"
                disabled={pointsDisabled || betAmount <= 0}
                onClick={() => adjustPoints(-50)}
                className={POINT_BUTTON_CLASS}
              >
                −
              </button>
              <div className=" relative">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  aria-label="Prediction points"
                  autoComplete="off"
                  value={pointsDraft ?? String(betAmount)}
                  disabled={pointsDisabled}
                  onFocus={() => setPointsDraft(String(betAmount))}
                  onChange={(event) => {
                    const value = event.target.value;

                    if (!/^\d*$/.test(value)) return;

                    // Preserve the typed value, including an empty string.
                    setPointsDraft(value);

                    // Keep the parent's amount within valid 50-point steps.
                    setBetAmount(normalizePoints(Number(value)));
                  }}
                  onBlur={() => setPointsDraft(null)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }
                  }}
                  className="
                  h-9 w-[3ch] bg-transparent
                  text-center text-sm tabular-nums text-zinc-500
                  outline-none
                  focus-visible:rounded-sm
                  focus-visible:ring-2 focus-visible:ring-zinc-400
                  disabled:cursor-default disabled:opacity-50
                "
                />
                {showMax && (
                  <span className="absolute left-1/2 -translate-x-1/2 -bottom-1 text-[10px] font-medium text-zinc-500">
                    max
                  </span>
                )}
              </div>
              <button
                type="button"
                aria-label="Increase points"
                disabled={pointsDisabled || betAmount >= pointsLimit}
                onClick={() => adjustPoints(50)}
                className={POINT_BUTTON_CLASS}
              >
                +
              </button>

              <span className="jakarta whitespace-nowrap text-sm font-normal text-zinc-500">
                /{userPoints.toLocaleString()}pts
              </span>
            </div>
          </div>

          {/* Comment */}
          <textarea
            value={comment}
            onChange={(event) => {
              if (!currentUser) return;

              setComment(event.target.value);
            }}
            readOnly={!currentUser}
            tabIndex={currentUser ? 0 : -1}
            onFocus={(event) => {
              if (!currentUser) {
                event.currentTarget.blur();
              }
            }}
            onClick={() => {
              if (!currentUser) {
                toast.error(commentLabels.login.replace(/\.{3}$/, ""), {
                  id: "login-required",
                });
              }
            }}
            rows={1}
            placeholder={
              currentUser ? commentLabels.write : commentLabels.login
            }
            className={`
              min-h-11 w-full resize-none
              bg-transparent py-3
              text-[15px] outline-none
              placeholder:truncate placeholder:text-zinc-500
              ${!currentUser ? "cursor-default caret-transparent" : ""}
            `}
          />

          {/* Selected GIF */}
          {selectedGif && (
            <div className="relative mb-3 w-fit max-w-full">
              <img
                src={selectedGif.preview || selectedGif.src}
                alt={selectedGif.title}
                className="
                  block max-h-60 max-w-full
                  rounded-lg object-contain
                "
              />

              <button
                type="button"
                aria-label="Remove GIF"
                onClick={() => setSelectedGif(null)}
                className="
                  absolute right-2 top-2
                  flex size-7 cursor-pointer
                  items-center justify-center rounded-full
                  bg-black/60 text-white
                  transition-colors hover:bg-black/75
                "
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* Bottom actions */}
          <div className="@container flex items-center justify-between gap-2 pb-2">
            <div className="flex shrink-0 items-center gap-1">
              <button
                ref={gifButtonRef}
                type="button"
                onClick={() => setGifPickerOpen((open) => !open)}
                className="
                  cursor-pointer rounded-md px-2 py-1
                  text-sm font-medium text-zinc-500
                  hover:bg-zinc-200 dark:hover:bg-zinc-700
                "
              >
                GIF
              </button>

              <GifPicker
                triggerRef={gifButtonRef}
                open={gifPickerOpen}
                onOpenChange={setGifPickerOpen}
                onSelect={(gif) => {
                  setSelectedGif(gif);
                  setGifPickerOpen(false);
                }}
              />
            </div>

            <div className="flex shrink-0 items-baseline gap-2">
              {showCountdown && countdownType === "VOTING_CLOSES" && (
                <div className="hidden @[380px]:block">
                  <VotingCountdown
                    targetMs={targetMs}
                    type={countdownType}
                    showCountdown={showCountdown}
                    isMarketOpen={isMarketOpen}
                  />
                </div>
              )}

              <Button
                type="button"
                size="sm"
                disabled={buttonDisabled || isPending}
                onClick={() => submitVote(comment, selectedGif)}
                className="
                  shrink-0 cursor-pointer border-none
                  bg-transparent text-zinc-800 shadow-none
                  transition-colors
                  hover:bg-transparent
                  dark:bg-transparent dark:text-zinc-300
                  dark:hover:bg-transparent
                  disabled:cursor-not-allowed
                  disabled:bg-transparent disabled:opacity-100
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

                {isPending ? voteLabels.voting : voteLabels.vote}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
