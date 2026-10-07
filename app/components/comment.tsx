"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { RiHeartFill } from "react-icons/ri";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { useCurrentUser } from "@/app/context/user-context";
import {
  deleteComment,
  getCommentReplies,
  getMarketComments,
  hideComment,
  MarketPageComments,
  reportComment,
  restoreComment,
} from "@/app/actions/post";

import { toast } from "sonner";

import { PredictionCommentInput } from "./prediction-comment-input";
import { CommentOnlyInput } from "./comment-only-input";
import type { GifResult } from "./gif-picker";

import { ReplyInput } from "./reply-input";
import { ContentActionsMenu } from "./content-actions-menu";
import { ReplyItem } from "./reply-item";
import { CommentEditInput } from "./comment-edit-input";

import { toggleCommentLike } from "../actions/like";
import { PredictionDirection } from "@/generated/prisma/enums";
import { useSearchParams } from "next/navigation";
import { isDeletedPredictionContent } from "@/lib/utils/is-deleted-prediction-content";
import { formatTimeAgo } from "@/lib/utils/format-time-ago";
import { CommentContent } from "./comment-content";

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

  prediction: {
    selectedVote: PredictionDirection | null;
    isMarketOpen: boolean;
    isPending: boolean;
    userPoints: number;

    betAmount: number;
    setBetAmount: React.Dispatch<React.SetStateAction<number>>;

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

  currentSessionStartMs: number | null;
}

export function MarketComments({
  assetSymbol,
  prediction,
  currentSessionStartMs,
}: MarketCommentsProps) {
  const user = useCurrentUser();
  const searchParams = useSearchParams();

  const targetCommentId = searchParams.get("comment");
  const targetReplyId = searchParams.get("reply");

  const from = searchParams.get("from");

  const highlightTargetComment =
    (from === "most-liked" || from === "report") && Boolean(targetCommentId);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // Prediction-only local state
  // ---------------------------------------------------------------------------

  const [direction, setDirection] = useState<PredictionDirection | null>(null);

  // ---------------------------------------------------------------------------
  // Comments state
  // ---------------------------------------------------------------------------

  const [comments, setComments] = useState<MarketPageComments>([]);

  const [nextCursor, setNextCursor] = useState<{
    createdAt: Date;
    id: string;
  } | null>(null);

  const [totalCount, setTotalCount] = useState(0);

  const [commentsLoading, setCommentsLoading] = useState(true);

  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // ---------------------------------------------------------------------------
  // LOAD MORE COMMENTS
  // ---------------------------------------------------------------------------

  const loadMoreComments = useCallback(async () => {
    if (!nextCursor || isLoadingMore) {
      return;
    }

    try {
      setIsLoadingMore(true);

      const minimumLoadingTime = new Promise((resolve) =>
        setTimeout(resolve, 1000),
      );

      const [result] = await Promise.all([
        getMarketComments(assetSymbol, nextCursor),
        minimumLoadingTime,
      ]);

      setComments((current) => {
        const existingIds = new Set(current.map((comment) => comment.id));

        const newComments = result.comments.filter(
          (comment) => !existingIds.has(comment.id),
        );

        return [...current, ...newComments];
      });

      setNextCursor(result.nextCursor);
    } catch (error) {
      console.error("Failed to load more comments:", error);

      toast.error("Failed to load more comments.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [assetSymbol, nextCursor, isLoadingMore]);

  // ---------------------------------------------------------------------------
  // UPDATE COMMENT
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // REMOVE COMMENT
  // ---------------------------------------------------------------------------

  const removeComment = useCallback((commentId: string) => {
    setComments((current) =>
      current.filter((comment) => comment.id !== commentId),
    );

    setTotalCount((current) => Math.max(0, current - 1));
  }, []);

  // ---------------------------------------------------------------------------
  // ADD COMMENT
  // ---------------------------------------------------------------------------

  const addComment = useCallback((comment: MarketPageComments[number]) => {
    setComments((current) => {
      if (current.some((existing) => existing.id === comment.id)) {
        return current;
      }

      setTotalCount((count) => count + 1);

      return [comment, ...current].slice(0, 20);
    });
  }, []);

  // ---------------------------------------------------------------------------
  // SUBMIT PREDICTION
  //
  // This function only does anything when prediction exists.
  // Non-prediction assets never enter prediction submission logic.
  // ---------------------------------------------------------------------------

  const submitVote = (comment: string, gif: GifResult | null) => {
    if (!prediction) {
      return;
    }

    if (!user) {
      toast.error("Log in to make your prediction.");
      return;
    }

    if (!user.nationality) {
      toast.error("Please set your nationality before voting.");
      return;
    }

    const {
      selectedVote,

      isMarketOpen,
      userPoints,
      betAmount,
      handleVote,
    } = prediction;

    const buttonDisabled = isMarketOpen;

    if (buttonDisabled) {
      return;
    }

    if (selectedVote !== null) {
      toast.error("You have already voted for this round.");
      return;
    }

    if (!direction) {
      toast.error("Please choose Bull or Bear.");
      return;
    }

    const maxBet = Math.min(500, userPoints);

    if (betAmount < 50) {
      toast.error("Minimum prediction is 50 points.");
      return;
    }

    if (betAmount > maxBet) {
      toast.error(`You can predict up to ${maxBet.toLocaleString()} points.`);

      return;
    }

    handleVote(direction, betAmount, comment, gif, addComment);
  };

  // ---------------------------------------------------------------------------
  // RESET COMMENTS WHEN SERVER DATA CHANGES
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadInitialComments() {
      setCommentsLoading(true);

      try {
        const result = await getMarketComments(assetSymbol);

        if (cancelled) return;

        setComments(result.comments);
        setNextCursor(result.nextCursor);
        setTotalCount(result.totalCount);
      } catch (error) {
        console.error("Failed to load comments:", error);

        if (!cancelled) {
          toast.error("Failed to load comments.");
        }
      } finally {
        if (!cancelled) {
          setCommentsLoading(false);
        }
      }
    }

    void loadInitialComments();

    return () => {
      cancelled = true;
    };
  }, [assetSymbol]);

  // ---------------------------------------------------------------------------
  // RESET LOCAL PREDICTION DIRECTION
  //
  // Important when navigating between assets without a full page reload.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    setDirection(null);
  }, [assetSymbol]);

  // ---------------------------------------------------------------------------
  // INFINITE SCROLL
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const element = loadMoreRef.current;

    if (!element || !nextCursor) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoadingMore) {
          void loadMoreComments();
        }
      },
      {
        root: null,
        rootMargin: "600px 0px",
        threshold: 0,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [nextCursor, isLoadingMore, loadMoreComments]);

  // ---------------------------------------------------------------------------
  // PREDICTION UI STATE
  //
  // Only calculate prediction-specific values when prediction exists.
  // ---------------------------------------------------------------------------

  const hasAlreadyVoted =
    prediction?.selectedVote !== null && prediction?.selectedVote !== undefined;

  const maxBet = prediction ? Math.min(500, prediction.userPoints) : 0;

  const buttonDisabled = prediction ? prediction.isMarketOpen : false;

  const showPredictionInput = prediction
    ? !hasAlreadyVoted && !prediction.isMarketOpen
    : false;

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <section className="w-full">
      {/* Comment count */}

      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-[13px] text-zinc-600 dark:text-zinc-500">
          Comment
        </h2>

        <span className="jakarta text-sm text-zinc-500">{totalCount}</span>
      </div>

      {/* --------------------------------------------------------------- */}
      {/* INPUT                                                           */}
      {/* --------------------------------------------------------------- */}

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
          buttonDisabled={buttonDisabled}
          submitVote={submitVote}
          targetMs={prediction.targetMs}
          countdownType={prediction.countdownType}
          showCountdown={prediction.showCountdown}
          isPending={prediction.isPending}
        />
      ) : (
        /*
         * Two cases use CommentOnlyInput:
         *
         * 1. Prediction asset:
         *    - already voted
         *    - market is open
         *    - prediction is loading
         *
         * 2. Non-prediction asset:
         *    - crypto
         *    - currency
         *    - commodity
         *    - etc.
         *
         * For case #2, all prediction-related values are neutral.
         */
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

      {/* --------------------------------------------------------------- */}
      {/* COMMENTS                                                        */}
      {/* --------------------------------------------------------------- */}

      <div className=" space-y-3">
        {commentsLoading ? (
          <div className=" text-center text-sm text-zinc-400 pt-4">
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          <div className=" text-center text-sm text-zinc-500 pt-4">
            No comments yet.
          </div>
        ) : (
          comments.map((comment, index) => {
            const previousComment = comments[index - 1];

            const isCurrentSession =
              currentSessionStartMs !== null &&
              new Date(comment.createdAt).getTime() >= currentSessionStartMs;

            const previousIsCurrentSession =
              currentSessionStartMs !== null &&
              previousComment != null &&
              new Date(previousComment.createdAt).getTime() >=
                currentSessionStartMs;

            const showSessionBoundary =
              index > 0 && previousIsCurrentSession && !isCurrentSession;

            return (
              <div key={comment.id} className=" dark:bg-zinc-900">
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

      {/* --------------------------------------------------------------- */}
      {/* INFINITE SCROLL                                                 */}
      {/* --------------------------------------------------------------- */}

      {nextCursor && (
        <div
          ref={loadMoreRef}
          className="flex h-20 items-center justify-center"
        >
          {isLoadingMore && (
            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-1">
                <span className="size-1 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />

                <span className="size-1 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />

                <span className="size-1 animate-bounce rounded-full bg-current" />
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// -----------------------------------------------------------------------------
// Everything below here stays exactly as it is in your current file.
// -----------------------------------------------------------------------------

type Comment = MarketPageComments[number];

export type CommentUser = {
  id: string;
  role?: string | null;
  image?: string | null;
  name?: string | null;
};

interface CommentItemProps {
  comment: Comment;
  currentUser: CommentUser | null;

  targetCommentId: string | null;
  targetReplyId: string | null;
  shouldOpenReplies: boolean;

  highlightTargetComment: boolean;

  onUpdate: (commentId: string, updater: (comment: Comment) => Comment) => void;

  onRemove: (commentId: string) => void;
}

function CommentItem({
  comment,
  currentUser,
  onUpdate,
  onRemove,
  targetCommentId,
  targetReplyId,
  shouldOpenReplies,
  highlightTargetComment,
}: CommentItemProps) {
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
  const username = comment.author.name ?? "Guest";
  const isHighlighted =
    highlightTargetComment && targetCommentId === comment.id;

  const isDeletedPredictionComment =
    !!comment.prediction && isDeletedPredictionContent(comment.content);

  // ---------------------------------------------------------------------------
  // REPLIES
  // ---------------------------------------------------------------------------

  const loadReplies = useCallback(async () => {
    if (repliesLoading) return;

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
      toast.error(
        error instanceof Error ? error.message : "Failed to load replies.",
      );
    } finally {
      setRepliesLoading(false);
    }
  }, [comment.id, repliesLoading, onUpdate]);

  const toggleReplies = async () => {
    if (!showReplies && !repliesLoaded) {
      await loadReplies();
    }

    setShowReplies((prev) => !prev);
  };

  // ---------------------------------------------------------------------------
  // THREAD EVENTS
  // ---------------------------------------------------------------------------

  const threadEvents = {
    onMouseEnter: () => setThreadHovered(true),

    onMouseLeave: () => setThreadHovered(false),

    onClick: toggleReplies,
  };

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!shouldOpenReplies) return;

    setShowReplies(true);

    if (!repliesLoaded) {
      void loadReplies();
    }
  }, [shouldOpenReplies, repliesLoaded, loadReplies]);

  useEffect(() => {
    if (targetCommentId !== comment.id) return;

    requestAnimationFrame(() => {
      commentRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [targetCommentId, comment.id]);

  useEffect(() => {
    setLikedByMe(comment.likedByMe);
    setLikeCount(comment.likeCount);
  }, [comment.likedByMe, comment.likeCount]);

  // ---------------------------------------------------------------------------
  // ACTIONS
  // ---------------------------------------------------------------------------

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleDelete = async () => {
    if (isDeleting) return;

    try {
      setIsDeleting(true);

      const result = await deleteComment(comment.id);

      if (result.action === "ALREADY_CONTENT_REMOVED") {
        onUpdate(comment.id, (current) => ({
          ...current,
          content: result.content,
          editedAt: null,
        }));

        toast.info("Comment already deleted. Your prediction remains.");

        return;
      }

      if (result.action === "CONTENT_REMOVED") {
        onUpdate(comment.id, (current) => ({
          ...current,
          content: result.content,
          editedAt: null,
        }));

        toast.success("Comment deleted. Your prediction remains.");

        return;
      }

      if (result.action === "DELETED") {
        onRemove(comment.id);

        toast.success("Comment deleted.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete comment.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleHideComment = async () => {
    if (isModerating) return;

    try {
      setIsModerating(true);

      const result = await hideComment(comment.id);

      onUpdate(comment.id, (current) => ({
        ...current,
        moderatedAt: result.moderatedAt,
      }));

      toast.success("Comment hidden.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to hide comment.",
      );
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
    if (isModerating) return;

    try {
      setIsModerating(true);

      await restoreComment(comment.id);

      onUpdate(comment.id, (current) => ({
        ...current,
        moderatedAt: null,
      }));

      toast.success("Comment restored.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to restore comment.",
      );
    } finally {
      setIsModerating(false);
    }
  };

  const handleCommentLike = () => {
    if (!currentUser) {
      toast.error("Log in to like comments.");
      return;
    }

    if (isLikePending) return;

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
      } catch (error) {
        setLikedByMe(previousLiked);
        setLikeCount(previousCount);

        toast.error(
          error instanceof Error ? error.message : "Could not update like.",
        );
      }
    });
  };

  const handleReportComment = async () => {
    if (isReporting) return;

    try {
      setIsReporting(true);

      const result = await reportComment(comment.id);

      if (result.success) {
        toast.success("Comment reported.", {
          description: "Thank you. An administrator will review it.",
        });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to report comment.",
      );
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <div
      ref={commentRef}
      id={`comment-${comment.id}`}
      className={`
    relative scroll-mt-0
    py-2
    rounded-xl
    transition-colors duration-700

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
              : "G"}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="group/comment relative min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-semibold">{username}</span>

              {comment.prediction && (
                <div className="flex items-center gap-2">
                  <span
                    className={`
                      rounded-full px-2 py-0.5
                      text-[11px] font-medium
                      ${
                        comment.prediction.direction === "BULL"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-[#cf0000]/8 dark:bg-[#c10303]/20 text-[#c10303] dark:text-[#ec5a5a]"
                      }
                    `}
                  >
                    {comment.prediction.direction === "BULL"
                      ? "Bullish"
                      : "Bearish"}
                  </span>
                </div>
              )}

              <span className="text-[13px] text-zinc-500">
                {formatTimeAgo(comment.createdAt)}
              </span>

              <ContentActionsMenu
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
                Comment hidden by moderation
              </p>
            ) : isEditing ? (
              <CommentEditInput
                commentId={comment.id}
                initialContent={
                  isDeletedPredictionComment
                    ? {
                        type: "doc",
                        content: [
                          {
                            type: "paragraph",
                          },
                        ],
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
                Comment deleted by user
              </p>
            ) : (
              <div className="mt-0.5 flex items-baseline gap-1">
                <CommentContent content={comment.content} />

                {comment.editedAt && (
                  <span className="text-[12px] text-zinc-400">(edited)</span>
                )}
              </div>
            )}

            {!comment.moderatedAt && (
              <div className="mt-2 flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleCommentLike}
                  disabled={isLikePending}
                  aria-label={likedByMe ? "Unlike comment" : "Like comment"}
                  aria-pressed={likedByMe}
                  className="
                    flex cursor-pointer items-center gap-1.5
                    text-sm text-zinc-500
                    transition-colors
                    hover:text-zinc-900
                    disabled:cursor-default
                    dark:text-zinc-400
                    dark:hover:text-zinc-100
                  "
                >
                  <RiHeartFill
                    className={`h-4 w-4 ${
                      likedByMe
                        ? "fill-current text-zinc-900 dark:text-zinc-100"
                        : ""
                    }`}
                  />

                  {likeCount > 0 && <span>{likeCount}</span>}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!currentUser) {
                      toast.error("You must log in to reply.");
                      return;
                    }

                    setReplying((prev) => !prev);
                  }}
                  className="
    text-sm font-medium text-zinc-500
    hover:text-zinc-900
    dark:hover:text-zinc-200
    cursor-pointer
  "
                >
                  Reply
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
                aria-label={showReplies ? "Collapse replies" : "Show replies"}
                {...threadEvents}
                className="
                  absolute
                  -left-9.5
                  top-9
                  -bottom-2
                  z-0
                  w-5
                  cursor-pointer
                "
              >
                <span
                  className={`
                    pointer-events-none
                    absolute
                    left-2
                    top-0
                    bottom-0
                    w-px
                    transition-colors

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
                aria-label="Show replies"
                {...threadEvents}
                className="
                    absolute
                    -left-9.5
                    -top-3
                    z-0
                    h-6
                    w-10
                    cursor-pointer
                  "
              >
                <span
                  className={`
                      pointer-events-none
                      absolute
                      left-2
                      top-0
                      h-6
                      w-8
                      rounded-bl-xl
                      border-b border-l
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
                    -translate-x-2
                    flex items-center gap-2
                    rounded-xl
                    cursor-pointer
                  
                    px-2
                    text-sm font-semibold
                    text-zinc-600
                    hover:text-zinc-900
                    disabled:cursor-default
                
                    dark:text-zinc-400
                    dark:hover:text-zinc-200
                  "
              >
                <ChevronDown className="size-4" />

                {repliesLoading
                  ? "Loading..."
                  : `${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
              </button>
            </div>
          )}

          {showReplies && repliesLoading && (
            <div className="py-3 text-sm text-zinc-400">Loading replies...</div>
          )}

          {showReplies && !repliesLoading && replies.length > 0 && (
            <div className="relative mt-4 pb-3">
              <button
                type="button"
                aria-label="Collapse replies"
                {...threadEvents}
                className="
                    absolute
                    -left-9.5
                    -top-18
                    z-20
                    h-16
                    w-5
                    cursor-pointer
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
                          aria-label="Collapse replies"
                          {...threadEvents}
                          className={`
                                absolute
                                -left-9.5
                                -top-6
                                z-0
                                w-5
                                cursor-pointer

                                ${isLastReply ? "h-7" : "-bottom-1"}
                              `}
                        >
                          <span
                            className={`
                                  pointer-events-none
                                  absolute
                                  left-2
                                  top-0
                                  bottom-0
                                  w-px
                                  transition-colors

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
                          aria-label="Collapse replies"
                          {...threadEvents}
                          className="
                                absolute
                                -left-9.5
                                top-0
                                z-0
                                h-4
                                w-10
                                cursor-pointer
                              "
                        >
                          <span
                            className={`
                                  pointer-events-none
                                  absolute
                                  left-2
                                  top-0
                                  h-4
                                  w-8
                                  rounded-bl-xl
                                  border-b border-l
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
