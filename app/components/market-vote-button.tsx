"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, LockKeyhole, Pencil, X } from "lucide-react";
import { PiArrowFatLinesUpFill } from "react-icons/pi";
import { toast } from "sonner";
import type { JSONContent } from "@tiptap/react";

import {
  getMarketVote,
  submitMarketVote,
  updateMarketVote,
  type VoteDirection,
} from "@/app/actions/market-vote";
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

type VoteStatus = NonNullable<
  Awaited<ReturnType<typeof getMarketVote>>
>["status"];

type EditorMode = "create" | "edit";

interface MarketVoteButtonProps {
  marketName: string;
  symbol: string;
  initialVote?: VoteDirection | null;
  initialVoteSessionKey?: string | null;
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

const EDIT_LABELS = {
  en: { edit: "Edit vote", saved: "Prediction saved." },
  ko: { edit: "투표 수정", saved: "투표를 저장했어요." },
  ja: { edit: "投票を変更", saved: "投票を保存しました。" },
  zh: { edit: "修改投票", saved: "投票已保存。" },
  de: { edit: "Abstimmung ändern", saved: "Abstimmung gespeichert." },
  fr: { edit: "Modifier le vote", saved: "Vote enregistré." },
  es: { edit: "Modificar voto", saved: "Voto guardado." },
  pt: { edit: "Editar voto", saved: "Voto salvo." },
  it: { edit: "Modifica voto", saved: "Voto salvato." },
  ru: { edit: "Изменить голос", saved: "Голос сохранён." },
  ar: { edit: "تعديل التصويت", saved: "تم حفظ التصويت." },
  hi: { edit: "वोट बदलें", saved: "वोट सहेजा गया।" },
} as const;

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

function buildCommentContent(
  comment: string,
  gif: GifResult | null,
): JSONContent {
  const text = comment.trim();

  return {
    type: "doc",
    content: [
      ...(text
        ? text.split(/\r\n|\r|\n/).map((line) => ({
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
  const editLabels = EDIT_LABELS[language];

  const { points: userPoints, setPoints } = usePointBalance();

  const popupId = useId();
  const titleId = useId();

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const submittingRef = useRef(false);
  const mountedRef = useRef(false);
  const voteRevisionRef = useRef(0);
  const lastFocusRefreshRef = useRef(0);

  const [editor, setEditor] = useState<EditorState | null>(null);
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

  // Initial direction alone does not contain the stake or status.
  // Fetch the complete vote before enabling submission/editing.
  const [checkedLookupKey, setCheckedLookupKey] = useState<string | null>(null);
  const [voteLookupFailed, setVoteLookupFailed] = useState(false);

  const currentVote = voteState.lookupKey === lookupKey ? voteState : null;

  const direction = currentVote?.direction ?? null;
  const existingPointsBet = currentVote?.pointsBet ?? 0;

  const isVoteLoading = Boolean(sessionKey) && checkedLookupKey !== lookupKey;

  const voteButtonDisabled = isVoteLoading || isSubmitting;

  const isOpen = editor?.lookupKey === lookupKey;
  const isEditing = isOpen && editor?.mode === "edit";

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
    if (submittingRef.current) return;

    setEditor(null);
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
    if (voteButtonDisabled || submittingRef.current) return;
    if (!canUsePrediction(mode)) return;

    triggerRef.current = trigger;

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
    if (submittingRef.current || !editor || editor.lookupKey !== lookupKey) {
      return;
    }

    const mode = editor.mode;

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

    // Invalidate any lookup started before the submission.
    voteRevisionRef.current += 1;

    const isCurrentView = () =>
      mountedRef.current && activeLookupKeyRef.current === submittedLookupKey;

    try {
      let updatedPoints: number | null = null;
      let savedDirection = submittedDirection;
      let savedPointsBet = submittedAmount;
      let savedStatus: VoteStatus = "PENDING";

      if (mode === "edit") {
        const result = await updateMarketVote({
          symbol,
          direction: submittedDirection,
          pointsBet: submittedAmount,
          sessionDate,
        });

        updatedPoints = result.points;
        savedDirection = result.direction;
        savedPointsBet = result.pointsBet;
        savedStatus = result.status;
      } else if (userId) {
        const result = await createComment({
          content: buildCommentContent(
            canWriteComment ? comment : "",
            canWriteComment ? gif : null,
          ),
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

      // Also invalidate lookups started while saving.
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
      setEditor(null);

      if (mode === "edit") {
        toast.success(editLabels.saved);
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

      // Wait until the updated trigger is rendered.
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

  // Discard a popup belonging to a previous voter or session.
  useEffect(() => {
    setEditor(null);
    setDraftDirection(null);
  }, [lookupKey]);

  // Update market time and refresh when returning to the page.
  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    function handleFocus() {
      if (document.visibilityState !== "visible") return;

      const currentTime = Date.now();
      setNow(currentTime);

      if (submittingRef.current) return;
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

  useEffect(() => {
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
        const vote = await getMarketVote({
          symbol,
          sessionDate,
        });

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
  }, [symbol, sessionKey, lookupKey, refreshVersion]);

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
        submittingRef.current
      ) {
        return;
      }

      setEditor(null);
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
        <div className="flex min-w-0 items-center gap-2">
          <span className={VOTE_STATUS_CLASS}>
            <Check
              className="size-3.5 shrink-0"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            {votedLabel}
          </span>

          {canEdit && (
            <button
              ref={triggerRef}
              type="button"
              disabled={voteButtonDisabled}
              aria-label={`${marketName}: ${editLabels.edit}`}
              title={editLabels.edit}
              aria-expanded={isOpen}
              aria-controls={isOpen ? popupId : undefined}
              onClick={(event) => openEditor("edit", event.currentTarget)}
              className="
                flex size-7 shrink-0 cursor-pointer
                items-center justify-center rounded-full
                text-zinc-500 transition-colors
                hover:bg-zinc-100 hover:text-zinc-900
                focus-visible:outline-none
                focus-visible:ring-2 focus-visible:ring-zinc-400
                disabled:cursor-default disabled:opacity-50
                dark:text-zinc-400 dark:hover:bg-zinc-800
                dark:hover:text-zinc-100
              "
            >
              <Pencil className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
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
                openEditor("create", event.currentTarget, "BEAR")
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
              fixed inset-0 z-100 flex items-end justify-center
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
                  {isEditing
                    ? `${editLabels.edit} · ${marketName}`
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
                    focus-visible:ring-2 focus-visible:ring-zinc-400
                    disabled:cursor-default disabled:opacity-50
                    dark:hover:bg-zinc-800 dark:hover:text-zinc-200
                  "
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>

              <PredictionCommentInput
                key={`${lookupKey}:${editor?.mode}`}
                variant="popup"
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
