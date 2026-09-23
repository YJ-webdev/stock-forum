"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import type { JSONContent } from "@tiptap/react";
import { ChevronDown } from "lucide-react";
import { RiHeartFill } from "react-icons/ri";

import { useCurrentUser } from "@/app/context/user-context";
import {
  deleteComment,
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

interface MarketComment {
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

  replies: MarketReply[];

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

// -----------------------------------------------------------------------------
// MARKET COMMENTS
// -----------------------------------------------------------------------------
function findCommentIdForReply(
  comments: MarketPageComments,
  replyId: string,
): string | null {
  for (const comment of comments) {
    const found = comment.replies.some((reply) => reply.id === replyId);

    if (found) {
      return comment.id;
    }
  }

  return null;
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

    handleVote(direction, betAmount, comment, gif, loadComments);
  };

  return (
    <section className="w-full">
      {/* Header */}

      <div className="mb-6 flex items-center gap-2">
        <h2 className="text-[13px] text-zinc-600 dark:text-zinc-500">
          Comment
        </h2>

        <span className="jakarta text-sm text-zinc-500">{comments.length}</span>
      </div>

      {/* Input */}
      {showPredictionInput ? (
        <PredictionCommentInput
          direction={direction}
          setDirection={setDirection}
          betAmount={betAmount}
          setBetAmount={setBetAmount}
          userPoints={userPoints}
          maxBet={maxBet}
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
        />
      )}

      {/* Comments */}
      <div>
        {comments.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-500">
            No comments yet.
          </div>
        ) : (
          comments.map((comment) => {
            const targetReplyCommentId = targetReplyId
              ? findCommentIdForReply(comments, targetReplyId)
              : null;

            return (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUser={user}
                onDeleted={loadComments}
                onCommentUpdated={loadComments}
                targetCommentId={targetCommentId}
                targetReplyId={targetReplyId}
                shouldOpenReplies={targetReplyCommentId === comment.id}
              />
            );
          })
        )}
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// COMMENT ITEM
// -----------------------------------------------------------------------------

function CommentItem({
  comment,
  currentUser,
  onDeleted,
  onCommentUpdated,
  targetCommentId,
  targetReplyId,
  shouldOpenReplies,
}: {
  comment: MarketComment;
  currentUser: {
    id: string;
    role?: string | null;
    image?: string | null;
    name?: string | null;
  } | null;

  targetCommentId: string | null;
  targetReplyId: string | null;
  shouldOpenReplies: boolean;
  onDeleted: () => Promise<void>;
  onCommentUpdated: () => Promise<void>;
}) {
  const [likedByMe, setLikedByMe] = useState(comment.likedByMe);
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const [isLikePending, startLikeTransition] = useTransition();

  const [showReplies, setShowReplies] = useState(false);

  useEffect(() => {
    if (shouldOpenReplies) {
      setShowReplies(true);
    }
  }, [shouldOpenReplies]);

  const [threadHovered, setThreadHovered] = useState(false);
  const [replying, setReplying] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isModerating, setIsModerating] = useState(false);

  const isAdmin = currentUser?.role === "ADMIN";
  const isAuthor = currentUser?.id === comment.author.id;

  const replyCount = comment.replyCount;

  const username = comment.author.name ?? "User";

  const isDeletedPredictionComment =
    !!comment.prediction && isDeletedPredictionContent(comment.content);

  const threadEvents = {
    onMouseEnter: () => setThreadHovered(true),
    onMouseLeave: () => setThreadHovered(false),
    onClick: () => setShowReplies((prev) => !prev),
  };

  const canDelete = isAuthor && !comment.withdrawnAt && !comment.moderatedAt;

  const canEdit = isAuthor && !comment.withdrawnAt && !comment.moderatedAt;

  // ---------------------------------------------------------------------------
  // EDIT
  // ---------------------------------------------------------------------------

  const handleEdit = () => {
    setIsEditing(true);
  };

  // ---------------------------------------------------------------------------
  // DELETE
  // ---------------------------------------------------------------------------

  const handleDelete = async () => {
    if (isDeleting) return;

    try {
      setIsDeleting(true);

      const result = await deleteComment(comment.id);

      await onDeleted();

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

  // ---------------------------------------------------------------------------
  // HIDE COMMENT
  // ---------------------------------------------------------------------------

  const handleHideComment = async () => {
    if (isModerating) return;

    try {
      setIsModerating(true);

      await hideComment(comment.id);

      await onCommentUpdated();

      // notifyCommentChanged();

      toast.success("Comment hidden.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to hide comment.",
      );
    } finally {
      setIsModerating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // RESTORE COMMENT
  // ---------------------------------------------------------------------------

  const handleRestoreComment = async () => {
    if (isModerating) return;

    try {
      setIsModerating(true);

      await restoreComment(comment.id);

      await onCommentUpdated();

      // notifyCommentChanged();

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

    // Optimistic update
    setLikedByMe(!previousLiked);

    setLikeCount((count) =>
      previousLiked ? Math.max(0, count - 1) : count + 1,
    );

    startLikeTransition(async () => {
      try {
        const result = await toggleCommentLike(comment.id);

        // Synchronize with the actual DB result
        setLikedByMe(result.liked);
        setLikeCount(result.likeCount);
      } catch (error) {
        // Roll back optimistic update
        setLikedByMe(previousLiked);
        setLikeCount(previousCount);

        toast.error(
          error instanceof Error ? error.message : "Could not update like.",
        );
      }
    });
  };

  useEffect(() => {
    if (targetCommentId !== comment.id) {
      return;
    }

    const element = document.getElementById(`comment-${comment.id}`);

    if (!element) {
      return;
    }

    requestAnimationFrame(() => {
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, [targetCommentId, comment.id]);

  return (
    <div id={`comment-${comment.id}`} className="mb-6 scroll-mt-24">
      <div className="flex gap-3 z-1">
        <Avatar label={username} image={comment.author.image} />

        <div className="min-w-0 flex-1">
          {/* Only THIS comment participates in hover */}
          <div className="group/comment relative min-w-0 flex-1">
            {/* User */}
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-semibold">{username}</span>

              {/* Prediction */}
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
                canEdit={canEdit}
                canDelete={canDelete}
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

            {/* Content */}
            {/* Content */}
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
                        content: [{ type: "paragraph" }],
                      }
                    : comment.content
                }
                onCancel={() => setIsEditing(false)}
                onSaved={async () => {
                  setIsEditing(false);
                  await onCommentUpdated();
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

            {/* Actions */}
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

            {/* Reply input */}
            {!comment.moderatedAt && replying && (
              <ReplyInput
                commentId={comment.id}
                username={username}
                currentUser={currentUser}
                onCancel={() => setReplying(false)}
                onReplyCreated={async () => {
                  setReplying(false);
                  setShowReplies(true);

                  await onCommentUpdated();

                  // notifyCommentChanged();
                }}
              />
            )}

            {/* ---------------------------------------------------------------
                1. COMMENT VERTICAL RAIL
            ---------------------------------------------------------------- */}

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

          {/* ---------------------------------------------------------------
              2. COLLAPSED REPLIES BUTTON + CURVE
          ---------------------------------------------------------------- */}

          {replyCount > 0 && !showReplies && (
            <div className="relative mt-5">
              {/* Curve from comment rail into replies button */}
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
                onClick={() => setShowReplies((prev) => !prev)}
                className="
                  -translate-x-2
                  flex items-center gap-2
                  rounded-xl
                  bg-white
                  px-2
                  text-sm font-semibold
                  text-zinc-600
                  hover:text-zinc-900
                  dark:bg-zinc-900
                  dark:text-zinc-400
                  dark:hover:text-zinc-200
                "
              >
                <ChevronDown className="size-4" />
                {replyCount} {replyCount === 1 ? "reply" : "replies"}
              </button>
            </div>
          )}

          {/* ---------------------------------------------------------------
              OPEN REPLIES
          ---------------------------------------------------------------- */}

          {showReplies && comment.replies.length > 0 && (
            <div className="relative mt-4 pb-3">
              {/* Connect comment down to first root reply */}
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

              <div className="space-y-6 pl-0 py-3">
                {comment.replies
                  .filter((reply) => reply.parentId === null)
                  .map((reply, index, rootReplies) => {
                    const isLastReply = index === rootReplies.length - 1;

                    return (
                      <div key={reply.id} className="relative">
                        {/* -------------------------------------------------
                            3. DYNAMIC VERTICAL RAIL
                        -------------------------------------------------- */}

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

                        {/* -------------------------------------------------
                            4. CURVE INTO THIS ROOT REPLY
                        -------------------------------------------------- */}

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
                          replies={comment.replies}
                          currentUser={currentUser}
                          onReplyUpdated={onCommentUpdated}
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

// -----------------------------------------------------------------------------
// COMMENT CONTENT
// -----------------------------------------------------------------------------

function CommentContent({ content }: { content: JSONContent }) {
  return (
    <div className="mt-0.5 space-y-2 text-[15px] leading-6 text-zinc-900 dark:text-zinc-200">
      {content.content?.map((node, index) => {
        // Text paragraph
        if (node.type === "paragraph") {
          const text =
            node.content?.map((child) => child.text ?? "").join("") ?? "";

          if (!text) return null;

          return <p key={index}>{text}</p>;
        }

        // GIF / image
        if (node.type === "image" && node.attrs?.src) {
          return (
            <img
              key={index}
              src={String(node.attrs.src)}
              alt={String(node.attrs.alt ?? "GIF")}
              className="
                h-auto
                w-45
                max-w-full
                rounded-lg
                object-contain
                sm:w-45
              "
            />
          );
        }

        return null;
      })}
    </div>
  );
}

// -----------------------------------------------------------------------------
// AVATAR
// -----------------------------------------------------------------------------

function Avatar({
  label,
  image,
  small = false,
}: {
  label: string;
  image?: string | null;
  small?: boolean;
}) {
  const size = small ? "size-8" : "size-9";

  if (image) {
    return (
      <img
        src={image}
        alt={label}
        className={`${size} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`
        flex shrink-0 items-center justify-center
        rounded-full
        bg-zinc-200 font-medium text-zinc-700
        dark:bg-zinc-700 dark:text-zinc-200
        ${small ? "size-8 text-xs" : "size-9 text-sm"}
      `}
    >
      {label.slice(0, 2).toUpperCase()}
    </div>
  );
}

// -----------------------------------------------------------------------------
// TIME
// -----------------------------------------------------------------------------

function formatTimeAgo(date: Date | string) {
  const time = new Date(date).getTime();

  const diff = Math.max(0, Date.now() - time);

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m`;
  }

  if (hours < 24) {
    return `${hours}h`;
  }

  if (days < 7) {
    return `${days}d`;
  }

  return new Date(date).toLocaleDateString();
}

function isDeletedPredictionContent(content: JSONContent): boolean {
  const text = content.content
    ?.flatMap((node) => node.content ?? [])
    .map((node) => node.text ?? "")
    .join("")
    .trim();

  return text === "Comment deleted by user";
}
