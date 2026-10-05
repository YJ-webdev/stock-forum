// app/components/market-vote-button.tsx

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { PiArrowFatLinesUpFill } from "react-icons/pi";
import { toast } from "sonner";
import type { JSONContent } from "@tiptap/react";

import { getMarketVote, type VoteDirection } from "@/app/actions/market-vote";
import { createComment } from "@/app/actions/post";
import { useCurrentUser } from "@/app/context/user-context";
import { usePointBalance } from "@/app/context/point-balance-context";
import { getVotingWindow } from "@/lib/utils/get-voting-window";

import { PredictionCommentInput } from "./prediction-comment-input";
import type { GifResult } from "./gif-picker";

type PopupView = "closed" | "editor";

interface MarketVoteButtonProps {
  marketName: string;
  symbol: string;

  initialVote?: VoteDirection | null;
  initialVoteSessionKey?: string | null;
}

interface VoteState {
  lookupKey: string | null;
  direction: VoteDirection | null;
}

function getSessionKey(
  sessionDate: ReturnType<typeof getVotingWindow>["predictionFor"],
) {
  return sessionDate ? new Date(sessionDate).toISOString() : null;
}

function buildCommentContent(
  comment: string,
  gif: GifResult | null,
): JSONContent {
  const text = comment.trim();

  return {
    type: "doc",
    content: [
      ...(text
        ? text.split(/\r?\n/).map((line) => ({
            type: "paragraph",
            content: line ? [{ type: "text", text: line }] : [],
          }))
        : []),
      ...(gif
        ? [
            {
              type: "image",
              attrs: {
                src: gif.src,
                alt: gif.title,
              },
            },
          ]
        : []),
    ],
  };
}

export function MarketVoteButton({
  marketName,
  symbol,

  initialVote = null,
  initialVoteSessionKey = null,
}: MarketVoteButtonProps) {
  const user = useCurrentUser();
  const userId = user?.id ?? null;
  const { points: userPoints, setPoints } = usePointBalance();

  const popupId = useId();
  const titleId = useId();

  const triggerRef = useRef<HTMLButtonElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const submittingRef = useRef(false);
  const voteRevisionRef = useRef(0);

  const [view, setView] = useState<PopupView>("closed");
  const [draftDirection, setDraftDirection] = useState<VoteDirection | null>(
    null,
  );
  const [betAmount, setBetAmount] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [now, setNow] = useState(() => Date.now());
  const [refreshVersion, setRefreshVersion] = useState(0);

  const votingWindow = getVotingWindow(symbol, now);
  const sessionKey = getSessionKey(votingWindow.predictionFor);
  const lookupKey = JSON.stringify([userId, symbol, sessionKey]);

  const [voteState, setVoteState] = useState<VoteState>(() => ({
    lookupKey: initialVoteSessionKey
      ? JSON.stringify([userId, symbol, initialVoteSessionKey])
      : null,
    direction: initialVote,
  }));

  const [checkedLookupKey, setCheckedLookupKey] = useState<string | null>(null);
  const [voteLookupFailed, setVoteLookupFailed] = useState(false);

  const activeLookupKeyRef = useRef(lookupKey);
  activeLookupKeyRef.current = lookupKey;

  const direction =
    userId && voteState.lookupKey === lookupKey ? voteState.direction : null;

  const isVoteLoading =
    Boolean(userId && sessionKey) && checkedLookupKey !== lookupKey;

  const isOpen = view !== "closed";

  function closePopup() {
    setView("closed");
    triggerRef.current?.focus();
  }

  function requireLogin() {
    if (user) return true;

    toast.error("Log in to vote.", {
      id: "vote-login-required",
    });

    return false;
  }

  function canStartPrediction(showMessage = true) {
    const currentWindow = getVotingWindow(symbol, Date.now());
    const currentSessionKey = getSessionKey(currentWindow.predictionFor);

    let message: string | null = null;

    if (!currentWindow.canVote || !currentSessionKey) {
      message = currentWindow.isMarketOpen
        ? "Voting is closed while the market is open."
        : "Voting is currently unavailable.";
    } else if (currentSessionKey !== sessionKey || isVoteLoading) {
      message = "Checking your prediction. Please try again.";
    } else if (voteLookupFailed) {
      message = "Could not check your prediction. Please try again.";

      if (showMessage) {
        setCheckedLookupKey(null);
        setRefreshVersion((current) => current + 1);
      }
    } else if (direction) {
      message = "You have already voted for this round.";
    }

    if (message && showMessage) {
      toast.error(message, {
        id: `vote-status-${symbol}`,
      });
    }

    return message === null;
  }

  function openEditor(nextDirection: VoteDirection | null) {
    setDraftDirection(nextDirection);
    setBetAmount(50);
    setNow(Date.now());
    setView("editor");
  }

  function handleTriggerClick() {
    if (!requireLogin() || !canStartPrediction()) return;

    openEditor(null);
  }

  async function submitVote(comment: string, gif: GifResult | null) {
    if (submittingRef.current) return;
    if (!requireLogin() || !canStartPrediction()) return;

    if (!user?.nationality) {
      toast.error("Please set your nationality before voting.");
      return;
    }

    if (!draftDirection) {
      toast.error("Please choose Bull or Bear.");
      return;
    }

    const currentWindow = getVotingWindow(symbol, Date.now());
    const sessionDate = currentWindow.predictionFor;

    if (!currentWindow.canVote || !sessionDate) {
      toast.error(
        currentWindow.isMarketOpen
          ? "Voting is closed while the market is open."
          : "Voting is currently unavailable.",
      );
      return;
    }

    if (userPoints < 50) {
      toast.error("Add points to your balance to continue voting.");
      return;
    }

    const maxBet = Math.floor(Math.min(500, userPoints) / 50) * 50;

    if (
      !Number.isInteger(betAmount) ||
      betAmount < 50 ||
      betAmount > maxBet ||
      betAmount % 50 !== 0
    ) {
      toast.error(
        `Choose an amount from 50 to ${maxBet.toLocaleString()} points in steps of 50.`,
      );
      return;
    }

    const submittedDirection = draftDirection;
    const submittedAmount = betAmount;
    const submittedLookupKey = JSON.stringify([
      userId,
      symbol,
      getSessionKey(sessionDate),
    ]);

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const result = await createComment({
        content: buildCommentContent(comment, gif),
        assetSymbols: [symbol],
        prediction: {
          direction: submittedDirection,
          pointsBet: submittedAmount,
          sessionDate,
        },
      });

      if (result.points !== null) {
        setPoints(result.points);
      }

      voteRevisionRef.current += 1;

      setVoteState({
        lookupKey: submittedLookupKey,
        direction: submittedDirection,
      });

      if (activeLookupKeyRef.current === submittedLookupKey) {
        setCheckedLookupKey(submittedLookupKey);
        setVoteLookupFailed(false);
      } else {
        setRefreshVersion((current) => current + 1);
      }

      closePopup();

      toast.success(
        `${
          submittedDirection === "BULL" ? "Bullish" : "Bearish"
        } prediction submitted with ${submittedAmount} pts.`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit prediction.",
      );

      setRefreshVersion((current) => current + 1);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  // Refresh market time and reload the vote when returning to the page.
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    function handleFocus() {
      setNow(Date.now());
      setRefreshVersion((current) => current + 1);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        handleFocus();
      }
    }

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Reload the vote when the user or target session changes.
  useEffect(() => {
    let cancelled = false;
    const revision = voteRevisionRef.current;

    setVoteLookupFailed(false);

    if (!userId || !sessionKey) {
      setCheckedLookupKey(lookupKey);
      return;
    }

    async function loadVote() {
      try {
        const vote = await getMarketVote({
          symbol,
          sessionDate: new Date(sessionKey!),
        });

        if (cancelled || revision !== voteRevisionRef.current) {
          return;
        }

        setVoteState({
          lookupKey,
          direction: vote,
        });
      } catch {
        if (cancelled || revision !== voteRevisionRef.current) {
          return;
        }

        setVoteLookupFailed(true);
      } finally {
        if (!cancelled && revision === voteRevisionRef.current) {
          setCheckedLookupKey(lookupKey);
        }
      }
    }

    void loadVote();

    return () => {
      cancelled = true;
    };
  }, [userId, symbol, sessionKey, lookupKey, refreshVersion]);

  useEffect(() => {
    if (view === "editor") {
      editorRef.current?.focus();
    }
  }, [view]);

  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) {
        return;
      }

      setView("closed");
      triggerRef.current?.focus();
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const inputDisabled =
    isSubmitting ||
    isVoteLoading ||
    voteLookupFailed ||
    direction !== null ||
    !votingWindow.canVote;

  const editorMessage = direction
    ? "You have already voted for this round."
    : votingWindow.isMarketOpen
      ? "Voting is closed while the market is open."
      : !votingWindow.canVote
        ? "Voting is currently unavailable."
        : voteLookupFailed
          ? "Could not check your prediction."
          : isVoteLoading
            ? "Checking your prediction…"
            : null;

  return (
    <div className="flex min-h-7 w-full justify-end">
      {direction && !votingWindow.isMarketOpen ? (
        <span className="flex h-4 items-center text-xs font-normal text-zinc-500 dark:text-zinc-400">
          Vote completed
        </span>
      ) : (
        !votingWindow.isMarketOpen &&
        votingWindow.canVote && (
          <div className="flex w-full items-center justify-between gap-2">
            <button
              ref={triggerRef}
              type="button"
              aria-expanded={isOpen}
              aria-controls={isOpen ? popupId : undefined}
              aria-label={`${marketName}: Bull`}
              aria-busy={isVoteLoading || isSubmitting}
              onClick={handleTriggerClick}
              className="w-full inline-flex h-7 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-zinc-200 px-3 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <PiArrowFatLinesUpFill className="size-3.5" />
              Bull
            </button>

            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={isOpen ? popupId : undefined}
              aria-label={`${marketName}: Bear`}
              aria-busy={isVoteLoading || isSubmitting}
              onClick={handleTriggerClick}
              className="w-full inline-flex h-7 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-zinc-200 px-3 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <PiArrowFatLinesUpFill className="size-3.5 -scale-y-100" />
              Bear
            </button>
          </div>
        )
      )}

      <p role="status" className="sr-only">
        {direction
          ? `${direction === "BULL" ? "Bullish" : "Bearish"} selected`
          : ""}
      </p>

      {view === "editor" &&
        createPortal(
          <div
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                closePopup();
              }
            }}
            className="fixed inset-0 z-100 flex items-end justify-center bg-black/30 lg:items-center lg:p-4"
          >
            <div
              ref={editorRef}
              id={popupId}
              role="dialog"
              aria-labelledby={titleId}
              tabIndex={-1}
              className="max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl border border-zinc-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl outline-none dark:border-zinc-700 dark:bg-zinc-900 lg:max-w-lg lg:rounded-2xl"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2
                  id={titleId}
                  className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
                >
                  {marketName} prediction
                </h2>

                <button
                  type="button"
                  aria-label="Close prediction input"
                  onClick={closePopup}
                  className="flex size-7 cursor-pointer items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                  <X className="size-4" />
                </button>
              </div>

              <PredictionCommentInput
                variant="popup"
                direction={draftDirection}
                setDirection={setDraftDirection}
                betAmount={betAmount}
                setBetAmount={setBetAmount}
                userPoints={userPoints}
                maxBet={Math.floor(Math.min(500, userPoints) / 50) * 50}
                currentUser={user}
                isMarketOpen={votingWindow.isMarketOpen}
                isPending={isSubmitting}
                buttonDisabled={inputDisabled}
                submitVote={(comment, gif) => {
                  void submitVote(comment, gif);
                }}
                targetMs={votingWindow.targetMs}
                countdownType={votingWindow.countdownType}
                showCountdown={votingWindow.showCountdown}
              />

              {editorMessage && (
                <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                  {editorMessage}
                </p>
              )}

              {voteLookupFailed && (
                <button
                  type="button"
                  onClick={() => {
                    setCheckedLookupKey(null);
                    setVoteLookupFailed(false);
                    setRefreshVersion((current) => current + 1);
                  }}
                  className="mt-2 cursor-pointer text-xs underline underline-offset-4"
                >
                  Try again
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
