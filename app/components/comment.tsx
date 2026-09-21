"use client";

import { useCallback, useEffect, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import {
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Pencil,
  ShieldCheck,
  ShieldOff,
  ThumbsUp,
  Trash2,
} from "lucide-react";

import { useCurrentUser } from "@/app/context/user-context";
import {
  createReply,
  deleteComment,
  getMarketComments,
  hideComment,
  restoreComment,
} from "@/app/actions/post";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { PredictionCommentInput } from "./prediction-comment-input";
import { CommentOnlyInput } from "./comment-only-input";
import type { GifResult } from "./gif-picker";
import { useCommentRefresh } from "../context/comment-refresh-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommentEditInput } from "./comment-edit-input";

type VoteDirection = "BULL" | "BEAR";

type PredictionStatus = "PENDING" | "WON" | "LOST" | "VOID";

interface MarketReply {
  id: string;
  content: string;
  createdAt: Date;

  author: {
    id: string;
    name: string | null;
    image: string | null;
    nationality: string | null;
  };

  _count: {
    likes: number;
  };
}

interface MarketComment {
  id: string;
  content: JSONContent;
  createdAt: Date;
  updatedAt: Date;

  editedAt: Date | null;
  deletedAt: Date | null;
  withdrawnAt: Date | null;
  moderatedAt: Date | null;

  author: {
    id: string;
    name: string | null;
    image: string | null;
    nationality: string | null;
  };

  prediction: {
    direction: VoteDirection;
    pointsBet: number;
    status: PredictionStatus;
  } | null;

  replies: MarketReply[];

  _count: {
    likes: number;
    replies: number;
  };
}

interface MarketCommentsProps {
  assetSymbol: string;

  selectedVote: VoteDirection | null;
  voteLoading: boolean;
  isMarketOpen: boolean;

  userPoints: number;

  betAmount: number;
  setBetAmount: React.Dispatch<React.SetStateAction<number>>;

  handleVote: (
    direction: VoteDirection,
    betAmount: number,
    comment: string,
    gif: GifResult | null,
    onSuccess?: () => void | Promise<void>,
  ) => void;

  targetMs: number | null;
  countdownType: "VOTING_OPENS" | "VOTING_CLOSES" | null;
  showCountdown: boolean;
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
}: MarketCommentsProps) {
  const user = useCurrentUser();

  const [direction, setDirection] = useState<VoteDirection | null>(null);

  const [comments, setComments] = useState<MarketComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);

  const { refreshKey } = useCommentRefresh();

  const loadComments = useCallback(async () => {
    try {
      const result = await getMarketComments(assetSymbol);
      setComments(result);
    } catch (error) {
      console.error("Failed to load comments:", error);
    } finally {
      setCommentsLoading(false);
    }
  }, [assetSymbol]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const hasAlreadyVoted = selectedVote !== null;

  const maxBet = Math.min(500, userPoints);

  const buttonDisabled = voteLoading || isMarketOpen;

  // ---------------------------------------------------------------------------
  // SUBMIT VOTE
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (refreshKey === 0) return;

    loadComments();
  }, [refreshKey, loadComments]);
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
      {hasAlreadyVoted || isMarketOpen ? (
        <CommentOnlyInput
          assetSymbol={assetSymbol}
          targetMs={targetMs}
          countdownType={countdownType}
          showCountdown={showCountdown}
          isMarketOpen={isMarketOpen}
          onCommentCreated={loadComments}
        />
      ) : (
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
      )}

      {/* Comments */}
      <div>
        {commentsLoading ? (
          <div className="py-8 text-center text-sm text-zinc-500">
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-500">
            No comments yet.
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUser={user}
              onDeleted={loadComments}
              onCommentUpdated={loadComments}
            />
          ))
        )}
      </div>
    </section>
  );
}

function CommentItem({
  comment,
  currentUser,
  onDeleted,
  onCommentUpdated,
}: {
  comment: MarketComment;
  currentUser: {
    id: string;
    role?: string | null;
    image?: string | null;
    name?: string | null;
  } | null;
  onDeleted: () => Promise<void>;
  onCommentUpdated: () => Promise<void>;
}) {
  const { notifyCommentChanged } = useCommentRefresh();

  const [showReplies, setShowReplies] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyPending, setReplyPending] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isModerating, setIsModerating] = useState(false);

  const isAdmin = currentUser?.role === "ADMIN";
  const isAuthor = currentUser?.id === comment.author.id;

  const replyCount = comment._count.replies;

  const username = comment.author.name ?? "User";

  const canDelete = isAuthor && !comment.withdrawnAt && !comment.moderatedAt;

  const canEdit =
    isAuthor &&
    comment._count.replies === 0 &&
    !comment.withdrawnAt &&
    !comment.moderatedAt;

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleDelete = async () => {
    if (isDeleting) return;

    try {
      setIsDeleting(true);

      const result = await deleteComment(comment.id);

      if (result.action === "NOTHING_TO_DELETE") {
        toast.info("No comment content to delete. The vote will remain.");
        return;
      }

      await onDeleted();

      notifyCommentChanged();

      if (result.action === "WITHDRAWN") {
        toast.success("Comment withdrawn.");
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

      const result = await hideComment(comment.id);

      if (result.action === "NOTHING_TO_DELETE") {
        toast.info("No comment content to hide. The vote will remain.");
        return;
      }

      await onCommentUpdated();

      notifyCommentChanged();

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

      await onCommentUpdated();

      notifyCommentChanged();

      toast.success("Comment restored.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to restore comment.",
      );
    } finally {
      setIsModerating(false);
    }
  };

  const handleReply = async () => {
    const content = replyText.trim();

    if (!content || replyPending) return;

    try {
      setReplyPending(true);

      await createReply({
        commentId: comment.id,
        content,
      });

      setReplyText("");
      setReplying(false);

      toast.success("Reply posted.");

      // Use your existing comment refresh mechanism here.
      // For example:
      // refreshComments();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to post reply.",
      );
    } finally {
      setReplyPending(false);
    }
  };

  return (
    <div className="mb-6">
      <div className="group flex gap-3">
        <Avatar label={username} image={comment.author.image} />

        <div className="min-w-0 flex-1">
          {/* User */}
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] font-semibold">{username}</span>{" "}
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
            <DropdownMenu>
              <DropdownMenuTrigger
                onClick={() => {
                  console.log({
                    currentUser,
                    role: currentUser?.role,
                    isAdmin,
                  });
                }}
                className="
          ml-auto rounded-full p-1.5
          opacity-0
          hover:bg-zinc-100
          group-hover:opacity-100
          dark:hover:bg-zinc-800
        "
              >
                <MoreVertical className="size-4" />
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                {/* Author actions */}
                {canEdit && (
                  <DropdownMenuItem onClick={handleEdit}>
                    <Pencil className="mr-2 size-4" />
                    Edit
                  </DropdownMenuItem>
                )}

                {canDelete && (
                  <DropdownMenuItem
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 size-4" />

                    {isDeleting ? "Deleting..." : "Delete"}
                  </DropdownMenuItem>
                )}

                {/* Admin moderation */}
                {isAdmin && !comment.moderatedAt && (
                  <DropdownMenuItem
                    disabled={isModerating}
                    onClick={handleHideComment}
                  >
                    <ShieldOff className="mr-2 size-4" />

                    {isModerating ? "Hiding..." : "Hide comment"}
                  </DropdownMenuItem>
                )}

                {isAdmin && comment.moderatedAt && (
                  <DropdownMenuItem
                    disabled={isModerating}
                    onClick={handleRestoreComment}
                  >
                    <ShieldCheck className="mr-2 size-4" />

                    {isModerating ? "Restoring..." : "Restore comment"}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {comment.moderatedAt ? (
            <p className="mt-1 text-[15px] italic text-zinc-400">
              Comment hidden by moderation
            </p>
          ) : isEditing ? (
            <CommentEditInput
              commentId={comment.id}
              initialContent={comment.content}
              onCancel={() => setIsEditing(false)}
              onSaved={async () => {
                setIsEditing(false);

                await onCommentUpdated();

                notifyCommentChanged();
              }}
            />
          ) : (
            <div className="flex items-baseline gap-1 lowercase">
              {!comment.deletedAt && (
                <CommentContent content={comment.content} />
              )}

              {comment.deletedAt ? (
                <span className="text-[12px] italic text-zinc-400">
                  (comment deleted {formatTimeAgo(comment.deletedAt)})
                </span>
              ) : comment.editedAt ? (
                <span className="text-[12px] text-zinc-400">
                  (edited {formatTimeAgo(comment.editedAt)})
                </span>
              ) : null}
            </div>
          )}

          {/* Actions */}
          {!comment.moderatedAt && (
            <div className="mt-2 flex items-center gap-4">
              <button
                type="button"
                className="
                flex items-center gap-1.5
                text-sm text-zinc-500
                hover:text-zinc-900
                dark:hover:text-zinc-200
              "
              >
                <ThumbsUp className="size-4" />

                {comment._count.likes > 0 && (
                  <span>{comment._count.likes}</span>
                )}
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
          {!comment.moderatedAt && replying && replying && (
            <div className="mt-3 flex gap-2">
              {currentUser?.image ? (
                <img
                  src={currentUser.image}
                  alt={currentUser.name ?? "User"}
                  className="h-7 w-7 shrink-0 rounded-full object-cover"
                />
              ) : (
                <Avatar label={currentUser?.name ?? "You"} small />
              )}

              <div className="min-w-0 flex-1">
                <div className="rounded-lg bg-zinc-100 px-3 dark:bg-zinc-800">
                  <textarea
                    autoFocus
                    rows={1}
                    placeholder={`Reply to ${username}...`}
                    className="
                      min-h-10 w-full resize-none
                      bg-transparent py-2.5
                      text-[15px] outline-none
                      placeholder:text-zinc-500
                    "
                  />

                  <div className="flex items-center justify-between pb-2">
                    <button
                      type="button"
                      className="
                        rounded-md px-2 py-1
                        text-xs font-medium text-zinc-500
                        hover:bg-zinc-200
                        dark:hover:bg-zinc-700
                      "
                    >
                      GIF
                    </button>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setReplying(false)}
                      >
                        Cancel
                      </Button>

                      <Button type="button" size="sm">
                        Reply
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Show replies */}
          {replyCount > 0 && (
            <button
              type="button"
              onClick={() => setShowReplies((prev) => !prev)}
              className="
                mt-3 flex items-center gap-2
                text-sm font-semibold text-zinc-600
                hover:text-zinc-900
                dark:text-zinc-400
                dark:hover:text-zinc-200
              "
            >
              {showReplies ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
              {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </button>
          )}

          {/* Replies */}
          {showReplies && comment.replies.length > 0 && (
            <div className="relative mt-4 space-y-5 pl-4">
              <div className="absolute top-0 bottom-3 left-0 w-px bg-zinc-200 dark:bg-zinc-800" />

              {comment.replies.map((reply) => (
                <ReplyItem key={reply.id} reply={reply} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// REPLY ITEM
// -----------------------------------------------------------------------------

function ReplyItem({ reply }: { reply: MarketReply }) {
  const username = reply.author.name ?? "User";

  return (
    <div className="group flex gap-3">
      <Avatar label={username} image={reply.author.image} small />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[14px] font-semibold">{username}</span>

          <span className="text-[13px] text-zinc-500 jakarta">
            {formatTimeAgo(reply.createdAt)}
          </span>

          <button
            type="button"
            className="
              ml-auto rounded-full p-1.5
              opacity-0
              hover:bg-zinc-100
              group-hover:opacity-100
              dark:hover:bg-zinc-800
            "
          >
            <MoreVertical className="size-4" />
          </button>
        </div>

        <p className="mt-0.5 text-[15px] leading-6 text-zinc-900 dark:text-zinc-200">
          {reply.content}
        </p>

        <div className="mt-2 flex items-center gap-4">
          <button
            type="button"
            className="
              flex items-center gap-1.5
              text-sm text-zinc-500
              hover:text-zinc-900
              dark:hover:text-zinc-200
            "
          >
            <ThumbsUp className="size-4" />

            {reply._count.likes > 0 && <span>{reply._count.likes}</span>}
          </button>

          <button
            type="button"
            className="
              text-sm font-medium text-zinc-500
              hover:text-zinc-900
              dark:hover:text-zinc-200
            "
          >
            Reply
          </button>
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
