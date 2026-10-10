"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, LockKeyhole, X } from "lucide-react";
import { PiArrowFatLinesUpFill } from "react-icons/pi";
import { toast } from "sonner";
import type { JSONContent } from "@tiptap/react";

import { getMarketVote, type VoteDirection } from "@/app/actions/market-vote";
import { createComment } from "@/app/actions/post";
import { useCurrentUser } from "@/app/context/user-context";
import { usePointBalance } from "@/app/context/point-balance-context";

import { getVotingWindow } from "@/lib/utils/get-voting-window";
import { resolveLanguage } from "@/lib/data/languages";
import {
  PREDICTION_LABELS,
  STATISTICS_LABELS,
  VOTE_INTERFACE_LABELS,
  VOTE_LABELS,
  VOTE_TOAST_LABELS,
  VOTING_COUNTDOWN_LABELS,
} from "@/lib/data/translations";

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

const VOTE_BUTTON_CLASS = `
  inline-flex h-8.5 min-w-0 flex-1 cursor-pointer
  items-center justify-center gap-1.5
  rounded-full px-3 text-[14px] font-normal text-white transition-colors
  focus-visible:outline-none
  focus-visible:ring-2 focus-visible:ring-zinc-400
  focus-visible:ring-offset-2 focus-visible:ring-offset-white
  disabled:cursor-default disabled:opacity-50
  dark:focus-visible:ring-offset-zinc-900
`;

const VOTE_STATUS_CLASS = `
  inline-flex h-7.5 items-center gap-1.5
  text-xs font-normal text-zinc-500 dark:text-zinc-400
`;

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
  const language = resolveLanguage(user?.language);

  const voteLabels = VOTE_LABELS[language];
  const toastLabels = VOTE_TOAST_LABELS[language];
  const interfaceLabels = VOTE_INTERFACE_LABELS[language];
  const statisticsLabels = STATISTICS_LABELS[language];
  const countdownLabels = VOTING_COUNTDOWN_LABELS[language];
  const predictionLabel = PREDICTION_LABELS[language];

  const { points: userPoints, setPoints } = usePointBalance();

  const popupId = useId();
  const titleId = useId();

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const submittingRef = useRef(false);
  const voteRevisionRef = useRef(0);
  const lastFocusRefreshRef = useRef(0);

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

  // Bind initial data to the user and session present at mount.
  const initialVoteSnapshotRef = useRef<VoteState>({
    lookupKey:
      userId && initialVoteSessionKey
        ? JSON.stringify([userId, symbol, initialVoteSessionKey])
        : null,
    direction: initialVote,
  });

  const [voteState, setVoteState] = useState<VoteState>(
    () => initialVoteSnapshotRef.current,
  );

  const [checkedLookupKey, setCheckedLookupKey] = useState<string | null>(
    () => initialVoteSnapshotRef.current.lookupKey,
  );

  const [voteLookupFailed, setVoteLookupFailed] = useState(false);

  const activeLookupKeyRef = useRef(lookupKey);
  activeLookupKeyRef.current = lookupKey;

  const direction =
    userId && voteState.lookupKey === lookupKey ? voteState.direction : null;

  const isVoteLoading =
    Boolean(userId && sessionKey) && checkedLookupKey !== lookupKey;

  const voteButtonDisabled = isVoteLoading || isSubmitting;
  const isOpen = view === "editor";
  const maxBet = Math.floor(Math.min(500, userPoints) / 50) * 50;

  const votedLabel = direction
    ? statisticsLabels.you_voted.replace(
        "{voteDirection}",
        direction === "BULL" ? voteLabels.bull : voteLabels.bear,
      )
    : "";

  function closePopup() {
    setView("closed");
    triggerRef.current?.focus();
  }

  function retryVoteLookup() {
    setCheckedLookupKey(null);
    setVoteLookupFailed(false);
    setRefreshVersion((current) => current + 1);
  }

  function requireLogin() {
    if (user) return true;

    toast.error(toastLabels.login);
    return false;
  }

  function canStartPrediction(showMessage = true) {
    const currentWindow = getVotingWindow(symbol, Date.now());
    const currentSessionKey = getSessionKey(currentWindow.predictionFor);

    let message: string | null = null;

    if (!currentWindow.canVote || !currentSessionKey) {
      message = currentWindow.isMarketOpen
        ? toastLabels.market_open
        : toastLabels.unavailable;
    } else if (currentSessionKey !== sessionKey || isVoteLoading) {
      message = interfaceLabels.checking;
    } else if (voteLookupFailed) {
      message = interfaceLabels.lookup_failed;

      if (showMessage) {
        retryVoteLookup();
      }
    } else if (direction) {
      message = toastLabels.already_voted;
    }

    if (message && showMessage) {
      toast.error(message);
    }

    return message === null;
  }

  function handleTriggerClick(
    nextDirection: VoteDirection,
    trigger: HTMLButtonElement,
  ) {
    if (voteButtonDisabled || submittingRef.current) return;
    if (!requireLogin() || !canStartPrediction()) return;

    triggerRef.current = trigger;
    setDraftDirection(nextDirection);
    setBetAmount(userPoints >= 50 ? 50 : 0);
    setNow(Date.now());
    setView("editor");
  }

  async function submitVote(comment: string, gif: GifResult | null) {
    if (submittingRef.current) return;
    if (!requireLogin() || !canStartPrediction()) return;

    if (!user?.nationality) {
      toast.error(toastLabels.nationality_required);
      return;
    }

    if (!draftDirection) {
      toast.error(interfaceLabels.choose_direction);
      return;
    }

    const currentWindow = getVotingWindow(symbol, Date.now());
    const sessionDate = currentWindow.predictionFor;

    if (!currentWindow.canVote || !sessionDate) {
      toast.error(
        currentWindow.isMarketOpen
          ? toastLabels.market_open
          : toastLabels.unavailable,
      );
      return;
    }

    const submittedDirection = draftDirection;
    const submittedAmount = betAmount;

    if (
      !Number.isInteger(submittedAmount) ||
      (submittedAmount !== 0 && (submittedAmount < 50 || submittedAmount > 500))
    ) {
      toast.error(toastLabels.invalid_amount);
      return;
    }

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

      if (result.points != null) {
        setPoints(result.points);
      }

      // Prevent an older lookup from overwriting the submitted vote.
      voteRevisionRef.current += 1;

      if (activeLookupKeyRef.current === submittedLookupKey) {
        setVoteState({
          lookupKey: submittedLookupKey,
          direction: submittedDirection,
        });

        setCheckedLookupKey(submittedLookupKey);
        setVoteLookupFailed(false);
      } else {
        retryVoteLookup();
      }

      closePopup();

      const directionLabel =
        submittedDirection === "BULL" ? voteLabels.bull : voteLabels.bear;

      const successMessage =
        submittedAmount > 0
          ? toastLabels.success_with_points
          : toastLabels.success;

      toast.success(
        successMessage
          .replace("{voteDirection}", directionLabel)
          .replace("{points}", submittedAmount.toLocaleString(language)),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : toastLabels.failed);

      retryVoteLookup();
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  // Update market time and refresh when returning to the page.
  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    function handleFocus() {
      if (document.visibilityState !== "visible") return;

      const currentTime = Date.now();
      setNow(currentTime);

      // Focus and visibilitychange can fire for the same return.
      if (currentTime - lastFocusRefreshRef.current < 1000) return;

      lastFocusRefreshRef.current = currentTime;
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
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Skip the initial request when server data matches this session.
  useEffect(() => {
    let cancelled = false;
    const revision = voteRevisionRef.current;

    setVoteLookupFailed(false);

    if (!userId || !sessionKey) {
      setCheckedLookupKey(lookupKey);
      return;
    }

    const initialSnapshot = initialVoteSnapshotRef.current;

    if (refreshVersion === 0 && initialSnapshot.lookupKey === lookupKey) {
      return;
    }

    // Do not reuse initial data after changing user or session.
    if (initialSnapshot.lookupKey !== lookupKey) {
      initialVoteSnapshotRef.current = {
        lookupKey: null,
        direction: null,
      };
    }

    const sessionDate = new Date(sessionKey);

    function isCurrentRequest() {
      return (
        !cancelled &&
        revision === voteRevisionRef.current &&
        activeLookupKeyRef.current === lookupKey
      );
    }

    async function loadVote() {
      try {
        const vote = await getMarketVote({
          symbol,
          sessionDate,
        });

        if (!isCurrentRequest()) return;

        setVoteState({
          lookupKey,
          direction: vote,
        });
        setVoteLookupFailed(false);
      } catch {
        if (!isCurrentRequest()) return;

        setVoteLookupFailed(true);
      } finally {
        if (isCurrentRequest()) {
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
      if (event.key !== "Escape" || event.defaultPrevented) return;

      setView("closed");
      triggerRef.current?.focus();
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const inputDisabled =
    voteButtonDisabled ||
    voteLookupFailed ||
    direction !== null ||
    !votingWindow.canVote;

  const editorMessage = direction
    ? toastLabels.already_voted
    : votingWindow.isMarketOpen
      ? toastLabels.market_open
      : !votingWindow.canVote
        ? toastLabels.unavailable
        : voteLookupFailed
          ? interfaceLabels.lookup_failed
          : isVoteLoading
            ? interfaceLabels.checking
            : null;

  return (
    <div className="flex min-h-7.5 w-full justify-end">
      {votingWindow.isMarketOpen ? (
        <span className={VOTE_STATUS_CLASS}>
          <LockKeyhole
            className="size-3.5"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          {countdownLabels.closed}
        </span>
      ) : direction ? (
        <span className={VOTE_STATUS_CLASS}>
          <Check className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
          {votedLabel}
        </span>
      ) : (
        votingWindow.canVote && (
          <div className="flex w-full items-center justify-between gap-2">
            <button
              type="button"
              disabled={voteButtonDisabled}
              aria-expanded={isOpen}
              aria-controls={isOpen ? popupId : undefined}
              aria-label={`${marketName}: ${voteLabels.bull}`}
              aria-busy={voteButtonDisabled}
              onClick={(event) =>
                handleTriggerClick("BULL", event.currentTarget)
              }
              className={`${VOTE_BUTTON_CLASS} bg-[#09b374] enabled:hover:bg-emerald-700`}
            >
              <PiArrowFatLinesUpFill className="size-3.5" aria-hidden="true" />
              {voteLabels.bull}
            </button>

            <button
              type="button"
              disabled={voteButtonDisabled}
              aria-expanded={isOpen}
              aria-controls={isOpen ? popupId : undefined}
              aria-label={`${marketName}: ${voteLabels.bear}`}
              aria-busy={voteButtonDisabled}
              onClick={(event) =>
                handleTriggerClick("BEAR", event.currentTarget)
              }
              className={`${VOTE_BUTTON_CLASS} bg-[#e83149] enabled:hover:bg-[#b50000] dark:bg-[#ed1838] dark:enabled:hover:bg-[#cb112d]`}
            >
              <PiArrowFatLinesUpFill
                className="size-3.5 -scale-y-100"
                aria-hidden="true"
              />
              {voteLabels.bear}
            </button>
          </div>
        )
      )}

      <p role="status" className="sr-only">
        {votedLabel}
      </p>

      {isOpen &&
        createPortal(
          <div
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                closePopup();
              }
            }}
            className="
              fixed inset-0 z-100 flex items-end justify-center bg-black/30
              lg:items-center lg:p-4
            "
          >
            <div
              ref={editorRef}
              id={popupId}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              tabIndex={-1}
              className="
                max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl
                border border-zinc-200 bg-white p-4
                pb-[max(1rem,env(safe-area-inset-bottom))]
                shadow-xl outline-none
                dark:border-zinc-700 dark:bg-zinc-900
                lg:max-w-lg lg:rounded-2xl
              "
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2
                  id={titleId}
                  className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
                >
                  {predictionLabel.replace("{market}", marketName)}
                </h2>

                <button
                  type="button"
                  aria-label={interfaceLabels.close}
                  onClick={closePopup}
                  className="
                    flex size-7 cursor-pointer items-center justify-center
                    rounded-full text-zinc-400 transition-colors
                    hover:bg-zinc-100 hover:text-zinc-800
                    focus-visible:outline-none focus-visible:ring-2
                    focus-visible:ring-zinc-400
                    dark:hover:bg-zinc-800 dark:hover:text-zinc-200
                  "
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>

              <PredictionCommentInput
                variant="popup"
                direction={draftDirection}
                setDirection={setDraftDirection}
                betAmount={betAmount}
                setBetAmount={setBetAmount}
                userPoints={userPoints}
                maxBet={maxBet}
                currentUser={user ?? null}
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
                  disabled={voteButtonDisabled}
                  onClick={retryVoteLookup}
                  className="
                    mt-2 cursor-pointer text-xs underline underline-offset-4
                    disabled:cursor-default disabled:opacity-50
                  "
                >
                  {interfaceLabels.retry}
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
