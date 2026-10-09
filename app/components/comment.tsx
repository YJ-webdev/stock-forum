"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type Dispatch,
  type SetStateAction,
} from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { RiHeartFill } from "react-icons/ri";
import { toast } from "sonner";

import {
  deleteComment,
  getCommentReplies,
  getMarketComments,
  hideComment,
  reportComment,
  restoreComment,
  type MarketPageComments,
} from "@/app/actions/post";

import { toggleCommentLike } from "@/app/actions/like";
import { useCurrentUser } from "@/app/context/user-context";
import type { PredictionDirection } from "@/generated/prisma/enums";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { resolveLanguage } from "@/lib/data/languages";
import {
  COMMENT_ACTION_LABELS,
  COMMENT_VIEW_LABELS,
  CONTENT_ACTION_LABELS,
  CONTENT_RESULT_LABELS,
  CONTENT_STATUS_LABELS,
} from "@/lib/data/translations";

import { isDeletedPredictionContent } from "@/lib/utils/is-deleted-prediction-content";

import { CommentContent } from "./comment-content";
import { CommentEditInput } from "./comment-edit-input";
import { CommentOnlyInput } from "./comment-only-input";
import { ContentActionsMenu } from "./content-actions-menu";
import { PredictionCommentInput } from "./prediction-comment-input";
import { ReplyInput } from "./reply-input";
import { ReplyItem } from "./reply-item";
import type { GifResult } from "./gif-picker";

type ResolvedLanguage = ReturnType<typeof resolveLanguage>;

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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function formatCommentTime(date: Date | string, language: ResolvedLanguage) {
  const value = new Date(date);
  const timestamp = value.getTime();

  if (!Number.isFinite(timestamp)) {
    return "";
  }

  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));

  const formatter = new Intl.RelativeTimeFormat(language, {
    numeric: "auto",
    style: "short",
  });

  if (seconds < 60) {
    return formatter.format(-seconds, "second");
  }

  if (seconds < 3600) {
    return formatter.format(-Math.floor(seconds / 60), "minute");
  }

  if (seconds < 86400) {
    return formatter.format(-Math.floor(seconds / 3600), "hour");
  }

  const days = Math.floor(seconds / 86400);

  if (days < 7) {
    return formatter.format(-days, "day");
  }

  return new Intl.DateTimeFormat(language, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(value);
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
  const from = searchParams.get("from");

  const highlightTargetComment =
    Boolean(targetCommentId) && (from === "most-liked" || from === "report");

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

    if (!user.nationality) {
      toast.error(actionLabels.nationality_required);
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
      (betAmount !== 0 && (betAmount < 50 || betAmount > 500))
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
                  <div className="mb-2 border-t border-dashed border-zinc-200 dark:border-zinc-800" />
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

type Comment = MarketPageComments[number];

export type CommentUser = {
  id: string;
  role?: string | null;
  image?: string | null;
  name?: string | null;
  language?: string | null;
};

export interface CommentItemProps {
  marketname?: string | null;
  marketSymbol?: string | null;
  comment: Comment;
  currentUser: CommentUser | null;

  targetCommentId: string | null;
  targetReplyId: string | null;
  shouldOpenReplies: boolean;
  highlightTargetComment: boolean;

  onUpdate: (commentId: string, updater: (comment: Comment) => Comment) => void;

  onRemove: (commentId: string) => void;
}

export function CommentItem({
  comment,
  currentUser,
  onUpdate,
  onRemove,
  targetCommentId,
  targetReplyId,
  shouldOpenReplies,
  highlightTargetComment,
  marketname,
  marketSymbol,
}: CommentItemProps) {
  const language = resolveLanguage(currentUser?.language);
  const labels = COMMENT_VIEW_LABELS[language];
  const actionLabels = COMMENT_ACTION_LABELS[language];
  const menuLabels = CONTENT_ACTION_LABELS[language];
  const resultLabels = CONTENT_RESULT_LABELS[language];
  const statusLabels = CONTENT_STATUS_LABELS[language];

  const commentRef = useRef<HTMLDivElement>(null);

  const [likedByMe, setLikedByMe] = useState(comment.likedByMe);
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const [isLikePending, startLikeTransition] = useTransition();

  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<MarketReply[]>([]);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [repliesLoading, setRepliesLoading] = useState(false);

  const [threadHovered, setThreadHovered] = useState(false);
  const [replying, setReplying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isModerating, setIsModerating] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  const isAdmin = currentUser?.role === "ADMIN";
  const isAuthor = currentUser?.id === comment.author.id;
  const replyCount = comment.replyCount;
  const username = comment.author.name ?? labels.guest;

  const isHighlighted =
    highlightTargetComment && targetCommentId === comment.id;

  const isDeletedPredictionComment =
    !!comment.prediction && isDeletedPredictionContent(comment.content);

  const loadReplies = useCallback(async () => {
    if (repliesLoading) {
      return;
    }

    try {
      setRepliesLoading(true);

      const result = await getCommentReplies(comment.id);

      setReplies(result);
      setRepliesLoaded(true);

      onUpdate(comment.id, (current) => ({
        ...current,
        replyCount: result.length,
      }));
    } catch (error) {
      toast.error(getErrorMessage(error, labels.action_failed));
    } finally {
      setRepliesLoading(false);
    }
  }, [comment.id, repliesLoading, onUpdate, labels.action_failed]);

  const toggleReplies = async () => {
    if (!showReplies && !repliesLoaded) {
      await loadReplies();
    }

    setShowReplies((previous) => !previous);
  };

  const threadEvents = {
    onMouseEnter: () => setThreadHovered(true),
    onMouseLeave: () => setThreadHovered(false),
    onClick: toggleReplies,
  };

  useEffect(() => {
    if (!shouldOpenReplies) {
      return;
    }

    setShowReplies(true);

    if (!repliesLoaded) {
      void loadReplies();
    }
  }, [shouldOpenReplies, repliesLoaded, loadReplies]);

  useEffect(() => {
    if (targetCommentId !== comment.id) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      commentRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [targetCommentId, comment.id]);

  useEffect(() => {
    setLikedByMe(comment.likedByMe);
    setLikeCount(comment.likeCount);
  }, [comment.likedByMe, comment.likeCount]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleDelete = async () => {
    if (isDeleting) {
      return;
    }

    try {
      setIsDeleting(true);

      const result = await deleteComment(comment.id);

      if (
        result.action === "ALREADY_CONTENT_REMOVED" ||
        result.action === "CONTENT_REMOVED"
      ) {
        onUpdate(comment.id, (current) => ({
          ...current,
          content: result.content,
          editedAt: null,
        }));

        const options = {
          description: labels.prediction_remains,
        };

        if (result.action === "ALREADY_CONTENT_REMOVED") {
          toast.info(resultLabels.deleted, options);
        } else {
          toast.success(resultLabels.deleted, options);
        }

        return;
      }

      if (result.action === "DELETED") {
        onRemove(comment.id);
        toast.success(resultLabels.deleted);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, labels.action_failed));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleHideComment = async () => {
    if (isModerating) {
      return;
    }

    try {
      setIsModerating(true);

      const result = await hideComment(comment.id);

      onUpdate(comment.id, (current) => ({
        ...current,
        moderatedAt: result.moderatedAt,
      }));

      toast.success(resultLabels.hidden);
    } catch (error) {
      toast.error(getErrorMessage(error, labels.action_failed));
    } finally {
      setIsModerating(false);
    }
  };

  const handleReplyCreated = (newReply: MarketReply) => {
    setReplies((current) => [...current, newReply]);

    onUpdate(comment.id, (current) => ({
      ...current,
      replyCount: current.replyCount + 1,
    }));
  };

  const handleRestoreComment = async () => {
    if (isModerating) {
      return;
    }

    try {
      setIsModerating(true);

      await restoreComment(comment.id);

      onUpdate(comment.id, (current) => ({
        ...current,
        moderatedAt: null,
      }));

      toast.success(resultLabels.restored);
    } catch (error) {
      toast.error(getErrorMessage(error, labels.action_failed));
    } finally {
      setIsModerating(false);
    }
  };

  const handleCommentLike = () => {
    if (!currentUser) {
      toast.error(actionLabels.login_required);
      return;
    }

    if (isLikePending) {
      return;
    }

    const previousLiked = likedByMe;
    const previousCount = likeCount;

    setLikedByMe(!previousLiked);

    setLikeCount((count) =>
      previousLiked ? Math.max(0, count - 1) : count + 1,
    );

    startLikeTransition(async () => {
      try {
        const result = await toggleCommentLike(comment.id);

        setLikedByMe(result.liked);
        setLikeCount(result.likeCount);

        toast.success(result.liked ? labels.like : labels.unlike);
      } catch (error) {
        setLikedByMe(previousLiked);
        setLikeCount(previousCount);

        toast.error(getErrorMessage(error, labels.action_failed));
      }
    });
  };

  const handleReportComment = async () => {
    if (isReporting) {
      return;
    }

    if (!currentUser) {
      toast.error(actionLabels.login_required);
      return;
    }

    try {
      setIsReporting(true);

      const result = await reportComment(comment.id);

      if (result.success) {
        toast.success(resultLabels.reported);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, labels.action_failed));
    } finally {
      setIsReporting(false);
    }
  };

  const replyCountLabel = labels.reply_count.replace(
    "{count}",
    replyCount.toLocaleString(language),
  );

  return (
    <div
      ref={commentRef}
      id={`comment-${comment.id}`}
      className={`
      relative -mx-4 -my-3 scroll-mt-0 px-4 py-4
      transition-colors
      hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50
      ${isHighlighted ? "bg-amber-50/80 dark:bg-amber-950/20" : ""}
    `}
    >
      <div className="z-1 flex gap-3">
        <Avatar className="size-9 shrink-0">
          <AvatarImage
            src={comment.author.image ?? undefined}
            alt={username}
            className="object-cover"
          />

          <AvatarFallback className="text-sm">
            {comment.author.name
              ? comment.author.name.slice(0, 2).toUpperCase()
              : labels.guest.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="group/comment relative min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-semibold">{username}</span>

              {marketname && marketSymbol && (
                <Link
                  href={`/market/${encodeURIComponent(marketSymbol)}`}
                  className="flex items-center gap-2"
                >
                  <span
                    className="
                    rounded-full border border-zinc-400
                    px-2 py-0.5 text-[11px] font-medium
                    text-zinc-800
                    dark:border-zinc-600 dark:text-zinc-200
                  "
                  >
                    {marketname}
                  </span>
                </Link>
              )}

              {comment.prediction && (
                <div className="flex items-center gap-2">
                  <span
                    className={`
                    rounded-full border-[0.5px] px-2 py-0.5
                    text-[11px] font-medium
                    ${
                      comment.prediction.direction === "BULL"
                        ? "border-emerald-600/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-[#cf0000]/50 bg-[#cf0000]/8 text-[#c10303] dark:bg-[#c10303]/20 dark:text-[#ec5a5a]"
                    }
                  `}
                  >
                    {comment.prediction.direction === "BULL"
                      ? labels.bullish
                      : labels.bearish}
                  </span>
                </div>
              )}

              <span className="text-[13px] text-zinc-500">
                {formatCommentTime(comment.createdAt, language)}
              </span>

              <ContentActionsMenu
                language={currentUser?.language}
                isAdmin={isAdmin}
                isAuthor={isAuthor}
                isModerated={Boolean(comment.moderatedAt)}
                isDeleting={isDeleting}
                isReporting={isReporting}
                isModerating={isModerating}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onHide={handleHideComment}
                onRestore={handleRestoreComment}
                onReport={handleReportComment}
                hoverGroup="comment"
              />
            </div>

            {comment.moderatedAt ? (
              <p className="mt-1 text-[15px] italic text-zinc-400">
                {labels.hidden_comment}
              </p>
            ) : isEditing ? (
              <CommentEditInput
                commentId={comment.id}
                initialContent={
                  isDeletedPredictionComment
                    ? {
                        type: "doc",
                        content: [{ type: "paragraph" }],
                      }
                    : comment.content
                }
                onCancel={() => setIsEditing(false)}
                onSaved={(result) => {
                  setIsEditing(false);

                  onUpdate(comment.id, (current) => ({
                    ...current,
                    content: result.content,
                    editedAt: result.editedAt,
                  }));
                }}
              />
            ) : isDeletedPredictionComment ? (
              <p className="mt-1 text-[15px] italic text-zinc-400">
                {statusLabels.deleted_comment}
              </p>
            ) : (
              <div className="mt-0.5 flex items-baseline gap-1">
                <CommentContent content={comment.content} />

                {comment.editedAt && (
                  <span className="text-[12px] text-zinc-400">
                    {labels.edited}
                  </span>
                )}
              </div>
            )}

            {!comment.moderatedAt && (
              <div className="mt-2 flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleCommentLike}
                  disabled={isLikePending}
                  aria-label={likedByMe ? labels.unlike : labels.like}
                  title={likedByMe ? labels.unlike : labels.like}
                  aria-pressed={likedByMe}
                  className="
                  flex cursor-pointer items-center gap-1.5
                  text-sm text-zinc-400 transition-colors
                  hover:text-zinc-900
                  disabled:cursor-default
                  dark:text-zinc-500 dark:hover:text-zinc-100
                "
                >
                  <RiHeartFill
                    aria-hidden="true"
                    className={`size-4 ${
                      likedByMe
                        ? "fill-current text-zinc-900 dark:text-zinc-100"
                        : ""
                    }`}
                  />

                  {likeCount > 0 && (
                    <span className="text-zinc-800 dark:text-zinc-200">
                      {likeCount.toLocaleString(language)}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!currentUser) {
                      toast.error(actionLabels.login_required);
                      return;
                    }

                    setReplying((previous) => !previous);
                  }}
                  className="
                  cursor-pointer text-sm font-medium text-zinc-400
                  hover:text-zinc-900
                  dark:text-zinc-500 dark:hover:text-zinc-200
                "
                >
                  {labels.reply}
                </button>
              </div>
            )}

            {!comment.moderatedAt && replying && (
              <ReplyInput
                commentId={comment.id}
                parentId={null}
                username={username}
                currentUser={currentUser}
                onCancel={() => setReplying(false)}
                onReplyCreated={(newReply) => {
                  setReplying(false);
                  setShowReplies(true);
                  handleReplyCreated(newReply);
                }}
              />
            )}

            {replyCount > 0 && (
              <button
                type="button"
                aria-label={
                  showReplies ? labels.collapse_replies : labels.show_replies
                }
                {...threadEvents}
                className="
                absolute -left-9.5 top-9 -bottom-2 z-0
                w-5 cursor-pointer
              "
              >
                <span
                  className={`
                  pointer-events-none absolute
                  left-2 top-0 bottom-0 w-px transition-colors
                  ${
                    threadHovered
                      ? "bg-zinc-400 dark:bg-zinc-500"
                      : "bg-zinc-200 dark:bg-zinc-700"
                  }
                `}
                />
              </button>
            )}
          </div>

          {replyCount > 0 && !showReplies && (
            <div className="relative mt-5">
              <button
                type="button"
                aria-label={labels.show_replies}
                {...threadEvents}
                className="
                absolute -left-9.5 -top-3 z-0
                h-6 w-10 cursor-pointer
              "
              >
                <span
                  className={`
                  pointer-events-none absolute left-2 top-0
                  h-6 w-8 rounded-bl-xl border-b border-l
                  transition-colors
                  ${
                    threadHovered
                      ? "border-zinc-400 dark:border-zinc-500"
                      : "border-zinc-200 dark:border-zinc-700"
                  }
                `}
                />
              </button>

              <button
                type="button"
                onClick={toggleReplies}
                disabled={repliesLoading}
                className="
                flex -translate-x-2 cursor-pointer items-center gap-2
                rounded-xl px-2 text-sm font-semibold text-zinc-600
                hover:text-zinc-900 disabled:cursor-default
                dark:text-zinc-400 dark:hover:text-zinc-200
              "
              >
                <ChevronDown className="size-4" aria-hidden="true" />

                {repliesLoading ? labels.loading_replies : replyCountLabel}
              </button>
            </div>
          )}

          {showReplies && repliesLoading && (
            <div className="py-3 text-sm text-zinc-400">
              {labels.loading_replies}
            </div>
          )}

          {showReplies && !repliesLoading && replies.length > 0 && (
            <div className="relative mt-4 pb-3">
              <button
                type="button"
                aria-label={labels.collapse_replies}
                {...threadEvents}
                className="
                absolute -left-9.5 -top-18 z-20
                h-16 w-5 cursor-pointer
              "
              />

              <div className="space-y-6 py-3 pl-0">
                {replies
                  .filter((reply) => reply.parentId === null)
                  .map((reply, index, rootReplies) => {
                    const isLastReply = index === rootReplies.length - 1;

                    return (
                      <div key={reply.id} className="relative">
                        <button
                          type="button"
                          aria-label={labels.collapse_replies}
                          {...threadEvents}
                          className={`
                          absolute -left-9.5 -top-6 z-0
                          w-5 cursor-pointer
                          ${isLastReply ? "h-7" : "-bottom-1"}
                        `}
                        >
                          <span
                            className={`
                            pointer-events-none absolute
                            left-2 top-0 bottom-0 w-px transition-colors
                            ${
                              threadHovered
                                ? "bg-zinc-400 dark:bg-zinc-500"
                                : "bg-zinc-200 dark:bg-zinc-700"
                            }
                          `}
                          />
                        </button>

                        <button
                          type="button"
                          aria-label={labels.collapse_replies}
                          {...threadEvents}
                          className="
                          absolute -left-9.5 top-0 z-0
                          h-4 w-10 cursor-pointer
                        "
                        >
                          <span
                            className={`
                            pointer-events-none absolute left-2 top-0
                            h-4 w-8 rounded-bl-xl border-b border-l
                            transition-colors
                            ${
                              threadHovered
                                ? "border-zinc-400 dark:border-zinc-500"
                                : "border-zinc-200 dark:border-zinc-700"
                            }
                          `}
                          />
                        </button>

                        <ReplyItem
                          reply={reply}
                          replies={replies}
                          currentUser={currentUser}
                          onReplyUpdated={loadReplies}
                          onReplyCreated={handleReplyCreated}
                          depth={0}
                          targetReplyId={targetReplyId}
                        />
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
