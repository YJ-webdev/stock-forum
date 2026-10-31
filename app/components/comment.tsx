// app/components/comment.tsx

"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  getMarketComments,
  type MarketCommentsPage,
  type MarketPageComments,
} from "@/app/actions/post";
import type {
  getMarketVote,
  updateMarketVote,
} from "@/app/actions/market-vote";

import { useCurrentUser } from "@/app/context/user-context";
import type { CommentDraft } from "@/app/hooks/use-comment-draft";
import type { PredictionDirection } from "@/generated/prisma/enums";

import { resolveLanguage } from "@/lib/data/languages";
import {
  COMMENT_ACTION_LABELS,
  COMMENT_VIEW_LABELS,
} from "@/lib/data/translations";
import { getErrorMessage } from "@/lib/utils/get-error-message";

import { CommentOnlyInput } from "./comment-only-input";
import { PredictionCommentInput } from "./prediction-comment-input";
import { CommentItem } from "./comment-item";
import type { GifResult } from "./gif-picker";

const TIME_REFRESH_INTERVAL_MS = 60_000;

const LOAD_MORE_LABELS = {
  en: "Load more",
  ko: "더 보기",
  ja: "もっと見る",
  zh: "加载更多",
  de: "Mehr laden",
  fr: "Charger plus",
  es: "Cargar más",
  pt: "Carregar mais",
  it: "Carica altro",
  ru: "Загрузить ещё",
  ar: "تحميل المزيد",
  hi: "और लोड करें",
} as const;

type CommentCursor = NonNullable<MarketCommentsPage["nextCursor"]>;

type VoteStatus = NonNullable<
  Awaited<ReturnType<typeof getMarketVote>>
>["status"];

type UpdateVoteResult = Awaited<ReturnType<typeof updateMarketVote>>;

export interface MarketReply {
  id: string;
  commentId: string;
  parentId: string | null;

  content: string;

  gifUrl: string | null;
  gifWidth: number | null;
  gifHeight: number | null;

  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
  moderatedAt: Date | null;

  author: {
    id: string;
    name: string | null;
    image: string | null;
    nationality: string | null;
  };

  likeCount: number;
  likedByMe: boolean;
  replyCount: number;
}

interface MarketCommentsProps {
  initialNowMs: number;
  initialCommentsPage: MarketCommentsPage;
  initialCommentsViewerId: string | null;
  initialCommentsSessionStartMs: number | null;

  assetSymbol: string;
  currentSessionStartMs: number | null;

  prediction: {
    selectedVote: PredictionDirection | null;
    selectedPointsBet: number;
    selectedVoteStatus: VoteStatus | null;

    canVote: boolean;
    voteLookupKey: string;

    isMarketOpen: boolean;

    // Blocks controls during lookup, submission, or lookup failure.
    isPending: boolean;

    // Shows submission labels only during an actual submission.
    isSubmitting: boolean;

    userPoints: number;
    betAmount: number;
    setBetAmount: Dispatch<SetStateAction<number>>;

    handleVote: (
      direction: PredictionDirection,
      betAmount: number,
      comment: string,
      gif: GifResult | null,
      onSuccess?: (comment: MarketPageComments[number]) => void | Promise<void>,
    ) => void;

    handleUpdateVote: (
      direction: PredictionDirection,
      betAmount: number,
    ) => Promise<UpdateVoteResult | null>;

    targetMs: number | null;
    countdownType: "VOTING_OPENS" | "VOTING_CLOSES" | null;
    showCountdown: boolean;
  } | null;

  onPredictionEdited?: (
    prediction: NonNullable<MarketPageComments[number]["prediction"]>,
  ) => void;
}

function getCommentContextKey(
  assetSymbol: string,
  viewerId: string | null,
  currentSessionStartMs: number | null,
) {
  return JSON.stringify([assetSymbol, viewerId, currentSessionStartMs]);
}

export function MarketComments({
  initialNowMs,
  assetSymbol,
  prediction,
  currentSessionStartMs,
  onPredictionEdited,
  initialCommentsPage,
  initialCommentsViewerId,
  initialCommentsSessionStartMs,
}: MarketCommentsProps) {
  const user = useCurrentUser();

  const language = resolveLanguage(user?.language);
  const labels = COMMENT_VIEW_LABELS[language];
  const actionLabels = COMMENT_ACTION_LABELS[language];
  const loadMoreLabel = LOAD_MORE_LABELS[language];

  const searchParams = useSearchParams();

  const targetCommentId = searchParams.get("comment");
  const targetReplyId = searchParams.get("reply");
  const highlightTargetComment = Boolean(targetCommentId);

  const viewerId = user?.id ?? null;

  const commentContextKey = getCommentContextKey(
    assetSymbol,
    viewerId,
    currentSessionStartMs,
  );

  // Keep the initial server snapshot tied to its original context.
  const initialCommentsRef = useRef({
    contextKey: getCommentContextKey(
      assetSymbol,
      initialCommentsViewerId,
      initialCommentsSessionStartMs,
    ),
    page: initialCommentsPage,
  });

  // Returning to an earlier context must fetch fresh comments.
  const canReuseInitialCommentsRef = useRef(true);

  const matchesInitialComments =
    initialCommentsRef.current.contextKey === commentContextKey;

  const [nowMs, setNowMs] = useState(initialNowMs);

  const [draft, setDraft] = useState<CommentDraft>({
    text: "",
    gif: null,
  });

  const [direction, setDirection] = useState<PredictionDirection | null>(null);

  const [editingVoteKey, setEditingVoteKey] = useState<string | null>(null);

  const [editDirection, setEditDirection] =
    useState<PredictionDirection | null>(null);

  const [editBetAmount, setEditBetAmount] = useState(0);
  const [isSavingVote, setIsSavingVote] = useState(false);

  const [comments, setComments] = useState<MarketPageComments>(() =>
    matchesInitialComments ? initialCommentsRef.current.page.comments : [],
  );

  const [nextCursor, setNextCursor] = useState<CommentCursor | null>(() =>
    matchesInitialComments ? initialCommentsRef.current.page.nextCursor : null,
  );

  const [totalCount, setTotalCount] = useState(() =>
    matchesInitialComments ? initialCommentsRef.current.page.totalCount : 0,
  );

  const [commentsLoading, setCommentsLoading] = useState(
    !matchesInitialComments,
  );

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [commentsRefreshVersion, setCommentsRefreshVersion] = useState(0);

  const savingVoteRef = useRef(false);
  const mountedRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const requestVersionRef = useRef(0);

  const knownCommentIdsRef = useRef(
    new Set<string>(
      matchesInitialComments
        ? initialCommentsRef.current.page.comments.map((comment) => comment.id)
        : [],
    ),
  );

  const errorFallbackRef = useRef(labels.action_failed);
  errorFallbackRef.current = labels.action_failed;

  const activeCommentContextRef = useRef(commentContextKey);

  const activeVoteLookupKeyRef = useRef<string | null>(
    prediction?.voteLookupKey ?? null,
  );

  activeVoteLookupKeyRef.current = prediction?.voteLookupKey ?? null;

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;

      setNowMs(Date.now());
    }, TIME_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [initialNowMs]);

  useEffect(() => {
    setDraft({ text: "", gif: null });
  }, [assetSymbol, viewerId]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    activeCommentContextRef.current = commentContextKey;

    return () => {
      if (activeCommentContextRef.current === commentContextKey) {
        activeCommentContextRef.current = "";
      }
    };
  }, [commentContextKey]);

  useEffect(() => {
    const requestVersion = ++requestVersionRef.current;
    let cancelled = false;

    loadingMoreRef.current = false;

    const initialSnapshot = initialCommentsRef.current;

    const matchesInitialContext =
      initialSnapshot.contextKey ===
      getCommentContextKey(assetSymbol, viewerId, currentSessionStartMs);

    if (!matchesInitialContext || commentsRefreshVersion !== 0) {
      canReuseInitialCommentsRef.current = false;
    }

    // Preserve local updates and skip the duplicate initial request.
    if (canReuseInitialCommentsRef.current && matchesInitialContext) {
      setCommentsLoading(false);
      setIsLoadingMore(false);

      return () => {
        cancelled = true;

        if (requestVersionRef.current === requestVersion) {
          requestVersionRef.current += 1;
        }
      };
    }

    knownCommentIdsRef.current.clear();

    setDirection(null);
    setComments([]);
    setNextCursor(null);
    setTotalCount(0);
    setCommentsLoading(true);
    setIsLoadingMore(false);

    function isCurrentRequest() {
      return !cancelled && requestVersionRef.current === requestVersion;
    }

    async function loadInitialComments() {
      try {
        const result = await getMarketComments(
          assetSymbol,
          null,
          currentSessionStartMs,
        );

        if (!isCurrentRequest()) return;

        const previouslyKnownIds = new Set(knownCommentIdsRef.current);
        const resultIds = new Set(result.comments.map((comment) => comment.id));

        const addedDuringLoadCount = [...previouslyKnownIds].filter(
          (id) => !resultIds.has(id),
        ).length;

        for (const id of resultIds) {
          knownCommentIdsRef.current.add(id);
        }

        setNowMs(Date.now());

        // Preserve comments submitted while loading.
        setComments((current) => [
          ...current.filter((comment) => !resultIds.has(comment.id)),
          ...result.comments,
        ]);

        setNextCursor(result.nextCursor);
        setTotalCount(result.totalCount + addedDuringLoadCount);
      } catch (error) {
        if (!isCurrentRequest()) return;

        console.error("Failed to load comments:", error);
        toast.error(getErrorMessage(error, errorFallbackRef.current));
      } finally {
        if (isCurrentRequest()) {
          setCommentsLoading(false);
        }
      }
    }

    void loadInitialComments();

    return () => {
      cancelled = true;

      if (requestVersionRef.current === requestVersion) {
        requestVersionRef.current += 1;
      }
    };
  }, [assetSymbol, currentSessionStartMs, viewerId, commentsRefreshVersion]);

  const loadMoreComments = useCallback(async () => {
    if (!nextCursor || commentsLoading || loadingMoreRef.current) {
      return;
    }

    const requestVersion = requestVersionRef.current;

    loadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const result = await getMarketComments(
        assetSymbol,
        nextCursor,
        currentSessionStartMs,
      );

      if (requestVersionRef.current !== requestVersion) {
        return;
      }

      for (const comment of result.comments) {
        knownCommentIdsRef.current.add(comment.id);
      }

      setNowMs(Date.now());

      setComments((current) => {
        const existingIds = new Set(current.map((comment) => comment.id));

        return [
          ...current,
          ...result.comments.filter((comment) => !existingIds.has(comment.id)),
        ];
      });

      setNextCursor(result.nextCursor);
    } catch (error) {
      if (requestVersionRef.current !== requestVersion) {
        return;
      }

      console.error("Failed to load more comments:", error);
      toast.error(getErrorMessage(error, errorFallbackRef.current));
    } finally {
      if (requestVersionRef.current === requestVersion) {
        loadingMoreRef.current = false;
        setIsLoadingMore(false);
      }
    }
  }, [assetSymbol, nextCursor, commentsLoading, currentSessionStartMs]);

  const updateComment = useCallback(
    (
      commentId: string,
      updater: (
        comment: MarketPageComments[number],
      ) => MarketPageComments[number],
    ) => {
      setComments((current) =>
        current.map((comment) =>
          comment.id === commentId ? updater(comment) : comment,
        ),
      );
    },
    [],
  );

  const removeComment = useCallback((commentId: string) => {
    if (!knownCommentIdsRef.current.delete(commentId)) {
      return;
    }

    setComments((current) =>
      current.filter((comment) => comment.id !== commentId),
    );

    setTotalCount((current) => Math.max(0, current - 1));
  }, []);

  const addComment = useCallback((comment: MarketPageComments[number]) => {
    if (knownCommentIdsRef.current.has(comment.id)) {
      return;
    }

    knownCommentIdsRef.current.add(comment.id);

    setNowMs(Date.now());
    setComments((current) => [comment, ...current]);
    setTotalCount((current) => current + 1);
  }, []);

  const onCommentCreated = useCallback(
    (comment: MarketPageComments[number]) => {
      if (activeCommentContextRef.current !== commentContextKey) {
        return;
      }

      setDraft({ text: "", gif: null });
      addComment(comment);
    },
    [commentContextKey, addComment],
  );

  const hasAlreadyVoted = prediction?.selectedVote != null;

  // Members edit through the linked prediction comment.
  // Guests use the standalone vote editor.
  const canEditVote = Boolean(
    !user?.id &&
    prediction &&
    hasAlreadyVoted &&
    prediction.selectedVoteStatus === "PENDING" &&
    prediction.canVote &&
    !prediction.isMarketOpen,
  );

  const isEditingVote = Boolean(
    prediction && canEditVote && editingVoteKey === prediction.voteLookupKey,
  );

  useEffect(() => {
    setEditingVoteKey(null);
    setEditDirection(null);
    setEditBetAmount(0);
  }, [
    prediction?.voteLookupKey,
    prediction?.canVote,
    prediction?.selectedVoteStatus,
    prediction?.isMarketOpen,
  ]);

  const maxBet =
    user?.id && prediction
      ? Math.floor(Math.max(0, Math.min(500, prediction.userPoints)) / 50) * 50
      : 0;

  const editAvailablePoints =
    user?.id && prediction
      ? Math.max(0, prediction.userPoints + prediction.selectedPointsBet)
      : 0;

  const editMaxBet = Math.floor(Math.min(500, editAvailablePoints) / 50) * 50;

  const showPredictionInput =
    prediction !== null &&
    !hasAlreadyVoted &&
    prediction.canVote &&
    !prediction.isMarketOpen;

  function submitVote(comment: string, gif: GifResult | null) {
    if (!prediction || prediction.isPending || savingVoteRef.current) {
      return;
    }

    if (!prediction.canVote || prediction.isMarketOpen) {
      toast.error(labels.voting_closed);
      return;
    }

    if (prediction.selectedVote !== null) {
      toast.error(labels.already_voted);
      return;
    }

    if (!direction) {
      toast.error(labels.choose_direction);
      return;
    }

    const isMember = Boolean(user?.id);
    const submittedAmount = isMember ? prediction.betAmount : 0;

    if (
      !Number.isInteger(submittedAmount) ||
      submittedAmount < 0 ||
      submittedAmount > 500 ||
      submittedAmount % 50 !== 0
    ) {
      toast.error(labels.invalid_bet);
      return;
    }

    if (submittedAmount > prediction.userPoints && submittedAmount > 0) {
      toast.error(actionLabels.insufficient_points);
      return;
    }

    const canWriteComment =
      isMember && user?.status !== "BANNED" && user?.status !== "MUTED";

    prediction.handleVote(
      direction,
      submittedAmount,
      canWriteComment ? comment : "",
      canWriteComment ? gif : null,
      isMember ? onCommentCreated : undefined,
    );
  }

  function cancelEditingVote() {
    if (savingVoteRef.current) return;

    setEditingVoteKey(null);
    setEditDirection(null);
    setEditBetAmount(0);
  }

  async function saveEditedVote() {
    if (
      !prediction ||
      !isEditingVote ||
      !canEditVote ||
      prediction.isPending ||
      savingVoteRef.current
    ) {
      return;
    }

    if (!editDirection) {
      toast.error(labels.choose_direction);
      return;
    }

    const submittedAmount = user?.id ? editBetAmount : 0;

    if (
      !Number.isInteger(submittedAmount) ||
      submittedAmount < 0 ||
      submittedAmount > 500 ||
      submittedAmount % 50 !== 0
    ) {
      toast.error(labels.invalid_bet);
      return;
    }

    if (submittedAmount > editAvailablePoints) {
      toast.error(actionLabels.insufficient_points);
      return;
    }

    const submittedContextKey = commentContextKey;
    const submittedVoteKey = prediction.voteLookupKey;

    savingVoteRef.current = true;
    setIsSavingVote(true);

    try {
      const result = await prediction.handleUpdateVote(
        editDirection,
        submittedAmount,
      );

      if (!mountedRef.current || !result) return;

      if (
        activeCommentContextRef.current !== submittedContextKey ||
        activeVoteLookupKeyRef.current !== submittedVoteKey
      ) {
        return;
      }

      setEditingVoteKey(null);
      setEditDirection(null);
      setEditBetAmount(0);

      requestVersionRef.current += 1;
      setCommentsRefreshVersion((value) => value + 1);
    } catch (error) {
      console.error("Failed to update vote:", error);

      if (
        mountedRef.current &&
        activeCommentContextRef.current === submittedContextKey &&
        activeVoteLookupKeyRef.current === submittedVoteKey
      ) {
        toast.error(getErrorMessage(error, errorFallbackRef.current));
      }
    } finally {
      savingVoteRef.current = false;

      if (mountedRef.current) {
        setIsSavingVote(false);
      }
    }
  }

  return (
    <section className="w-full">
      <div className="mb-3 flex items-center gap-1 text-[13px] text-zinc-600 dark:text-zinc-400">
        <h2>{labels.heading}</h2>
        <span>{totalCount.toLocaleString(language)}</span>
      </div>

      {prediction && isEditingVote ? (
        <PredictionCommentInput
          key={`edit:${prediction.voteLookupKey}`}
          mode="edit"
          onCancel={cancelEditingVote}
          assetSymbol={assetSymbol}
          onCommentCreated={onCommentCreated}
          direction={editDirection}
          setDirection={setEditDirection}
          betAmount={user?.id ? editBetAmount : 0}
          setBetAmount={setEditBetAmount}
          userPoints={editAvailablePoints}
          maxBet={editMaxBet}
          currentUser={user}
          isMarketOpen={prediction.isMarketOpen}
          buttonDisabled={!canEditVote || prediction.isPending || isSavingVote}
          isPending={prediction.isPending || isSavingVote}
          isSubmitting={prediction.isSubmitting || isSavingVote}
          submitVote={() => {
            void saveEditedVote();
          }}
          targetMs={prediction.targetMs}
          countdownType={prediction.countdownType}
          showCountdown={prediction.showCountdown}
        />
      ) : prediction && showPredictionInput ? (
        <PredictionCommentInput
          key={`create:${commentContextKey}:${prediction.voteLookupKey}`}
          draft={draft}
          onDraftChange={setDraft}
          assetSymbol={assetSymbol}
          onCommentCreated={onCommentCreated}
          direction={direction}
          setDirection={setDirection}
          betAmount={user?.id ? prediction.betAmount : 0}
          setBetAmount={prediction.setBetAmount}
          userPoints={user?.id ? prediction.userPoints : 0}
          maxBet={maxBet}
          currentUser={user}
          isMarketOpen={prediction.isMarketOpen}
          buttonDisabled={
            !prediction.canVote ||
            prediction.isMarketOpen ||
            prediction.isPending ||
            isSavingVote
          }
          isPending={prediction.isPending || isSavingVote}
          isSubmitting={prediction.isSubmitting || isSavingVote}
          submitVote={submitVote}
          targetMs={prediction.targetMs}
          countdownType={prediction.countdownType}
          showCountdown={prediction.showCountdown}
        />
      ) : (
        <CommentOnlyInput
          key={commentContextKey}
          draft={draft}
          onDraftChange={setDraft}
          assetSymbol={assetSymbol}
          targetMs={prediction?.targetMs ?? null}
          countdownType={prediction?.countdownType ?? null}
          showCountdown={prediction?.showCountdown ?? false}
          isMarketOpen={prediction?.isMarketOpen ?? false}
          onCommentCreated={onCommentCreated}
          currentUser={user}
        />
      )}

      <div className="space-y-3">
        {commentsLoading ? (
          <div role="status" className="pt-4 text-center text-sm text-zinc-400">
            {labels.loading}
          </div>
        ) : comments.length === 0 ? (
          <div className="pt-4 text-center text-sm text-zinc-500">
            {labels.empty}
          </div>
        ) : (
          comments.map((comment, index) => {
            const previousComment = comments[index - 1];

            const isCurrentSession =
              currentSessionStartMs !== null &&
              new Date(comment.createdAt).getTime() >= currentSessionStartMs;

            const previousIsCurrentSession =
              currentSessionStartMs !== null &&
              previousComment !== undefined &&
              new Date(previousComment.createdAt).getTime() >=
                currentSessionStartMs;

            const showSessionBoundary =
              index > 0 && previousIsCurrentSession && !isCurrentSession;

            return (
              <div key={comment.id} className="dark:bg-zinc-900">
                {showSessionBoundary && (
                  <div
                    aria-hidden="true"
                    className="
                      mb-3  border-t border-dashed
                      border-zinc-200 dark:border-zinc-800
                    "
                  />
                )}

                <CommentItem
                  initialNowMs={nowMs}
                  comment={comment}
                  currentUser={user}
                  onUpdate={updateComment}
                  onRemove={removeComment}
                  targetCommentId={targetCommentId}
                  targetReplyId={targetReplyId}
                  shouldOpenReplies={
                    Boolean(targetReplyId) && targetCommentId === comment.id
                  }
                  highlightTargetComment={highlightTargetComment}
                  onPredictionEdited={(updatedPrediction) => {
                    if (activeCommentContextRef.current !== commentContextKey) {
                      return;
                    }

                    onPredictionEdited?.(updatedPrediction);
                  }}
                />
              </div>
            );
          })
        )}
      </div>

      {!commentsLoading && nextCursor && (
        <div className="flex h-20 items-center justify-center">
          <button
            type="button"
            disabled={isLoadingMore}
            aria-busy={isLoadingMore}
            onClick={() => {
              void loadMoreComments();
            }}
            className="
              cursor-pointer rounded-md px-4 py-2
              text-sm text-zinc-600
              hover:bg-zinc-100
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              disabled:cursor-wait disabled:opacity-50
              dark:text-zinc-400 dark:hover:bg-zinc-800
            "
          >
            {isLoadingMore ? labels.loading_more : loadMoreLabel}
          </button>
        </div>
      )}
    </section>
  );
}
