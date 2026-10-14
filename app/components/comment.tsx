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

import { useCurrentUser } from "@/app/context/user-context";
import type { PredictionDirection } from "@/generated/prisma/enums";

import { resolveLanguage } from "@/lib/data/languages";
import {
  COMMENT_ACTION_LABELS,
  COMMENT_VIEW_LABELS,
} from "@/lib/data/translations";

import { CommentOnlyInput } from "./comment-only-input";
import { PredictionCommentInput } from "./prediction-comment-input";
import type { GifResult } from "./gif-picker";
import { CommentItem } from "./comment-item";
import { getErrorMessage } from "@/lib/utils/get-error-message";

type CommentCursor = NonNullable<
  Awaited<ReturnType<typeof getMarketComments>>["nextCursor"]
>;

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

    targetMs: number | null;
    countdownType: "VOTING_OPENS" | "VOTING_CLOSES" | null;
    showCountdown: boolean;
  } | null;
}

export function MarketComments({
  assetSymbol,
  prediction,
  currentSessionStartMs,
}: MarketCommentsProps) {
  const user = useCurrentUser();
  const language = resolveLanguage(user?.language);
  const labels = COMMENT_VIEW_LABELS[language];
  const actionLabels = COMMENT_ACTION_LABELS[language];

  const searchParams = useSearchParams();

  const targetCommentId = searchParams.get("comment");
  const targetReplyId = searchParams.get("reply");

  const highlightTargetComment = Boolean(targetCommentId);

  const [direction, setDirection] = useState<PredictionDirection | null>(null);

  const [comments, setComments] = useState<MarketPageComments>([]);
  const [nextCursor, setNextCursor] = useState<CommentCursor | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);
  const requestVersionRef = useRef(0);
  const knownCommentIdsRef = useRef(new Set<string>());

  // Keep the latest fallback without refetching when language changes.
  const errorFallbackRef = useRef(labels.action_failed);
  errorFallbackRef.current = labels.action_failed;

  const viewerId = user?.id ?? null;

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

        if (!isCurrentRequest()) {
          return;
        }

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
        if (!isCurrentRequest()) {
          return;
        }

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
  }, [assetSymbol, currentSessionStartMs, viewerId]);

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

    setComments((current) => [comment, ...current]);
    setTotalCount((current) => current + 1);
  }, []);

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

  const submitVote = (comment: string, gif: GifResult | null) => {
    if (!prediction || prediction.isPending) {
      return;
    }

    if (!user) {
      toast.error(actionLabels.login_required);
      return;
    }

    if (prediction.isMarketOpen) {
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

    const { betAmount, userPoints, handleVote } = prediction;

    if (
      !Number.isInteger(betAmount) ||
      betAmount < 0 ||
      betAmount > 500 ||
      betAmount % 50 !== 0
    ) {
      toast.error(labels.invalid_bet);
      return;
    }

    if (betAmount > 0 && betAmount > userPoints) {
      toast.error(actionLabels.insufficient_points);
      return;
    }

    handleVote(direction, betAmount, comment, gif, addComment);
  };

  const hasAlreadyVoted = prediction?.selectedVote != null;
  const maxBet = prediction ? Math.min(500, prediction.userPoints) : 0;

  const showPredictionInput =
    prediction !== null && !hasAlreadyVoted && !prediction.isMarketOpen;

  return (
    <section className="w-full">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-[13px] text-zinc-600 dark:text-zinc-500">
          {labels.heading}
        </h2>

        <span className="jakarta text-sm text-zinc-500">
          {totalCount.toLocaleString(language)}
        </span>
      </div>

      {prediction && showPredictionInput ? (
        <PredictionCommentInput
          direction={direction}
          setDirection={setDirection}
          betAmount={prediction.betAmount}
          setBetAmount={prediction.setBetAmount}
          userPoints={prediction.userPoints}
          maxBet={maxBet}
          currentUser={user}
          isMarketOpen={prediction.isMarketOpen}
          buttonDisabled={prediction.isMarketOpen || prediction.isPending}
          submitVote={submitVote}
          targetMs={prediction.targetMs}
          countdownType={prediction.countdownType}
          showCountdown={prediction.showCountdown}
          isPending={prediction.isPending}
        />
      ) : (
        <CommentOnlyInput
          assetSymbol={assetSymbol}
          targetMs={prediction?.targetMs ?? null}
          countdownType={prediction?.countdownType ?? null}
          showCountdown={prediction?.showCountdown ?? false}
          isMarketOpen={prediction?.isMarketOpen ?? false}
          onCommentCreated={addComment}
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
