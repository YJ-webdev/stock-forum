"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
  type Dispatch,
  type PointerEvent,
  type SetStateAction,
} from "react";
import type { JSONContent } from "@tiptap/react";
import { Flag, X } from "lucide-react";
import { toast } from "sonner";

import { createComment, type MarketPageComments } from "@/app/actions/post";
import { useCurrentUser } from "@/app/context/user-context";

import { resolveLanguage } from "@/lib/data/languages";
import {
  COMMENT_LABELS,
  COMMENT_ONLY_LABELS,
  EDIT_VOTE_LABELS,
  PREDICTION_EDIT_UNCHANGED_LABELS,
  SUBMIT_VALIDATION_LABELS,
  VOTE_LABELS,
} from "@/lib/data/translations";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

import { CommentTextarea } from "./comment-textarea";
import { GifButton } from "./gif-button";
import { VotingCountdown } from "./voting-countdown";
import type { GifResult } from "./gif-picker";
import { GifPreview } from "./gif-preview";
import { buildCommentContent } from "@/lib/utils/build-comment-content";

// -----------------------------------------------------------------------------
// Types and constants
// -----------------------------------------------------------------------------

type VoteDirection = "BULL" | "BEAR";

const POINT_STEP = 50;
const MAX_PREDICTION_POINTS = 500;
const HOLD_DELAY_MS = 350;
const HOLD_REPEAT_MS = 90;

const VOTE_DIRECTIONS: readonly VoteDirection[] = ["BULL", "BEAR"];

const VOTE_BUTTON_CLASS = `
  relative z-10 flex h-full flex-1
  cursor-pointer touch-manipulation
  items-center justify-center rounded-full
  transition-colors disabled:cursor-default
`;

const POINT_BUTTON_CLASS = `
  flex h-8 w-7 shrink-0 cursor-pointer touch-none select-none
  items-center justify-center rounded-md
  text-lg text-zinc-500 dark:text-zinc-100
  transition-colors
  hover:bg-zinc-200 active:bg-zinc-200
  focus-visible:outline-none
  focus-visible:ring-2 focus-visible:ring-zinc-400
  disabled:cursor-default disabled:opacity-30
  disabled:hover:bg-transparent
  dark:hover:bg-zinc-700 dark:active:bg-zinc-700
  dark:disabled:hover:bg-transparent
`;

interface PredictionCommentInputProps {
  variant?: "default" | "popup";
  mode?: "create" | "edit" | "edit-comment";

  showAvatar?: boolean;
  voteLocked?: boolean;

  initialComment?: string;
  initialGif?: GifResult | null;
  onCancel?: () => void;

  assetSymbol: string;

  onCommentCreated: (
    comment: MarketPageComments[number],
  ) => void | Promise<void>;

  direction: VoteDirection | null;
  setDirection: Dispatch<SetStateAction<VoteDirection | null>>;

  betAmount: number;
  setBetAmount: Dispatch<SetStateAction<number>>;

  // Include the existing stake when editing.
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

  submitComment?: (input: {
    content: JSONContent;
    assetSymbols: string[];
  }) => ReturnType<typeof createComment>;

  targetMs: number | null;
  countdownType: "VOTING_OPENS" | "VOTING_CLOSES" | null;
  showCountdown: boolean;
}

// -----------------------------------------------------------------------------
// Content helpers
// -----------------------------------------------------------------------------

function clampPoints(value: number, limit: number): number {
  if (!Number.isFinite(value)) return 0;

  return (
    Math.floor(Math.max(0, Math.min(limit, value)) / POINT_STEP) * POINT_STEP
  );
}

// -----------------------------------------------------------------------------
// Direction toggle
// -----------------------------------------------------------------------------

interface DirectionToggleProps {
  direction: VoteDirection | null;
  disabled: boolean;
  bullLabel: string;
  bearLabel: string;
  onSelect: (direction: VoteDirection) => void;
}

function DirectionToggle({
  direction,
  disabled,
  bullLabel,
  bearLabel,
  onSelect,
}: DirectionToggleProps) {
  const backgroundClass =
    direction === "BULL"
      ? "bg-emerald-600/15"
      : direction === "BEAR"
        ? "bg-rose-700/15"
        : "bg-zinc-200 dark:bg-zinc-700";

  return (
    <div
      className={`
        relative flex h-8 w-30 shrink-0 items-center
        rounded-full p-0.5 text-[14px] font-normal
        transition-colors duration-200
        ${backgroundClass}
        ${disabled ? "opacity-50" : ""}
      `}
    >
      {direction && (
        <span
          aria-hidden="true"
          className={`
            pointer-events-none absolute left-0.5 top-0.5
            h-7 w-14.5 rounded-full
            transition-transform duration-200 ease-out
            motion-reduce:transition-none
            ${
              direction === "BULL"
                ? "translate-x-0 bg-emerald-600"
                : "translate-x-14.5 bg-rose-700"
            }
          `}
        />
      )}

      {VOTE_DIRECTIONS.map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={direction === value}
          disabled={disabled}
          onClick={() => onSelect(value)}
          className={`${VOTE_BUTTON_CLASS} ${
            direction === value ? "text-white" : ""
          }`}
        >
          {value === "BULL" ? bullLabel : bearLabel}
        </button>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Point controls
// -----------------------------------------------------------------------------

interface PointStepButtonProps {
  change: number;
  disabled: boolean;
  onStart: (event: PointerEvent<HTMLButtonElement>, change: number) => void;
  onEnd: (event: { pointerId: number }) => void;
  onStep: (change: number) => boolean;
}

function PointStepButton({
  change,
  disabled,
  onStart,
  onEnd,
  onStep,
}: PointStepButtonProps) {
  return (
    <button
      type="button"
      aria-label={change > 0 ? "Increase points" : "Decrease points"}
      disabled={disabled}
      onPointerDown={(event) => onStart(event, change)}
      onPointerUp={onEnd}
      onPointerCancel={onEnd}
      onLostPointerCapture={onEnd}
      onClick={(event) => {
        // Pointer input runs on pointerdown; keyboard/AT clicks run here.
        if (event.detail === 0) onStep(change);
      }}
      onContextMenu={(event) => event.preventDefault()}
      className={POINT_BUTTON_CLASS}
    >
      {change > 0 ? "+" : "−"}
    </button>
  );
}

// -----------------------------------------------------------------------------
// Prediction composer
// -----------------------------------------------------------------------------

export function PredictionCommentInput({
  variant = "default",
  mode = "create",
  showAvatar = mode !== "edit-comment",
  voteLocked = false,
  initialComment = "",
  initialGif = null,
  onCancel,
  assetSymbol,
  onCommentCreated,
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
  submitComment = createComment,
  targetMs,
  countdownType,
  showCountdown,
}: PredictionCommentInputProps) {
  const user = useCurrentUser();

  const [commentOnly, setCommentOnly] = useState(direction === null);
  const [comment, setComment] = useState(initialComment);
  const [selectedGif, setSelectedGif] = useState<GifResult | null>(initialGif);
  const [commentPending, startCommentTransition] = useTransition();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submittingRef = useRef(false);

  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activePointerRef = useRef<number | null>(null);

  // Mount with a new key for a new editing session.
  const initialValuesRef = useRef({
    comment: initialComment.trim(),
    gifSrc: initialGif?.src ?? null,
    direction,
    betAmount,
  });

  const language = resolveLanguage(user?.language ?? currentUser?.language);

  const voteLabels = VOTE_LABELS[language];
  const commentLabels = COMMENT_LABELS[language];
  const commentOnlyLabel = COMMENT_ONLY_LABELS[language];
  const editLabels = EDIT_VOTE_LABELS[language];
  const unchangedLabel = PREDICTION_EDIT_UNCHANGED_LABELS[language];
  const validationLabels = SUBMIT_VALIDATION_LABELS[language];

  const isEditing = mode !== "create";
  const isCombinedEdit = mode === "edit-comment";
  const showCommentEditor = !isEditing || isCombinedEdit;

  const isLoggedIn = Boolean(user);
  const isCommentOnly = !isEditing && isLoggedIn && commentOnly;

  const isChatRestricted =
    user?.status === "BANNED" || user?.status === "MUTED";

  const busy = isPending || commentPending;
  const canWriteComment = showCommentEditor && isLoggedIn && !isChatRestricted;
  const inputReadOnly = !canWriteComment || busy;

  const controlsDisabled = buttonDisabled || busy || isMarketOpen || voteLocked;
  const pointsDisabled = controlsDisabled || !isLoggedIn || isCommentOnly;

  const hasContent = comment.trim().length > 0 || Boolean(selectedGif);

  const initialValues = initialValuesRef.current;

  const commentChanged =
    isCombinedEdit &&
    (comment.trim() !== initialValues.comment ||
      (selectedGif?.src ?? null) !== initialValues.gifSrc);

  const voteChanged =
    !voteLocked &&
    (direction !== initialValues.direction ||
      betAmount !== initialValues.betAmount);

  const saveUnchanged = isEditing && !commentChanged && !voteChanged;

  const availablePoints = Number.isFinite(userPoints)
    ? Math.max(0, userPoints)
    : 0;

  const availableMaxBet = Number.isFinite(maxBet) ? Math.max(0, maxBet) : 0;

  const pointsLimit =
    Math.floor(
      Math.min(MAX_PREDICTION_POINTS, availableMaxBet, availablePoints) /
        POINT_STEP,
    ) * POINT_STEP;

  const validBet =
    !isLoggedIn ||
    (Number.isInteger(betAmount) &&
      betAmount >= 0 &&
      betAmount <= pointsLimit &&
      betAmount % POINT_STEP === 0);

  const showMax = pointsLimit > 0 && betAmount >= pointsLimit;
  const lockedVoteLabel = editLabels.locked;

  const showClosingCountdown =
    !voteLocked && showCountdown && countdownType === "VOTING_CLOSES";

  const displayName = user?.name ?? currentUser?.name;
  const displayImage = user?.image ?? currentUser?.image;

  const avatarInitial =
    Array.from(displayName?.trim() ?? "")[0]?.toUpperCase() || "G";

  const holdStateRef = useRef({
    pointsDisabled,
    pointsLimit,
    availablePoints,
    betAmount,
    setBetAmount,
  });

  // ---------------------------------------------------------------------------
  // Point balance and hold controls
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isLoggedIn || isEditing || voteLocked) return;

    setBetAmount((previous) => clampPoints(previous, pointsLimit));
  }, [isLoggedIn, isEditing, voteLocked, pointsLimit, setBetAmount]);

  useLayoutEffect(() => {
    holdStateRef.current = {
      pointsDisabled,
      pointsLimit,
      availablePoints,
      betAmount,
      setBetAmount,
    };
  }, [pointsDisabled, pointsLimit, availablePoints, betAmount, setBetAmount]);

  const stopPointsHold = useCallback(() => {
    if (holdTimeoutRef.current !== null) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    if (holdIntervalRef.current !== null) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }

    activePointerRef.current = null;
  }, []);

  const stepPoints = useCallback(
    (change: number): boolean => {
      const state = holdStateRef.current;

      if (state.pointsDisabled) {
        stopPointsHold();
        return false;
      }

      const nextAmount = state.betAmount + change;

      if (nextAmount < 0) {
        stopPointsHold();
        return false;
      }

      if (nextAmount > state.pointsLimit) {
        stopPointsHold();

        if (nextAmount > state.availablePoints) {
          toast.error(validationLabels.insufficient_points);
        }

        return false;
      }

      const nextBet = clampPoints(nextAmount, state.pointsLimit);

      state.betAmount = nextBet;
      state.setBetAmount(nextBet);

      return true;
    },
    [stopPointsHold, validationLabels.insufficient_points],
  );

  function startPointsHold(
    event: PointerEvent<HTMLButtonElement>,
    change: number,
  ) {
    if (
      event.button !== 0 ||
      !event.isPrimary ||
      activePointerRef.current !== null ||
      holdStateRef.current.pointsDisabled
    ) {
      return;
    }

    stopPointsHold();

    activePointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);

    if (!stepPoints(change)) return;

    holdTimeoutRef.current = setTimeout(() => {
      holdTimeoutRef.current = null;

      if (!stepPoints(change)) return;

      holdIntervalRef.current = setInterval(() => {
        stepPoints(change);
      }, HOLD_REPEAT_MS);
    }, HOLD_DELAY_MS);
  }

  function handlePointerEnd(event: { pointerId: number }) {
    if (event.pointerId === activePointerRef.current) {
      stopPointsHold();
    }
  }

  useEffect(() => {
    function handlePointerRelease(event: globalThis.PointerEvent) {
      if (event.pointerId === activePointerRef.current) {
        stopPointsHold();
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) stopPointsHold();
    }

    window.addEventListener("pointerup", handlePointerRelease);
    window.addEventListener("pointercancel", handlePointerRelease);
    window.addEventListener("blur", stopPointsHold);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPointsHold();

      window.removeEventListener("pointerup", handlePointerRelease);
      window.removeEventListener("pointercancel", handlePointerRelease);
      window.removeEventListener("blur", stopPointsHold);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [stopPointsHold]);

  useEffect(() => {
    if (pointsDisabled) stopPointsHold();
  }, [pointsDisabled, stopPointsHold]);

  // ---------------------------------------------------------------------------
  // Guest draft cleanup
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (isLoggedIn) return;

    setComment("");
    setSelectedGif(null);
    setCommentOnly(true);
  }, [isLoggedIn]);

  // ---------------------------------------------------------------------------
  // Draft actions
  // ---------------------------------------------------------------------------

  function showLoginMessage() {
    toast.error(commentLabels.login.replace(/\.{3}$/, ""));
  }

  function handleCommentChange(value: string) {
    if (inputReadOnly || submittingRef.current) return;

    setComment(value);
  }

  function handleGifSelect(gif: GifResult) {
    if (inputReadOnly || submittingRef.current) return;

    setSelectedGif(gif);
  }

  function handleGifRemove() {
    if (inputReadOnly || submittingRef.current) return;

    setSelectedGif(null);
  }

  function handleCancel() {
    if (busy || submittingRef.current) return;

    stopPointsHold();
    onCancel?.();
  }

  function handleLockedVoteClick() {
    stopPointsHold();
    toast.info(lockedVoteLabel);
  }

  function handleUnchangedSave() {
    toast.info(unchangedLabel);
  }

  function handleDirectionClick(nextDirection: VoteDirection) {
    if (voteLocked) {
      handleLockedVoteClick();
      return;
    }

    if (controlsDisabled || submittingRef.current) return;

    stopPointsHold();
    setCommentOnly(false);
    setDirection(nextDirection);
  }

  function handleCommentOnlyChange(checked: boolean) {
    if (
      isEditing ||
      busy ||
      voteLocked ||
      submittingRef.current ||
      isChatRestricted
    ) {
      return;
    }

    if (!isLoggedIn) {
      showLoginMessage();
      return;
    }

    stopPointsHold();
    setCommentOnly(checked);
    setDirection(null);
  }

  // ---------------------------------------------------------------------------
  // Comment submission
  // ---------------------------------------------------------------------------

  function handleComment() {
    if (inputReadOnly || submittingRef.current || !hasContent) return;

    const content = buildCommentContent(comment, selectedGif);

    submittingRef.current = true;

    startCommentTransition(async () => {
      try {
        let createdComment: MarketPageComments[number] | undefined;

        try {
          const result = await submitComment({
            content,
            assetSymbols: [assetSymbol],
          });

          createdComment = result.comment ?? undefined;
        } catch (error) {
          console.error("Failed to create comment:", error);

          toast.error(
            error instanceof Error && error.message
              ? error.message
              : commentLabels.failed,
          );

          return;
        }

        setComment("");
        setSelectedGif(null);

        toast.success(commentLabels.success);

        if (createdComment) {
          try {
            await onCommentCreated(createdComment);
          } catch (error) {
            console.error("Failed to update comment list:", error);
          }
        }
      } finally {
        submittingRef.current = false;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Main submission
  // ---------------------------------------------------------------------------

  function handleSubmit() {
    stopPointsHold();

    if (busy || submittingRef.current) return;

    const requiresCommentAccess = isCommentOnly || isCombinedEdit;

    if (requiresCommentAccess && !isLoggedIn) {
      showLoginMessage();
      return;
    }

    if (requiresCommentAccess && isChatRestricted) {
      toast.error(commentLabels.restricted);
      return;
    }

    if (saveUnchanged) {
      handleUnchangedSave();
      return;
    }

    if (isCommentOnly) {
      if (!hasContent) {
        toast.error(validationLabels.content);
        textareaRef.current?.focus({ preventScroll: true });
        return;
      }

      handleComment();
      return;
    }

    // A locked prediction can still allow comment/GIF editing.
    if (isCombinedEdit && voteLocked) {
      if (buttonDisabled) {
        toast.error(validationLabels.unavailable);
        return;
      }

      submitVote(comment, selectedGif);
      return;
    }

    if (controlsDisabled) {
      if (voteLocked) {
        handleLockedVoteClick();
      } else {
        toast.error(validationLabels.unavailable);
      }

      return;
    }

    if (!direction) {
      toast.error(validationLabels.direction);
      return;
    }

    if (!validBet) {
      toast.error(validationLabels.points);
      return;
    }

    if (isEditing) {
      submitVote(
        isCombinedEdit ? comment : "",
        isCombinedEdit ? selectedGif : null,
      );
      return;
    }

    // Guests and restricted users submit no comment or GIF.
    submitVote(
      canWriteComment ? comment : "",
      canWriteComment ? selectedGif : null,
    );
  }

  const submitLabel = isEditing
    ? busy
      ? editLabels.saving
      : editLabels.save
    : isCommentOnly
      ? commentPending
        ? commentLabels.posting
        : commentLabels.comment
      : isPending
        ? voteLabels.voting
        : voteLabels.vote;

  const removeBottomMargin = variant === "popup" || isCombinedEdit;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className={`
        flex min-w-0
        ${showAvatar ? "gap-3" : ""}
        ${removeBottomMargin ? "" : "mb-8"}
      `}
    >
      {showAvatar && (
        <Avatar className="size-9 shrink-0">
          <AvatarImage
            src={displayImage ?? undefined}
            alt={displayName ?? "User"}
            className="object-cover"
          />

          <AvatarFallback className="bg-olive-500 text-lg font-normal text-white">
            {avatarInitial}
          </AvatarFallback>
        </Avatar>
      )}

      <div className="min-w-0 flex-1">
        <div className="rounded-lg bg-zinc-100 px-2.5 dark:bg-zinc-800">
          {/* Prediction controls */}
          <div className="relative">
            <div
              inert={voteLocked}
              className="
                grid grid-cols-[auto_minmax(0,1fr)]
                items-center gap-x-3 gap-y-1 pt-2.5
                sm:flex sm:min-h-10 sm:flex-wrap sm:gap-y-2
              "
            >
              <DirectionToggle
                direction={direction}
                disabled={controlsDisabled}
                bullLabel={voteLabels.bull}
                bearLabel={voteLabels.bear}
                onSelect={handleDirectionClick}
              />

              {isLoggedIn && (
                <div
                  className={`
                    relative flex w-max min-w-0 justify-self-end
                    items-center justify-center gap-0.5
                    sm:flex-none sm:shrink-0 sm:gap-0
                    ${
                      isCommentOnly
                        ? "pointer-events-none invisible sm:hidden"
                        : ""
                    }
                  `}
                >
                  <PointStepButton
                    change={-POINT_STEP}
                    disabled={pointsDisabled || betAmount <= 0}
                    onStart={startPointsHold}
                    onEnd={handlePointerEnd}
                    onStep={stepPoints}
                  />

                  <span
                    aria-label="Prediction points"
                    className={`
                      flex h-8 w-[3ch] select-none
                      items-center justify-center
                      text-center text-sm tabular-nums
                      text-zinc-500 dark:text-zinc-100
                      ${pointsDisabled ? "opacity-50" : ""}
                    `}
                  >
                    {betAmount}
                  </span>

                  {showMax && !voteLocked && (
                    <span
                      className="
                        absolute -bottom-1 left-1/2 -translate-x-1/2
                        text-[10px] font-medium text-zinc-500
                      "
                    >
                      max
                    </span>
                  )}

                  <PointStepButton
                    change={POINT_STEP}
                    disabled={
                      pointsDisabled || betAmount >= MAX_PREDICTION_POINTS
                    }
                    onStart={startPointsHold}
                    onEnd={handlePointerEnd}
                    onStep={stepPoints}
                  />
                </div>
              )}

              {isLoggedIn && !isCommentOnly && (
                <span
                  className="
                    jakarta hidden shrink-0 whitespace-nowrap
                    text-sm font-normal tabular-nums
                    text-zinc-400 sm:block dark:text-zinc-500
                  "
                >
                  {availablePoints.toLocaleString(language)} pts.
                </span>
              )}

              {!isEditing && isLoggedIn && (
                <label
                  className={`
                    col-span-2 flex min-h-9 min-w-0
                    items-center gap-1.5
                    text-xs text-zinc-600 dark:text-zinc-300
                    sm:min-h-8 sm:shrink-0
                    ${
                      busy || isChatRestricted || voteLocked
                        ? "cursor-default opacity-50"
                        : "cursor-pointer"
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={isCommentOnly}
                    disabled={busy || isChatRestricted || voteLocked}
                    onChange={(event) =>
                      handleCommentOnlyChange(event.target.checked)
                    }
                    className="
                      size-3.5 shrink-0 cursor-[inherit]
                      accent-zinc-800 dark:accent-zinc-100
                    "
                  />

                  {commentOnlyLabel}
                </label>
              )}
            </div>

            {voteLocked && (
              <button
                type="button"
                disabled={busy}
                aria-label={`${lockedVoteLabel} ${
                  direction === "BULL"
                    ? voteLabels.bull
                    : direction === "BEAR"
                      ? voteLabels.bear
                      : ""
                }, ${betAmount} pts.`}
                onClick={handleLockedVoteClick}
                className="
                  absolute inset-0 z-20
                  cursor-not-allowed rounded-lg
                  focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-zinc-400
                "
              />
            )}
          </div>

          {/* Comment input */}
          {showCommentEditor && (
            <CommentTextarea
              textareaRef={textareaRef}
              value={comment}
              onValueChange={handleCommentChange}
              placeholder={
                isLoggedIn ? commentLabels.write : commentLabels.login
              }
              isLoggedIn={isLoggedIn}
              isChatRestricted={isChatRestricted}
              busy={busy}
              loginMessage={commentLabels.login}
              restrictedMessage={commentLabels.restricted}
            />
          )}

          {showCommentEditor && isLoggedIn && selectedGif && (
            <GifPreview
              src={selectedGif.src}
              preview={selectedGif.preview}
              title={selectedGif.title}
              disabled={inputReadOnly}
              onRemove={handleGifRemove}
            />
          )}

          <div
            className={`
              @container flex items-center justify-between gap-2 pb-2
              ${isEditing && !showCommentEditor ? "pt-3" : ""}
            `}
          >
            <div className="flex shrink-0 items-center gap-1">
              {showCommentEditor && (
                <GifButton
                  isLoggedIn={isLoggedIn}
                  isChatRestricted={isChatRestricted}
                  busy={busy}
                  loginMessage={commentLabels.login_gif}
                  restrictedMessage={commentLabels.restricted}
                  isSubmitting={() => submittingRef.current}
                  onSelect={handleGifSelect}
                />
              )}
            </div>

            <div className="flex min-w-0 items-center justify-end gap-2">
              {showClosingCountdown && (
                <div className="hidden @[380px]:block">
                  <VotingCountdown
                    targetMs={targetMs}
                    type="VOTING_CLOSES"
                    showCountdown={showCountdown}
                    isMarketOpen={isMarketOpen}
                    userLanguage={language}
                  />
                </div>
              )}

              {isEditing && onCancel && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleCancel}
                  className="
                    shrink-0 cursor-pointer rounded-md px-2 py-1
                    text-sm text-zinc-800 dark:text-zinc-200
                    disabled:cursor-default disabled:opacity-50
                  "
                >
                  {editLabels.cancel}
                </button>
              )}

              <span className="relative inline-flex shrink-0 rounded-md">
                <Button
                  type="button"
                  size="sm"
                  disabled={busy || saveUnchanged}
                  onClick={handleSubmit}
                  className="
                    shrink-0 cursor-pointer border-none
                    bg-transparent text-zinc-800 shadow-none
                    transition-colors hover:bg-transparent
                    dark:bg-transparent dark:text-zinc-100
                    dark:hover:bg-transparent
                    disabled:cursor-not-allowed
                    disabled:bg-transparent disabled:opacity-50
                    dark:disabled:bg-transparent
                  "
                >
                  {!isCommentOnly && (
                    <Flag
                      size={18}
                      aria-hidden="true"
                      className={
                        direction === "BULL"
                          ? "fill-emerald-600/50 dark:fill-emerald-600"
                          : direction === "BEAR"
                            ? "fill-rose-700/50 dark:fill-rose-700"
                            : ""
                      }
                    />
                  )}

                  {submitLabel}
                </Button>

                {saveUnchanged && !busy && (
                  <button
                    type="button"
                    aria-label={`${submitLabel}: ${unchangedLabel}`}
                    onClick={handleUnchangedSave}
                    className="
                      absolute inset-0 cursor-not-allowed rounded-md
                      focus-visible:outline-none
                      focus-visible:ring-2 focus-visible:ring-zinc-400
                    "
                  />
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
