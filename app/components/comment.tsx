"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { JSONContent } from "@tiptap/react";
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
import {
  PredictionDirection,
  PredictionStatus,
} from "@/generated/prisma/enums";
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

  selectedVote: PredictionDirection | null;
  voteLoading: boolean;
  isMarketOpen: boolean;

  userPoints: number;

  betAmount: number;
  setBetAmount: React.Dispatch<React.SetStateAction<number>>;

  handleVote: (
    direction: PredictionDirection,
    betAmount: number,
    comment: string,
    gif: GifResult | null,
    onSuccess?: () => void | Promise<void>,
  ) => void;

  targetMs: number | null;
  countdownType: "VOTING_OPENS" | "VOTING_CLOSES" | null;
  showCountdown: boolean;

  initialComments: MarketPageComments;
}

export function MarketComments({
  assetSymbol,
  selectedVote,
  voteLoading,
  isMarketOpen,
  userPoints,
  handleVote,
  betAmount,
  setBetAmount,
  targetMs,
  countdownType,
  showCountdown,
  initialComments,
}: MarketCommentsProps) {
  const user = useCurrentUser();
  const searchParams = useSearchParams();

  const targetCommentId = searchParams.get("comment");
  const targetReplyId = searchParams.get("reply");

  const [direction, setDirection] = useState<PredictionDirection | null>(null);

  const [comments, setComments] = useState<MarketPageComments>(initialComments);

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  const loadComments = useCallback(async () => {
    try {
      const result = await getMarketComments(assetSymbol);

      setComments(result);
    } catch (error) {
      console.error("Failed to load comments:", error);
    }
  }, [assetSymbol]);

  const hasAlreadyVoted = selectedVote !== null;

  const maxBet = Math.min(500, userPoints);

  const buttonDisabled = voteLoading || isMarketOpen;

  const showPredictionInput = !voteLoading && !hasAlreadyVoted && !isMarketOpen;

  const submitVote = (comment: string, gif: GifResult | null) => {
    if (!user) {
      toast.error("Please log in to vote.");
      return;
    }

    if (!user.nationality) {
      toast.error("Please set your nationality before voting.");
      return;
    }

    if (buttonDisabled) return;

    if (!direction) {
      toast.error("Please choose Bull or Bear.");
      return;
    }

    if (betAmount < 50) {
      toast.error("Minimum prediction is 50 points.");
      return;
    }

    if (betAmount > maxBet) {
      toast.error(`You can predict up to ${maxBet.toLocaleString()} points.`);
      return;
    }

    if (!comment.trim() && !gif) {
      toast.error("Add a comment or GIF to submit.");
      return;
    }

    handleVote(direction, betAmount, comment, gif, loadComments);
  };

  return (
    <section className="w-full">
      <div className="mb-6 flex items-center gap-2">
        <h2 className="text-[13px] text-zinc-600 dark:text-zinc-500">
          Comment
        </h2>

        <span className="jakarta text-sm text-zinc-500">{comments.length}</span>
      </div>

      {showPredictionInput ? (
        <PredictionCommentInput
          direction={direction}
          setDirection={setDirection}
          betAmount={betAmount}
          setBetAmount={setBetAmount}
          userPoints={userPoints}
          maxBet={maxBet}
          currentUser={user}
          voteLoading={voteLoading}
          isMarketOpen={isMarketOpen}
          buttonDisabled={buttonDisabled}
          submitVote={submitVote}
          targetMs={targetMs}
          countdownType={countdownType}
          showCountdown={showCountdown}
        />
      ) : (
        <CommentOnlyInput
          assetSymbol={assetSymbol}
          targetMs={targetMs}
          countdownType={countdownType}
          showCountdown={showCountdown}
          isMarketOpen={isMarketOpen}
          onCommentCreated={loadComments}
          currentUser={user}
        />
      )}

      <div>
        {comments.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-500">
            No comments yet.
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUser={user}
              onRefresh={loadComments}
              targetCommentId={targetCommentId}
              targetReplyId={targetReplyId}
              shouldOpenReplies={
                Boolean(targetReplyId) && targetCommentId === comment.id
              }
            />
          ))
        )}
      </div>
    </section>
  );
}

interface Comment {
  id: string;

  content: JSONContent;

  createdAt: Date;
  updatedAt: Date;

  editedAt: Date | null;
  withdrawnAt: Date | null;
  moderatedAt: Date | null;

  author: {
    id: string;
    name: string | null;
    image: string | null;
    nationality: string | null;
  };

  prediction: {
    direction: PredictionDirection;
    pointsBet: number;
    status: PredictionStatus;
  } | null;

  likeCount: number;
  likedByMe: boolean;
  replyCount: number;
}

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
  onRefresh: () => Promise<void>;
}

function CommentItem({
  comment,
  currentUser,
  onRefresh,
  targetCommentId,
  targetReplyId,
  shouldOpenReplies,
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

  const isAdmin = currentUser?.role === "ADMIN";

  const isAuthor = currentUser?.id === comment.author.id;

  const replyCount = comment.replyCount;

  const username = comment.author.name ?? "Guest";

  const isDeletedPredictionComment =
    !!comment.prediction && isDeletedPredictionContent(comment.content);

  const canModify = isAuthor && !comment.withdrawnAt && !comment.moderatedAt;

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
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load replies.",
      );
    } finally {
      setRepliesLoading(false);
    }
  }, [comment.id, repliesLoading]);

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
        block: "center",
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

      await onRefresh();

      if (result.action === "ALREADY_CONTENT_REMOVED") {
        toast.info("Comment already deleted. Your prediction remains.");
        return;
      }

      if (result.action === "CONTENT_REMOVED") {
        toast.success("Comment deleted. Your prediction remains.");
        return;
      }

      toast.success("Comment deleted.");
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

      await hideComment(comment.id);

      await onRefresh();

      toast.success("Comment hidden.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to hide comment.",
      );
    } finally {
      setIsModerating(false);
    }
  };

  const handleRestoreComment = async () => {
    if (isModerating) return;

    try {
      setIsModerating(true);

      await restoreComment(comment.id);

      await onRefresh();

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
      toast.error("Please log in to like comments.");
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

  return (
    <div
      ref={commentRef}
      id={`comment-${comment.id}`}
      className="mb-6 scroll-mt-24"
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
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
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
                canModify={canModify}
                isAdmin={isAdmin}
                isModerated={Boolean(comment.moderatedAt)}
                isDeleting={isDeleting}
                isModerating={isModerating}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onHide={handleHideComment}
                onRestore={handleRestoreComment}
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
                onSaved={async () => {
                  setIsEditing(false);

                  await onRefresh();
                }}
              />
            ) : isDeletedPredictionComment ? (
              <p className="mt-1 text-[15px] italic text-zinc-400">
                Comment deleted by user
              </p>
            ) : (
              <div className="mt-0.5 flex items-baseline gap-1 lowercase">
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
                  onClick={() => setReplying((prev) => !prev)}
                  className="
                    text-sm font-medium text-zinc-500
                    hover:text-zinc-900
                    dark:hover:text-zinc-200
                  "
                >
                  Reply
                </button>
              </div>
            )}

            {!comment.moderatedAt && replying && (
              <ReplyInput
                commentId={comment.id}
                username={username}
                currentUser={currentUser}
                onCancel={() => setReplying(false)}
                onReplyCreated={async () => {
                  setReplying(false);
                  setShowReplies(true);

                  await loadReplies();

                  await onRefresh();
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
                    bg-white
                    px-2
                    text-sm font-semibold
                    text-zinc-600
                    hover:text-zinc-900
                    disabled:cursor-default
                    dark:bg-zinc-900
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
                          onReplyUpdated={async () => {
                            await loadReplies();
                          }}
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
