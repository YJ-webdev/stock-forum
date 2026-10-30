"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { Check, LockKeyhole, X } from "lucide-react";
import { PiArrowFatLinesUpFill } from "react-icons/pi";
import { toast } from "sonner";

import {
  getMarketVote,
  submitMarketVote,
  updateMarketVote,
  type VoteDirection,
} from "@/app/actions/market-vote";
import { createComment, getPredictionCommentForEdit } from "@/app/actions/post";

import { useCurrentUser } from "@/app/context/user-context";
import { usePointBalance } from "@/app/context/point-balance-context";
import { getBatchedMarketVotes } from "@/app/hooks/batched-market-votes";
import type { CommentDraft } from "@/app/hooks/use-comment-draft";

import { buildCommentContent } from "@/lib/utils/build-comment-content";
import { getVotingWindow } from "@/lib/utils/get-voting-window";
import { resolveLanguage } from "@/lib/data/languages";
import {
  MARKET_VOTE_EDIT_LABELS,
  PREDICTION_LABELS,
  PREDICTION_COMMENT_EDIT_LABELS,
  STATISTICS_LABELS,
  VOTE_INTERFACE_LABELS,
  VOTE_LABELS,
  VOTE_TOAST_LABELS,
  VOTING_COUNTDOWN_LABELS,
} from "@/lib/data/translations";

import type { GifResult } from "./gif-picker";

function EditorLoading() {
  return (
    <div role="status" className="flex min-h-40 items-center justify-center">
      <span
        aria-hidden="true"
        className="
          size-5 animate-spin rounded-full
          border-2 border-zinc-200 border-t-zinc-600
          dark:border-zinc-700 dark:border-t-zinc-200
        "
      />
    </div>
  );
}

const PredictionCommentInput = dynamic(
  () =>
    import("./prediction-comment-input").then(
      (mod) => mod.PredictionCommentInput,
    ),
  {
    ssr: false,
    loading: EditorLoading,
  },
);

const PredictionCommentEditInput = dynamic(
  () =>
    import("./prediction-comment-edit-input").then(
      (mod) => mod.PredictionCommentEditInput,
    ),
  {
    ssr: false,
    loading: EditorLoading,
  },
);

type VoteStatus = NonNullable<
  Awaited<ReturnType<typeof getMarketVote>>
>["status"];

type EditablePredictionComment = Awaited<
  ReturnType<typeof getPredictionCommentForEdit>
>;

type EditorMode = "create" | "edit";

interface MarketVoteButtonProps {
  marketName: string;
  symbol: string;
  initialVote?: VoteDirection | null;
  initialVoteSessionKey?: string | null;
  enabled?: boolean;
}

interface VoteState {
  lookupKey: string | null;
  direction: VoteDirection | null;
  pointsBet: number;
  status: VoteStatus | null;
}

interface EditorState {
  lookupKey: string;
  mode: EditorMode;
}

const VOTE_BUTTON_CLASS = `
  inline-flex h-8.5 min-w-0 flex-1 cursor-pointer
  items-center justify-center gap-1.5
  rounded-full px-3 text-[14px] font-normal
  text-white dark:text-white transition-colors
  focus-visible:outline-none
  focus-visible:ring-2 focus-visible:ring-zinc-400
  focus-visible:ring-offset-2 focus-visible:ring-offset-white
  disabled:cursor-default disabled:opacity-50
  dark:focus-visible:ring-offset-zinc-900
`;

const VOTE_STATUS_CLASS = `
  inline-flex min-h-7.5 items-center gap-1.5
  text-xs font-normal text-zinc-500 dark:text-zinc-400
`;

function getSessionKey(
  sessionDate: ReturnType<typeof getVotingWindow>["predictionFor"],
) {
  return sessionDate ? new Date(sessionDate).toISOString() : null;
}

export function MarketVoteButton({
  marketName,
  symbol,
  initialVote = null,
  initialVoteSessionKey = null,
  enabled = true,
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
  const editLabel = MARKET_VOTE_EDIT_LABELS[language];
  const commentEditLabels = PREDICTION_COMMENT_EDIT_LABELS[language];

  const { points: userPoints, setPoints } = usePointBalance();

  const popupId = useId();
  const titleId = useId();

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const submittingRef = useRef(false);
  const combinedSavingRef = useRef(false);
  const mountedRef = useRef(false);
  const voteRevisionRef = useRef(0);
  const lastFocusRefreshRef = useRef(0);

  const [draft, setDraft] = useState<CommentDraft>({
    text: "",
    gif: null,
  });

  const draftOwnerRef = useRef(JSON.stringify([userId, symbol]));

  const [editor, setEditor] = useState<EditorState | null>(null);

  const [draftDirection, setDraftDirection] = useState<VoteDirection | null>(
    null,
  );

  const [betAmount, setBetAmount] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [now, setNow] = useState(() => Date.now());
  const [refreshVersion, setRefreshVersion] = useState(0);

  const [editableComment, setEditableComment] = useState<{
    lookupKey: string;
    data: EditablePredictionComment;
  } | null>(null);

  const [editLoadError, setEditLoadError] = useState(false);
  const [editLoadVersion, setEditLoadVersion] = useState(0);

  const votingWindow = getVotingWindow(symbol, now);
  const sessionKey = getSessionKey(votingWindow.predictionFor);

  const lookupKey = JSON.stringify([userId, symbol, sessionKey]);

  const activeLookupKeyRef = useRef(lookupKey);
  activeLookupKeyRef.current = lookupKey;

  const [voteState, setVoteState] = useState<VoteState>(() => ({
    lookupKey:
      userId && initialVoteSessionKey
        ? JSON.stringify([userId, symbol, initialVoteSessionKey])
        : null,
    direction: initialVote,
    pointsBet: 0,
    status: null,
  }));

  const [checkedLookupKey, setCheckedLookupKey] = useState<string | null>(null);

  const [voteLookupFailed, setVoteLookupFailed] = useState(false);

  const currentVote = voteState.lookupKey === lookupKey ? voteState : null;

  const direction = currentVote?.direction ?? null;
  const existingPointsBet = currentVote?.pointsBet ?? 0;

  const isVoteLoading = Boolean(sessionKey) && checkedLookupKey !== lookupKey;

  const voteButtonDisabled = isVoteLoading || isSubmitting;

  const isOpen = editor !== null;
  const editorLookupKey = editor?.lookupKey ?? null;

  const activeEditorKeyRef = useRef(editorLookupKey);
  activeEditorKeyRef.current = editorLookupKey;

  const isEditing = isOpen && editor?.mode === "edit";

  const isCombinedEditing = isEditing && userId !== null;

  const active = enabled || isOpen || isSubmitting;

  const canEdit =
    direction !== null &&
    currentVote?.status === "PENDING" &&
    votingWindow.canVote &&
    !votingWindow.isMarketOpen;

  const availablePoints = userId
    ? Math.max(0, userPoints + (isEditing ? existingPointsBet : 0))
    : 0;

  const maxBet = Math.floor(Math.min(500, availablePoints) / 50) * 50;

  const votedLabel = direction
    ? statisticsLabels.you_voted.replace(
        "{voteDirection}",
        direction === "BULL" ? voteLabels.bull : voteLabels.bear,
      )
    : "";

  function closePopup() {
    if (submittingRef.current || combinedSavingRef.current) {
      return;
    }

    setDraft({ text: "", gif: null });
    setEditor(null);
    setEditableComment(null);

    triggerRef.current?.focus();
  }

  function retryVoteLookup() {
    setCheckedLookupKey(null);
    setVoteLookupFailed(false);
    setRefreshVersion((current) => current + 1);
  }

  function canUsePrediction(mode: EditorMode) {
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
      retryVoteLookup();
    } else if (mode === "create" && direction !== null) {
      message = toastLabels.already_voted;
    } else if (
      mode === "edit" &&
      (direction === null || currentVote?.status !== "PENDING")
    ) {
      message = toastLabels.unavailable;
    }

    if (message) {
      toast.error(message);
      return false;
    }

    return true;
  }

  function openEditor(
    mode: EditorMode,
    trigger: HTMLButtonElement,
    nextDirection?: VoteDirection,
  ) {
    if (
      voteButtonDisabled ||
      submittingRef.current ||
      combinedSavingRef.current
    ) {
      return;
    }

    if (!canUsePrediction(mode)) return;

    triggerRef.current = trigger;

    setEditableComment(null);
    setEditLoadError(false);

    setDraftDirection(mode === "edit" ? direction : (nextDirection ?? null));

    setBetAmount(
      mode === "edit"
        ? userId
          ? existingPointsBet
          : 0
        : userId && userPoints >= 50
          ? 50
          : 0,
    );

    setNow(Date.now());
    setEditor({ lookupKey, mode });
  }

  async function submitVote(comment: string, gif: GifResult | null) {
    if (
      submittingRef.current ||
      combinedSavingRef.current ||
      !editor ||
      editor.lookupKey !== lookupKey
    ) {
      return;
    }

    const mode = editor.mode;

    // Member edits are handled by PredictionCommentEditInput.
    if (mode === "edit" && userId) return;

    if (!canUsePrediction(mode)) return;

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

    const submittedLookupKey = JSON.stringify([
      userId,
      symbol,
      getSessionKey(sessionDate),
    ]);

    if (submittedLookupKey !== editor.lookupKey) {
      toast.error(interfaceLabels.checking);
      return;
    }

    const submittedDirection = draftDirection;
    const submittedAmount = userId ? betAmount : 0;

    if (
      !Number.isInteger(submittedAmount) ||
      submittedAmount < 0 ||
      submittedAmount > maxBet ||
      submittedAmount % 50 !== 0
    ) {
      toast.error(toastLabels.invalid_amount);
      return;
    }

    const canWriteComment =
      Boolean(userId) && user?.status !== "BANNED" && user?.status !== "MUTED";

    submittingRef.current = true;
    setIsSubmitting(true);
    voteRevisionRef.current += 1;

    function isCurrentView() {
      return (
        mountedRef.current && activeLookupKeyRef.current === submittedLookupKey
      );
    }

    try {
      let updatedPoints: number | null = null;
      let savedDirection = submittedDirection;
      let savedPointsBet = submittedAmount;
      let savedStatus: VoteStatus = "PENDING";

      if (mode === "edit") {
        const result = await updateMarketVote({
          symbol,
          direction: submittedDirection,
          pointsBet: 0,
          sessionDate,
        });

        updatedPoints = result.points;
        savedDirection = result.direction;
        savedPointsBet = result.pointsBet;
        savedStatus = result.status;
      } else if (userId) {
        const submittedComment = canWriteComment ? comment.trim() : "";

        const submittedGif = canWriteComment ? gif : null;

        const hasContent = Boolean(submittedComment || submittedGif);

        const result = await createComment({
          content: hasContent
            ? buildCommentContent(submittedComment, submittedGif)
            : null,
          assetSymbols: [symbol],
          prediction: {
            direction: submittedDirection,
            pointsBet: submittedAmount,
            sessionDate,
          },
        });

        updatedPoints = result.points;
      } else {
        const result = await submitMarketVote({
          symbol,
          direction: submittedDirection,
          pointsBet: 0,
          sessionDate,
        });

        savedDirection = result.direction;
        savedPointsBet = result.pointsBet;
        savedStatus = result.status;
      }

      voteRevisionRef.current += 1;

      if (!isCurrentView()) return;

      if (updatedPoints !== null) {
        setPoints(updatedPoints);
      }

      setVoteState({
        lookupKey: submittedLookupKey,
        direction: savedDirection,
        pointsBet: savedPointsBet,
        status: savedStatus,
      });

      setCheckedLookupKey(submittedLookupKey);
      setVoteLookupFailed(false);

      setDraft({ text: "", gif: null });
      setEditor(null);
      setEditableComment(null);

      if (mode === "edit") {
        toast.success(commentEditLabels.saved_combined);
      } else {
        const directionLabel =
          savedDirection === "BULL" ? voteLabels.bull : voteLabels.bear;

        const successMessage =
          savedPointsBet > 0
            ? toastLabels.success_with_points
            : toastLabels.success;

        toast.success(
          successMessage
            .replace("{voteDirection}", directionLabel)
            .replace("{points}", savedPointsBet.toLocaleString(language)),
        );
      }

      window.requestAnimationFrame(() => {
        if (isCurrentView()) {
          triggerRef.current?.focus();
        }
      });
    } catch (error) {
      voteRevisionRef.current += 1;

      if (isCurrentView()) {
        toast.error(
          error instanceof Error ? error.message : toastLabels.failed,
        );

        retryVoteLookup();
      }
    } finally {
      submittingRef.current = false;

      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Preserve the draft when only the voting session changes.
  useEffect(() => {
    const owner = JSON.stringify([userId, symbol]);

    const ownerChanged = draftOwnerRef.current !== owner;

    draftOwnerRef.current = owner;

    if (ownerChanged) {
      setDraft({ text: "", gif: null });
    }

    setEditor((previous) => {
      if (!previous || ownerChanged) {
        return null;
      }

      // Keep an existing comment attached to its original session.
      if (previous.mode === "edit") {
        return previous;
      }

      return {
        lookupKey,
        mode: "create",
      };
    });

    setDraftDirection(null);

    if (ownerChanged) {
      setEditableComment(null);
      setEditLoadError(false);
    }
  }, [lookupKey, userId, symbol]);

  useEffect(() => {
    if (!isCombinedEditing || !userId || !editorLookupKey) {
      return;
    }

    let cancelled = false;

    const requestedKey = editorLookupKey;

    const requestedSessionKey = JSON.parse(requestedKey)[2] as string | null;

    if (!requestedSessionKey) return;

    const sessionDate = new Date(requestedSessionKey);

    setEditableComment(null);
    setEditLoadError(false);

    async function loadComment() {
      try {
        const result = await getPredictionCommentForEdit({
          symbol,
          sessionDate,
        });

        if (cancelled || activeEditorKeyRef.current !== requestedKey) {
          return;
        }

        setEditableComment({
          lookupKey: requestedKey,
          data: result,
        });
      } catch (error) {
        if (cancelled || activeEditorKeyRef.current !== requestedKey) {
          return;
        }

        console.error("Failed to load prediction comment:", error);

        setEditLoadError(true);
      }
    }

    void loadComment();

    return () => {
      cancelled = true;
    };
  }, [isCombinedEditing, userId, symbol, editorLookupKey, editLoadVersion]);

  useEffect(() => {
    if (!active) return;

    function updateVotingState() {
      if (document.visibilityState !== "visible") {
        return;
      }

      const time = Date.now();
      const next = getVotingWindow(symbol, time);

      setNow((previousTime) => {
        const previous = getVotingWindow(symbol, previousTime);

        const unchanged =
          previous.isMarketOpen === next.isMarketOpen &&
          previous.canVote === next.canVote &&
          previous.predictionFor?.getTime() === next.predictionFor?.getTime() &&
          previous.currentSessionStartMs === next.currentSessionStartMs &&
          previous.targetMs === next.targetMs &&
          previous.countdownType === next.countdownType &&
          previous.showCountdown === next.showCountdown;

        return unchanged ? previousTime : time;
      });
    }

    updateVotingState();

    const interval = window.setInterval(updateVotingState, 1000);

    function handleFocus() {
      if (document.visibilityState !== "visible") {
        return;
      }

      const currentTime = Date.now();

      updateVotingState();

      if (submittingRef.current || combinedSavingRef.current) {
        return;
      }

      if (currentTime - lastFocusRefreshRef.current < 1000) {
        return;
      }

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
  }, [active, symbol]);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    const revision = voteRevisionRef.current;

    setVoteLookupFailed(false);

    if (!sessionKey) {
      setCheckedLookupKey(lookupKey);
      return;
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
        const result = await getBatchedMarketVotes({
          symbol,
          sessionDate,
          viewerId: userId,
        });

        const vote = result.myPrediction;

        if (!isCurrentRequest()) return;

        setVoteState({
          lookupKey,
          direction: vote?.direction ?? null,
          pointsBet: vote?.pointsBet ?? 0,
          status: vote?.status ?? null,
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
  }, [symbol, sessionKey, lookupKey, refreshVersion, active, userId]);

  useEffect(() => {
    if (isOpen) {
      editorRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        submittingRef.current ||
        combinedSavingRef.current
      ) {
        return;
      }

      setDraft({ text: "", gif: null });
      setEditor(null);
      setEditableComment(null);

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
    !votingWindow.canVote ||
    (isEditing ? !canEdit : direction !== null);

  const editorMessage = votingWindow.isMarketOpen
    ? toastLabels.market_open
    : !votingWindow.canVote
      ? toastLabels.unavailable
      : voteLookupFailed
        ? interfaceLabels.lookup_failed
        : isVoteLoading
          ? interfaceLabels.checking
          : isEditing
            ? !canEdit
              ? toastLabels.unavailable
              : null
            : direction
              ? toastLabels.already_voted
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
        canEdit ? (
          <button
            ref={triggerRef}
            type="button"
            disabled={voteButtonDisabled}
            aria-label={`${marketName}: ${votedLabel}, ${editLabel}`}
            title={editLabel}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            aria-controls={isOpen ? popupId : undefined}
            onClick={(event) => openEditor("edit", event.currentTarget)}
            className={`
              ${VOTE_STATUS_CLASS}
              cursor-pointer transition-colors
              enabled:hover:text-zinc-900
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-zinc-400
              disabled:cursor-default
              disabled:opacity-50
              dark:enabled:hover:text-zinc-100
            `}
          >
            <Check
              className="size-3.5 shrink-0"
              strokeWidth={1.5}
              aria-hidden="true"
            />

            {votedLabel}
          </button>
        ) : (
          <span className={VOTE_STATUS_CLASS}>
            <Check
              className="size-3.5 shrink-0"
              strokeWidth={1.5}
              aria-hidden="true"
            />

            {votedLabel}
          </span>
        )
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
                openEditor("create", event.currentTarget, "BULL")
              }
              className={`
                ${VOTE_BUTTON_CLASS}
                bg-[#09b374]
                enabled:hover:bg-emerald-700
              `}
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
                openEditor("create", event.currentTarget, "BEAR")
              }
              className={`
                ${VOTE_BUTTON_CLASS}
                bg-[#e83149]
                enabled:hover:bg-[#b50000]
                dark:bg-[#ed1838]
                dark:enabled:hover:bg-[#cb112d]
              `}
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
              fixed inset-0 z-100
              flex items-end justify-center
              bg-black/30 lg:items-center lg:p-4
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
                max-h-[85dvh] w-full overflow-y-auto
                rounded-t-2xl border border-zinc-200
                bg-white p-4
                pb-[max(1rem,env(safe-area-inset-bottom))]
                shadow-xl outline-none
                dark:border-zinc-700 dark:bg-zinc-900
                lg:max-w-lg lg:rounded-2xl
              "
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2
                  id={titleId}
                  className="
                    text-sm font-medium
                    text-zinc-700 dark:text-zinc-200
                  "
                >
                  {isEditing
                    ? `${editLabel} · ${marketName}`
                    : predictionLabel.replace("{market}", marketName)}
                </h2>

                <button
                  type="button"
                  disabled={isSubmitting}
                  aria-label={interfaceLabels.close}
                  onClick={closePopup}
                  className="
                    flex size-7 shrink-0 cursor-pointer
                    items-center justify-center rounded-full
                    text-zinc-400 transition-colors
                    hover:bg-zinc-100 hover:text-zinc-800
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-zinc-400
                    disabled:cursor-default disabled:opacity-50
                    dark:hover:bg-zinc-800
                    dark:hover:text-zinc-200
                  "
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>

              {isCombinedEditing ? (
                editableComment?.lookupKey === editorLookupKey ? (
                  <PredictionCommentEditInput
                    key={`combined:${editorLookupKey}:${editableComment.data.id}`}
                    commentId={editableComment.data.id}
                    initialContent={editableComment.data.content}
                    prediction={editableComment.data.prediction}
                    onCancel={closePopup}
                    onSavingChange={(saving) => {
                      combinedSavingRef.current = saving;

                      submittingRef.current = saving;

                      if (mountedRef.current) {
                        setIsSubmitting(saving);
                      }

                      if (saving) {
                        voteRevisionRef.current += 1;
                      }
                    }}
                    onSaved={(result) => {
                      if (
                        !mountedRef.current ||
                        activeEditorKeyRef.current !== editorLookupKey
                      ) {
                        return;
                      }

                      const savedPrediction = result.prediction;

                      if (
                        savedPrediction &&
                        editorLookupKey === activeLookupKeyRef.current
                      ) {
                        voteRevisionRef.current += 1;

                        setVoteState({
                          lookupKey,
                          direction: savedPrediction.direction,
                          pointsBet: savedPrediction.pointsBet,
                          status: savedPrediction.status,
                        });

                        setCheckedLookupKey(lookupKey);

                        setVoteLookupFailed(false);
                      }

                      setDraft({
                        text: "",
                        gif: null,
                      });

                      setEditor(null);
                      setEditableComment(null);

                      window.requestAnimationFrame(() => {
                        if (
                          mountedRef.current &&
                          activeLookupKeyRef.current === lookupKey
                        ) {
                          triggerRef.current?.focus();
                        }
                      });
                    }}
                  />
                ) : editLoadError ? (
                  <div
                    className="
                      flex min-h-40 flex-col items-center
                      justify-center gap-3
                    "
                  >
                    <p role="alert" className="text-sm text-zinc-500">
                      {interfaceLabels.lookup_failed}
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        setEditLoadError(false);

                        setEditLoadVersion((value) => value + 1);
                      }}
                      className="
                        cursor-pointer rounded-sm text-sm
                        underline underline-offset-4
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-zinc-400
                      "
                    >
                      {interfaceLabels.retry}
                    </button>
                  </div>
                ) : (
                  <div
                    role="status"
                    className="
                      flex min-h-40 items-center justify-center
                    "
                  >
                    <span
                      aria-hidden="true"
                      className="
                        size-5 animate-spin rounded-full
                        border-2 border-zinc-200
                        border-t-zinc-600
                        dark:border-zinc-700
                        dark:border-t-zinc-200
                      "
                    />

                    <span className="sr-only">{interfaceLabels.checking}</span>
                  </div>
                )
              ) : (
                <PredictionCommentInput
                  key={`${lookupKey}:${editor?.mode}`}
                  variant="popup"
                  draft={isEditing ? undefined : draft}
                  onDraftChange={isEditing ? undefined : setDraft}
                  mode={isEditing ? "edit" : "create"}
                  onCancel={closePopup}
                  assetSymbol={symbol}
                  onCommentCreated={() => {
                    closePopup();
                  }}
                  direction={draftDirection}
                  setDirection={setDraftDirection}
                  betAmount={betAmount}
                  setBetAmount={setBetAmount}
                  userPoints={availablePoints}
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
                  showCountdown={
                    votingWindow.showCountdown &&
                    votingWindow.countdownType === "VOTING_CLOSES"
                  }
                />
              )}

              {!isCombinedEditing && editorMessage && (
                <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                  {editorMessage}
                </p>
              )}

              {!isCombinedEditing && voteLookupFailed && (
                <button
                  type="button"
                  disabled={voteButtonDisabled}
                  onClick={retryVoteLookup}
                  className="
                      mt-2 cursor-pointer text-xs
                      underline underline-offset-4
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
