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

import { getMarketComments, type MarketPageComments } from "@/app/actions/post";

import type {
  getMarketVote,
  updateMarketVote,
} from "@/app/actions/market-vote";

import { useCurrentUser } from "@/app/context/user-context";

import type { PredictionDirection } from "@/generated/prisma/enums";

import { resolveLanguage } from "@/lib/data/languages";
import {
  COMMENT_ACTION_LABELS,
  COMMENT_VIEW_LABELS,
  VOTE_LABELS,
} from "@/lib/data/translations";
import { getErrorMessage } from "@/lib/utils/get-error-message";

import { CommentOnlyInput } from "./comment-only-input";
import { PredictionCommentInput } from "./prediction-comment-input";
import { CommentItem } from "./comment-item";
import type { GifResult } from "./gif-picker";

type CommentCursor = NonNullable<
  Awaited<ReturnType<typeof getMarketComments>>["nextCursor"]
>;

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
  assetSymbol: string;
  currentSessionStartMs: number | null;

  prediction: {
    selectedVote: PredictionDirection | null;
    selectedPointsBet: number;
    selectedVoteStatus: VoteStatus | null;

    canVote: boolean;
    voteLookupKey: string;

    isMarketOpen: boolean;
    isPending: boolean;

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

export function MarketComments({
  assetSymbol,
  prediction,
  currentSessionStartMs,
  onPredictionEdited,
}: MarketCommentsProps) {
  const user = useCurrentUser();

  const language = resolveLanguage(user?.language);
  const labels = COMMENT_VIEW_LABELS[language];
  const actionLabels = COMMENT_ACTION_LABELS[language];
  const voteLabels = VOTE_LABELS[language];

  const searchParams = useSearchParams();
  const targetCommentId = searchParams.get("comment");
  const targetReplyId = searchParams.get("reply");
  const highlightTargetComment = Boolean(targetCommentId);

  const viewerId = user?.id ?? null;

  const [direction, setDirection] = useState<PredictionDirection | null>(null);

  const [editingVoteKey, setEditingVoteKey] = useState<string | null>(null);

  const [editDirection, setEditDirection] =
    useState<PredictionDirection | null>(null);

  const [editBetAmount, setEditBetAmount] = useState(0);
  const [isSavingVote, setIsSavingVote] = useState(false);

  const savingVoteRef = useRef(false);
  const mountedRef = useRef(false);

  const [comments, setComments] = useState<MarketPageComments>([]);
  const [nextCursor, setNextCursor] = useState<CommentCursor | null>(null);

  const [totalCount, setTotalCount] = useState(0);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [commentsRefreshVersion, setCommentsRefreshVersion] = useState(0);

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);
  const requestVersionRef = useRef(0);
  const knownCommentIdsRef = useRef(new Set<string>());

  const errorFallbackRef = useRef(labels.action_failed);
  errorFallbackRef.current = labels.action_failed;

  const commentContextKey = JSON.stringify([
    assetSymbol,
    viewerId,
    currentSessionStartMs,
  ]);

  const activeCommentContextRef = useRef(commentContextKey);

  const activeVoteLookupKeyRef = useRef<string | null>(
    prediction?.voteLookupKey ?? null,
  );

  activeVoteLookupKeyRef.current = prediction?.voteLookupKey ?? null;

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

  // Refreshing after a vote edit reloads the first page so
  // prediction badges come from the latest server data.
  useEffect(() => {
    const requestVersion = ++requestVersionRef.current;
    let cancelled = false;

    loadingMoreRef.current = false;
    knownCommentIdsRef.current.clear();

    setDirection(null);
    setComments([]);
    setNextCursor(null);
    setTotalCount(0);
    setCommentsLoading(true);
    setIsLoadingMore(false);

    const isCurrentRequest = () =>
      !cancelled && requestVersionRef.current === requestVersion;

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

      if (requestVersionRef.current !== requestVersion) return;

      for (const comment of result.comments) {
        knownCommentIdsRef.current.add(comment.id);
      }

      setComments((current) => {
        const existingIds = new Set(current.map((comment) => comment.id));

        return [
          ...current,
          ...result.comments.filter((comment) => !existingIds.has(comment.id)),
        ];
      });

      setNextCursor(result.nextCursor);
    } catch (error) {
      if (requestVersionRef.current !== requestVersion) return;

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
    if (!knownCommentIdsRef.current.delete(commentId)) return;

    setComments((current) =>
      current.filter((comment) => comment.id !== commentId),
    );

    setTotalCount((current) => Math.max(0, current - 1));
  }, []);

  const addComment = useCallback((comment: MarketPageComments[number]) => {
    if (knownCommentIdsRef.current.has(comment.id)) return;

    knownCommentIdsRef.current.add(comment.id);
    setComments((current) => [comment, ...current]);
    setTotalCount((current) => current + 1);
  }, []);

  const onCommentCreated = useCallback(
    (comment: MarketPageComments[number]) => {
      if (activeCommentContextRef.current !== commentContextKey) {
        return;
      }

      addComment(comment);
    },
    [commentContextKey, addComment],
  );

  useEffect(() => {
    const element = loadMoreRef.current;

    if (!element || !nextCursor || commentsLoading || isLoadingMore) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void loadMoreComments();
        }
      },
      {
        rootMargin: "600px 0px",
        threshold: 0,
      },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [nextCursor, commentsLoading, isLoadingMore, loadMoreComments]);

  const hasAlreadyVoted = prediction?.selectedVote != null;

  // Members edit predictions through their linked comment.
  // Guests keep the standalone vote editor.
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

  // Discard edit mode when the voter/session changes or voting closes.
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

  // Initial prediction submission only.
  const submitVote = (comment: string, gif: GifResult | null) => {
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
  };

  const startEditingVote = () => {
    if (
      !prediction ||
      !canEditVote ||
      prediction.isPending ||
      savingVoteRef.current
    ) {
      return;
    }

    setEditDirection(prediction.selectedVote);
    setEditBetAmount(user?.id ? prediction.selectedPointsBet : 0);
    setEditingVoteKey(prediction.voteLookupKey);
  };

  const cancelEditingVote = () => {
    if (savingVoteRef.current) return;

    setEditingVoteKey(null);
    setEditDirection(null);
    setEditBetAmount(0);
  };

  const saveEditedVote = async () => {
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

      // Invalidate in-flight comment requests immediately.
      requestVersionRef.current += 1;

      // Reload server data to update linked prediction badges.
      setCommentsRefreshVersion((value) => value + 1);
    } catch (error) {
      // The parent handles normal action errors and returns null.
      // This catches unexpected failures.
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
  };

  return (
    <section className="w-full">
      <div className="mb-3 flex items-center gap-1 text-[13px] text-zinc-600  dark:text-zinc-400">
        <h2 className="">{labels.heading}</h2>

        <span className="">{totalCount.toLocaleString(language)}</span>
      </div>

      {/* Edit an existing prediction */}
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
          assetSymbol={assetSymbol}
          onCommentCreated={onCommentCreated}
          direction={direction}
          setDirection={setDirection}
          betAmount={user?.id ? prediction.betAmount : 0}
          userPoints={user?.id ? prediction.userPoints : 0}
          setBetAmount={prediction.setBetAmount}
          maxBet={maxBet}
          currentUser={user}
          isMarketOpen={prediction.isMarketOpen}
          buttonDisabled={
            !prediction.canVote ||
            prediction.isMarketOpen ||
            prediction.isPending ||
            isSavingVote
          }
          submitVote={submitVote}
          targetMs={prediction.targetMs}
          countdownType={prediction.countdownType}
          showCountdown={prediction.showCountdown}
          isPending={prediction.isPending || isSavingVote}
        />
      ) : (
        <CommentOnlyInput
          key={commentContextKey}
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
          <div className="pt-4 text-center text-sm text-zinc-400">
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
                  <div className="mb-4 border-t border-dashed border-zinc-200 dark:border-zinc-800" />
                )}

                <CommentItem
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
                    // Ignore a save callback from a previous viewer or market session.
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
        <div
          ref={loadMoreRef}
          className="flex h-20 items-center justify-center"
        >
          {isLoadingMore && (
            <div
              role="status"
              className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400"
            >
              <span className="sr-only">{labels.loading_more}</span>

              <span
                aria-hidden="true"
                className="size-1 animate-bounce rounded-full bg-current [animation-delay:-0.3s]"
              />

              <span
                aria-hidden="true"
                className="size-1 animate-bounce rounded-full bg-current [animation-delay:-0.15s]"
              />

              <span
                aria-hidden="true"
                className="size-1 animate-bounce rounded-full bg-current"
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
