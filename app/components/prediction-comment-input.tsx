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

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { createComment, type MarketPageComments } from "@/app/actions/post";
import { useCurrentUser } from "@/app/context/user-context";

import { resolveLanguage } from "@/lib/data/languages";
import { COMMENT_LABELS, VOTE_LABELS } from "@/lib/data/translations";

import { VotingCountdown } from "./voting-countdown";
import { GifPicker, type GifResult } from "./gif-picker";

type VoteDirection = "BULL" | "BEAR";

interface PredictionCommentInputProps {
  variant?: "default" | "popup";
  initialComment?: string;

  mode?: "create" | "edit";
  onCancel?: () => void;

  assetSymbol: string;
  onCommentCreated: (
    comment: MarketPageComments[number],
  ) => void | Promise<void>;

  direction: VoteDirection | null;
  setDirection: Dispatch<SetStateAction<VoteDirection | null>>;

  betAmount: number;
  setBetAmount: Dispatch<SetStateAction<number>>;

  // In edit mode, include the existing stake in this amount.
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

const COMMENT_ONLY_LABELS = {
  en: "Comment only",
  ko: "댓글만 작성",
  ja: "コメントのみ",
  zh: "仅评论",
  de: "Nur kommentieren",
  fr: "Commentaire uniquement",
  es: "Solo comentar",
  pt: "Apenas comentar",
  it: "Solo commento",
  ru: "Только комментарий",
  ar: "تعليق فقط",
  hi: "केवल टिप्पणी",
} as const;

const EDIT_VOTE_LABELS = {
  en: { save: "Save changes", saving: "Saving...", cancel: "Cancel" },
  ko: { save: "수정 저장", saving: "저장 중...", cancel: "취소" },
  ja: { save: "変更を保存", saving: "保存中...", cancel: "キャンセル" },
  zh: { save: "保存修改", saving: "保存中...", cancel: "取消" },
  de: {
    save: "Änderungen speichern",
    saving: "Speichern...",
    cancel: "Abbrechen",
  },
  fr: {
    save: "Enregistrer",
    saving: "Enregistrement...",
    cancel: "Annuler",
  },
  es: {
    save: "Guardar cambios",
    saving: "Guardando...",
    cancel: "Cancelar",
  },
  pt: {
    save: "Salvar alterações",
    saving: "Salvando...",
    cancel: "Cancelar",
  },
  it: {
    save: "Salva modifiche",
    saving: "Salvataggio...",
    cancel: "Annulla",
  },
  ru: {
    save: "Сохранить изменения",
    saving: "Сохранение...",
    cancel: "Отмена",
  },
  ar: {
    save: "حفظ التغييرات",
    saving: "جارٍ الحفظ...",
    cancel: "إلغاء",
  },
  hi: {
    save: "बदलाव सहेजें",
    saving: "सहेजा जा रहा है...",
    cancel: "रद्द करें",
  },
} as const;

function clampPoints(value: number, limit: number): number {
  if (!Number.isFinite(value)) return 0;

  return Math.floor(Math.max(0, Math.min(limit, value)) / 50) * 50;
}

export function PredictionCommentInput({
  variant = "default",
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
  initialComment = "",
  mode = "create",
  onCancel,
}: PredictionCommentInputProps) {
  const user = useCurrentUser();

  const [commentOnly, setCommentOnly] = useState(false);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [selectedGif, setSelectedGif] = useState<GifResult | null>(null);
  const [comment, setComment] = useState(initialComment);
  const [commentPending, startCommentTransition] = useTransition();

  const gifButtonRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submittingRef = useRef(false);

  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activePointerRef = useRef<number | null>(null);

  const language = resolveLanguage(user?.language ?? currentUser?.language);
  const voteLabels = VOTE_LABELS[language];
  const commentLabels = COMMENT_LABELS[language];
  const commentOnlyLabel = COMMENT_ONLY_LABELS[language];
  const editLabels = EDIT_VOTE_LABELS[language];

  const isEditing = mode === "edit";
  const isCommentOnly = !isEditing && commentOnly;

  const isChatRestricted =
    user?.status === "BANNED" || user?.status === "MUTED";

  const canWriteComment =
    !isEditing && Boolean(currentUser) && !isChatRestricted;

  const busy = isPending || commentPending;
  const chatDisabled = busy || isChatRestricted || isEditing;

  const controlsDisabled = buttonDisabled || busy || isMarketOpen;
  const pointsDisabled = controlsDisabled || !currentUser || isCommentOnly;

  const hasContent = comment.trim().length > 0 || Boolean(selectedGif);

  const availablePoints = Number.isFinite(userPoints)
    ? Math.max(0, userPoints)
    : 0;

  const availableMaxBet = Number.isFinite(maxBet) ? Math.max(0, maxBet) : 0;

  const pointsLimit =
    Math.floor(Math.min(500, availableMaxBet, availablePoints) / 50) * 50;

  const validBet =
    !currentUser ||
    (Number.isInteger(betAmount) &&
      betAmount >= 0 &&
      betAmount <= pointsLimit &&
      betAmount % 50 === 0);

  const submitDisabled = isCommentOnly
    ? busy || !canWriteComment || !hasContent
    : controlsDisabled || !direction || !validBet;

  const showMax = pointsLimit > 0 && betAmount >= pointsLimit;

  const holdStateRef = useRef({
    pointsDisabled,
    pointsLimit,
    betAmount,
    setBetAmount,
  });

  useLayoutEffect(() => {
    holdStateRef.current = {
      pointsDisabled,
      pointsLimit,
      betAmount,
      setBetAmount,
    };
  }, [pointsDisabled, pointsLimit, betAmount, setBetAmount]);

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

      if (
        state.pointsDisabled ||
        (change < 0 && state.betAmount <= 0) ||
        (change > 0 && state.betAmount >= state.pointsLimit)
      ) {
        stopPointsHold();
        return false;
      }

      state.setBetAmount((previous) =>
        clampPoints(previous + change, state.pointsLimit),
      );

      return true;
    },
    [stopPointsHold],
  );

  const startPointsHold = (
    event: PointerEvent<HTMLButtonElement>,
    change: number,
  ) => {
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
      }, 90);
    }, 350);
  };

  const handlePointerEnd = (event: { pointerId: number }) => {
    if (event.pointerId === activePointerRef.current) {
      stopPointsHold();
    }
  };

  useEffect(() => {
    const handlePointerRelease = (event: globalThis.PointerEvent) => {
      if (event.pointerId === activePointerRef.current) {
        stopPointsHold();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) stopPointsHold();
    };

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

  useEffect(() => {
    if (!currentUser) {
      setComment("");
      setSelectedGif(null);
      setCommentOnly(false);
    }

    if (!currentUser || isChatRestricted || busy || isEditing) {
      setGifPickerOpen(false);
    }
  }, [currentUser, isChatRestricted, busy, isEditing]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const resize = () => {
      const maxHeight = 240;

      textarea.style.height = "auto";

      const contentHeight = textarea.scrollHeight;

      textarea.style.height = `${Math.min(contentHeight, maxHeight)}px`;
      textarea.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden";
    };

    resize();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", resize);

      return () => window.removeEventListener("resize", resize);
    }

    let lastWidth = textarea.getBoundingClientRect().width;

    const observer = new ResizeObserver(() => {
      const width = textarea.getBoundingClientRect().width;

      if (width === lastWidth) return;

      lastWidth = width;
      resize();
    });

    observer.observe(textarea);

    return () => observer.disconnect();
  }, [comment, isEditing]);

  const showLoginMessage = () => {
    toast.error(commentLabels.login.replace(/\.{3}$/, ""), {
      id: "login-required",
    });
  };

  const handleDirectionClick = (nextDirection: VoteDirection) => {
    if (controlsDisabled || submittingRef.current) return;

    setCommentOnly(false);
    setDirection(nextDirection);
  };

  const handleCommentOnlyChange = (checked: boolean) => {
    if (isEditing || busy || submittingRef.current || isChatRestricted) {
      return;
    }

    if (!currentUser) {
      showLoginMessage();
      return;
    }

    stopPointsHold();
    setCommentOnly(checked);
    setDirection(null);
  };

  const handleComment = () => {
    if (
      chatDisabled ||
      submittingRef.current ||
      !canWriteComment ||
      !hasContent
    ) {
      return;
    }

    submittingRef.current = true;
    setGifPickerOpen(false);

    startCommentTransition(async () => {
      try {
        const text = comment.trim();
        const nodes: JSONContent[] = [];

        if (text) {
          for (const line of text.split(/\r\n|\r|\n/)) {
            nodes.push({
              type: "paragraph",
              content: line ? [{ type: "text", text: line }] : [],
            });
          }
        }

        if (selectedGif) {
          nodes.push({
            type: "image",
            attrs: {
              src: selectedGif.src,
              alt: selectedGif.title,
            },
          });
        }

        const content: JSONContent = {
          type: "doc",
          content: nodes,
        };

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
        setGifPickerOpen(false);

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
  };

  const handleSubmit = () => {
    stopPointsHold();

    if (submitDisabled || submittingRef.current) return;

    if (isEditing) {
      submitVote("", null);
      return;
    }

    if (isCommentOnly) {
      handleComment();
      return;
    }

    // Comment and GIF remain optional for initial voting.
    submitVote(
      canWriteComment ? comment : "",
      canWriteComment ? selectedGif : null,
    );
  };

  return (
    <div className={`flex gap-3 ${variant === "popup" ? "" : "mb-8"}`}>
      <Avatar className="size-9 shrink-0">
        <AvatarImage
          src={currentUser?.image ?? undefined}
          alt={currentUser?.name ?? "User"}
          className="object-cover"
        />

        <AvatarFallback className="bg-olive-500 text-lg font-normal text-white">
          {Array.from(currentUser?.name?.trim() ?? "")[0]?.toUpperCase() ?? "G"}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="rounded-lg bg-zinc-100 px-2.5 dark:bg-zinc-800">
          {/* Prediction controls */}
          <div
            className="
              grid grid-cols-[auto_minmax(0,1fr)]
              items-center gap-x-3 gap-y-1 pt-2.5
              sm:flex sm:min-h-10 sm:flex-wrap sm:gap-y-2
            "
          >
            {/* Bull / Bear */}
            <div
              className={`
                relative flex h-8 w-30 shrink-0 items-center
                rounded-full p-0.5 text-[14px] font-normal
                transition-colors duration-200
                ${
                  direction === "BULL"
                    ? "bg-emerald-600/15"
                    : direction === "BEAR"
                      ? "bg-rose-700/15"
                      : "bg-zinc-200 dark:bg-zinc-700"
                }
                ${controlsDisabled ? "opacity-50" : ""}
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

              <button
                type="button"
                aria-pressed={direction === "BULL"}
                disabled={controlsDisabled}
                onClick={() => handleDirectionClick("BULL")}
                className={`
                  relative z-10 flex h-full flex-1
                  cursor-pointer touch-manipulation
                  items-center justify-center rounded-full
                  transition-colors disabled:cursor-default
                  ${direction === "BULL" ? "text-white" : "text-zinc-500"}
                `}
              >
                {voteLabels.bull}
              </button>

              <button
                type="button"
                aria-pressed={direction === "BEAR"}
                disabled={controlsDisabled}
                onClick={() => handleDirectionClick("BEAR")}
                className={`
                  relative z-10 flex h-full flex-1
                  cursor-pointer touch-manipulation
                  items-center justify-center rounded-full
                  transition-colors disabled:cursor-default
                  ${direction === "BEAR" ? "text-white" : "text-zinc-500"}
                `}
              >
                {voteLabels.bear}
              </button>
            </div>

            {/* Selected prediction points */}
            {currentUser && (
              <div
                className={`
                  relative flex w-max min-w-0 justify-self-end
                  items-center justify-center gap-0.5
                  sm:flex-none sm:shrink-0 sm:gap-0
                  ${
                    isCommentOnly
                      ? "invisible pointer-events-none sm:hidden"
                      : ""
                  }
                `}
              >
                <button
                  type="button"
                  aria-label="Decrease points"
                  disabled={pointsDisabled || betAmount <= 0}
                  onPointerDown={(event) => startPointsHold(event, -50)}
                  onPointerUp={handlePointerEnd}
                  onPointerCancel={handlePointerEnd}
                  onLostPointerCapture={handlePointerEnd}
                  onClick={(event) => {
                    if (event.detail === 0) stepPoints(-50);
                  }}
                  onContextMenu={(event) => event.preventDefault()}
                  className={POINT_BUTTON_CLASS}
                >
                  −
                </button>

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

                {showMax && (
                  <span
                    className="
                      absolute -bottom-1 left-1/2 -translate-x-1/2
                      text-[10px] font-medium text-zinc-500
                    "
                  >
                    max
                  </span>
                )}

                <button
                  type="button"
                  aria-label="Increase points"
                  disabled={pointsDisabled || betAmount >= pointsLimit}
                  onPointerDown={(event) => startPointsHold(event, 50)}
                  onPointerUp={handlePointerEnd}
                  onPointerCancel={handlePointerEnd}
                  onLostPointerCapture={handlePointerEnd}
                  onClick={(event) => {
                    if (event.detail === 0) stepPoints(50);
                  }}
                  onContextMenu={(event) => event.preventDefault()}
                  className={POINT_BUTTON_CLASS}
                >
                  +
                </button>
              </div>
            )}

            {/* Points available for this vote */}
            {currentUser && !isCommentOnly && (
              <span
                className="
                  jakarta hidden shrink-0 whitespace-nowrap
                  text-sm font-normal tabular-nums
                  text-zinc-400 sm:block dark:text-zinc-500
                "
              >
                {availablePoints.toLocaleString(language)}pts.
              </span>
            )}

            {!isEditing && (
              <label
                className={`
                  col-span-2 flex min-h-9 min-w-0 items-center gap-1.5
                  text-xs text-zinc-600 dark:text-zinc-300
                  sm:min-h-8 sm:shrink-0
                  ${
                    busy || isChatRestricted
                      ? "cursor-default opacity-50"
                      : "cursor-pointer"
                  }
                `}
              >
                <input
                  type="checkbox"
                  checked={isCommentOnly}
                  disabled={busy || isChatRestricted}
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

          {/* Comment: optional for initial voting */}
          {!isEditing && (
            <textarea
              ref={textareaRef}
              value={canWriteComment ? comment : ""}
              disabled={chatDisabled}
              onChange={(event) => {
                if (!currentUser || chatDisabled || submittingRef.current) {
                  return;
                }

                setComment(event.target.value);
              }}
              readOnly={!currentUser}
              tabIndex={currentUser && !isChatRestricted ? 0 : -1}
              onFocus={(event) => {
                if (!currentUser) event.currentTarget.blur();
              }}
              onClick={() => {
                if (!currentUser) showLoginMessage();
              }}
              rows={1}
              aria-label={
                currentUser ? commentLabels.write : commentLabels.login
              }
              placeholder={
                currentUser ? commentLabels.write : commentLabels.login
              }
              style={{ overflowX: "hidden" }}
              className={`
                content-scrollbar block min-h-11 w-full
                resize-none overflow-hidden bg-transparent px-1.5 py-4
                text-[15px] leading-6 outline-none
                placeholder:truncate placeholder:text-zinc-500
                disabled:cursor-not-allowed disabled:opacity-60
                ${!currentUser ? "cursor-default caret-transparent" : ""}
              `}
            />
          )}

          {/* Selected GIF */}
          {canWriteComment && selectedGif && (
            <div className="relative mb-3 w-fit max-w-full">
              <img
                src={selectedGif.preview || selectedGif.src}
                alt={selectedGif.title}
                className="block max-h-60 max-w-full rounded-lg object-contain"
              />

              <button
                type="button"
                aria-label="Remove GIF"
                disabled={chatDisabled}
                onClick={() => {
                  if (chatDisabled || submittingRef.current) return;

                  setSelectedGif(null);
                }}
                className="
                  absolute right-2 top-2
                  flex size-7 cursor-pointer
                  items-center justify-center rounded-full
                  bg-black/60 text-white
                  transition-colors hover:bg-black/75
                  disabled:cursor-not-allowed disabled:opacity-50
                "
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Bottom actions */}
          <div
            className={`
              @container flex items-center justify-between gap-2 pb-2
              ${isEditing ? "pt-3" : ""}
            `}
          >
            <div className="flex shrink-0 items-center gap-1">
              {!isEditing && (
                <>
                  <button
                    ref={gifButtonRef}
                    type="button"
                    disabled={chatDisabled || !currentUser}
                    aria-label="Select GIF"
                    aria-expanded={
                      gifPickerOpen && !chatDisabled && Boolean(currentUser)
                    }
                    onClick={() => {
                      if (
                        chatDisabled ||
                        !currentUser ||
                        submittingRef.current
                      ) {
                        return;
                      }

                      setGifPickerOpen((open) => !open);
                    }}
                    className="
                      cursor-pointer rounded-md px-2 py-1
                      text-sm font-medium text-zinc-500
                      hover:bg-zinc-200 dark:hover:bg-zinc-700
                      disabled:cursor-not-allowed disabled:opacity-50
                    "
                  >
                    GIF
                  </button>

                  {!chatDisabled && currentUser && (
                    <GifPicker
                      triggerRef={gifButtonRef}
                      open={gifPickerOpen}
                      onOpenChange={setGifPickerOpen}
                      onSelect={(gif) => {
                        if (
                          chatDisabled ||
                          !currentUser ||
                          submittingRef.current
                        ) {
                          return;
                        }

                        setSelectedGif(gif);
                        setGifPickerOpen(false);
                      }}
                    />
                  )}
                </>
              )}
            </div>

            <div className="flex min-w-0 items-center justify-end gap-2">
              {showCountdown && countdownType === "VOTING_CLOSES" && (
                <div className="hidden @[380px]:block">
                  <VotingCountdown
                    targetMs={targetMs}
                    type={countdownType}
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
                  onClick={() => {
                    if (busy || submittingRef.current) return;

                    stopPointsHold();
                    onCancel();
                  }}
                  className="
                    shrink-0 cursor-pointer rounded-md px-2 py-1
                    text-sm text-zinc-500 hover:text-zinc-800
                    disabled:cursor-default disabled:opacity-50
                    dark:text-zinc-400 dark:hover:text-zinc-100
                  "
                >
                  {editLabels.cancel}
                </button>
              )}

              <Button
                type="button"
                size="sm"
                disabled={submitDisabled}
                onClick={handleSubmit}
                className="
                  shrink-0 cursor-pointer border-none
                  bg-transparent text-zinc-800 shadow-none
                  transition-colors hover:bg-transparent
                  dark:bg-transparent dark:text-zinc-100
                  dark:hover:bg-transparent
                  disabled:cursor-not-allowed
                  disabled:bg-transparent disabled:opacity-100
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

                {isEditing
                  ? isPending
                    ? editLabels.saving
                    : editLabels.save
                  : isCommentOnly
                    ? commentPending
                      ? commentLabels.posting
                      : commentLabels.comment
                    : isPending
                      ? voteLabels.voting
                      : voteLabels.vote}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
