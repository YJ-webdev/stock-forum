"use client";

import { useEffect, useState, useTransition } from "react";
import { toggleReplyLike } from "@/app/actions/like";
import { RiHeartFill } from "react-icons/ri";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { toast } from "sonner";

import { deleteReply, hideReply, restoreReply } from "@/app/actions/post";

import { ContentActionsMenu } from "./content-actions-menu";
import { ReplyEditInput } from "./reply-edit-input";
import { ReplyInput } from "./reply-input";
import type { MarketReply } from "./comment";

interface ReplyItemProps {
  reply: MarketReply;

  currentUser: {
    id: string;
    role?: string | null;
    image?: string | null;
    name?: string | null;
  } | null;

  onReplyUpdated: () => Promise<void>;

  replies: MarketReply[];

  depth?: number;

  isLast?: boolean;

  targetReplyId?: string | null;
}

export function ReplyItem({
  reply,
  currentUser,
  onReplyUpdated,
  replies,
  depth = 0,
  isLast = false,
  targetReplyId = null,
}: ReplyItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isModerating, setIsModerating] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);

  const [childrenCollapsed, setChildrenCollapsed] = useState(true);
  const [threadHovered, setThreadHovered] = useState(false);

  const [likedByMe, setLikedByMe] = useState(reply.likedByMe);
  const [likeCount, setLikeCount] = useState(reply.likeCount);
  const [isLikePending, startLikeTransition] = useTransition();

  const username = reply.author.name ?? "User";

  const isAuthor = currentUser?.id === reply.author.id;
  const isAdmin = currentUser?.role === "ADMIN";

  const canEdit = isAuthor && !reply.moderatedAt;
  const canDelete = isAuthor && !reply.moderatedAt;

  const childReplies = replies.filter(
    (childReply) => childReply.parentId === reply.id,
  );

  const hasChild = childReplies.length > 0;

  const containsTargetReply =
    targetReplyId !== null &&
    getDescendants(reply.id, replies).some(
      (descendant) => descendant.id === targetReplyId,
    );

  const collapseThreadEvents = {
    onMouseEnter: () => setThreadHovered(true),
    onMouseLeave: () => setThreadHovered(false),
    onClick: () => setChildrenCollapsed(true),
  };

  const expandThreadEvents = {
    onMouseEnter: () => setThreadHovered(true),
    onMouseLeave: () => setThreadHovered(false),
    onClick: () => setChildrenCollapsed(false),
  };

  const handleDelete = async () => {
    if (isDeleting) return;

    try {
      setIsDeleting(true);

      await deleteReply(reply.id);

      await onReplyUpdated();

      toast.success("Reply deleted.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete reply.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleHide = async () => {
    if (isModerating) return;

    try {
      setIsModerating(true);

      await hideReply(reply.id);

      await onReplyUpdated();

      toast.success("Reply hidden.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to hide reply.",
      );
    } finally {
      setIsModerating(false);
    }
  };

  const handleRestore = async () => {
    if (isModerating) return;

    try {
      setIsModerating(true);

      await restoreReply(reply.id);

      await onReplyUpdated();

      toast.success("Reply restored.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to restore reply.",
      );
    } finally {
      setIsModerating(false);
    }
  };

  const handleReplyLike = () => {
    if (!currentUser) {
      toast.error("Please log in to like replies.");
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
        const result = await toggleReplyLike(reply.id);

        // Synchronize with actual DB result
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
    if (containsTargetReply) {
      setChildrenCollapsed(false);
    }
  }, [containsTargetReply]);

  useEffect(() => {
    if (targetReplyId !== reply.id) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const element = document.getElementById(`reply-${reply.id}`);

      if (!element) {
        return;
      }

      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [targetReplyId, reply.id]);

  return (
    <div id={`reply-${reply.id}`} className="relative scroll-mt-24">
      {/* ---------------------------------------------------------------
          CURRENT REPLY
      ---------------------------------------------------------------- */}

      <div className="group/reply relative flex gap-3">
        <div className="relative z-1 shrink-0">
          <Avatar className="size-8 shrink-0">
            <AvatarImage
              src={reply.author.image ?? undefined}
              alt={username ?? "User"}
              className="object-cover"
            />

            <AvatarFallback className="text-sm">
              {(currentUser?.name ?? "User").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="relative min-w-0 flex-1">
          {/* -----------------------------------------------------------
              CURRENT REPLY VERTICAL RAIL
          ------------------------------------------------------------ */}

          {hasChild && (
            <button
              type="button"
              aria-label={
                childrenCollapsed ? "Expand replies" : "Collapse replies"
              }
              {...(childrenCollapsed
                ? expandThreadEvents
                : collapseThreadEvents)}
              className="
              z-1
                absolute
                -left-9
                top-8
                bottom-0
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
                  -bottom-6
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

          {/* Header */}
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] font-semibold">{username}</span>

            <span className="jakarta text-[13px] text-zinc-500">
              {formatTimeAgo(reply.createdAt)}
            </span>

            <ContentActionsMenu
              isAdmin={isAdmin}
              isModerated={Boolean(reply.moderatedAt)}
              isDeleting={isDeleting}
              isModerating={isModerating}
              onEdit={() => setIsEditing(true)}
              onDelete={handleDelete}
              onHide={handleHide}
              onRestore={handleRestore}
            />
          </div>

          {/* Content */}
          {reply.moderatedAt ? (
            <p className="mt-1 text-[15px] italic text-zinc-400">
              Reply hidden by moderation
            </p>
          ) : isEditing ? (
            <ReplyEditInput
              replyId={reply.id}
              initialContent={reply.content}
              initialGifUrl={reply.gifUrl}
              onCancel={() => setIsEditing(false)}
              onSaved={async () => {
                setIsEditing(false);
                await onReplyUpdated();
              }}
            />
          ) : (
            <>
              {reply.content && (
                <p
                  className="
                    mt-0.5 whitespace-pre-wrap
                    text-[15px] leading-6
                    text-zinc-900
                    dark:text-zinc-200
                    wrap-anywhere
                  "
                >
                  {reply.content}
                </p>
              )}

              {reply.gifUrl && (
                <img
                  src={reply.gifUrl}
                  alt="GIF"
                  className="
                    mt-2 h-auto w-45
                    max-w-full rounded-lg
                    object-contain
                  "
                />
              )}

              {reply.editedAt && (
                <span className="text-[12px] text-zinc-400">(edited)</span>
              )}
            </>
          )}

          {/* Actions */}
          {!reply.moderatedAt && !isEditing && (
            <div className="mt-2 flex items-center gap-4">
              <button
                type="button"
                onClick={handleReplyLike}
                disabled={isLikePending}
                aria-label={likedByMe ? "Unlike reply" : "Like reply"}
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
                  className={`size-4 ${
                    likedByMe
                      ? "fill-current text-zinc-900 dark:text-zinc-100"
                      : ""
                  }`}
                />

                {likeCount > 0 && <span>{likeCount}</span>}
              </button>

              <button
                type="button"
                onClick={() => setShowReplyInput((prev) => !prev)}
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
          {!reply.moderatedAt && showReplyInput && (
            <ReplyInput
              commentId={reply.commentId}
              parentId={reply.id}
              username={username}
              currentUser={currentUser}
              onCancel={() => setShowReplyInput(false)}
              onReplyCreated={async (newReplyId) => {
                // Close reply input.
                setShowReplyInput(false);

                // Open this reply's child thread.
                setChildrenCollapsed(false);

                // Refresh replies so the newly created reply is rendered.
                await onReplyUpdated();

                // Wait for React to render the new reply, then scroll to it.
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    const element = document.getElementById(
                      `reply-${newReplyId}`,
                    );

                    element?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                  });
                });
              }}
            />
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------
          CHILDREN OF THIS REPLY
      ---------------------------------------------------------------- */}

      {hasChild && (
        <>
          {childrenCollapsed ? (
            /* ---------------------------------------------------------
      COLLAPSED THREAD INDICATOR
  ---------------------------------------------------------- */

            <button
              type="button"
              aria-label="Expand replies"
              {...expandThreadEvents}
              className="
      relative
      ml-2 mt-6
      block
      h-7
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

              <span
                className="
        ml-11
        
        flex h-4
        items-end
        whitespace-nowrap
        text-sm font-medium
        text-zinc-500
        dark:text-zinc-400
      "
              >
                {childReplies.length}{" "}
                {childReplies.length === 1 ? "reply" : "replies"}
              </span>
            </button>
          ) : (
            /* ---------------------------------------------------------
                EXPANDED CHILD THREAD
            ---------------------------------------------------------- */

            <div className="relative mt-6">
              <div className="space-y-6">
                {childReplies.map((childReply, index) => {
                  const isLastChild = index === childReplies.length - 1;

                  return (
                    <div key={childReply.id} className="relative pl-12">
                      {/* -----------------------------------------------
                          CHILD VERTICAL RAIL
                      ------------------------------------------------ */}

                      <button
                        type="button"
                        aria-label="Collapse replies"
                        {...collapseThreadEvents}
                        className={`
                          absolute
                          left-2
                          -top-6
                         z-0
                          w-5
                          cursor-pointer

                          ${isLastChild ? "h-7" : "-bottom-1"}
                        `}
                      >
                        <span
                          className={`
                            pointer-events-none
                            absolute
                            left-2
                            -top-2
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

                      {/* -----------------------------------------------
                          CURVE INTO THIS DIRECT CHILD
                      ------------------------------------------------ */}

                      <button
                        type="button"
                        aria-label="Collapse replies"
                        {...collapseThreadEvents}
                        className="
                          absolute
                          left-2
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

                      {/* -----------------------------------------------
                          CHILD REPLY
                      ------------------------------------------------ */}

                      <ReplyItem
                        reply={childReply}
                        replies={replies}
                        currentUser={currentUser}
                        onReplyUpdated={onReplyUpdated}
                        depth={depth + 1}
                        targetReplyId={targetReplyId}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
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

function getDescendants(
  parentId: string,
  replies: MarketReply[],
): MarketReply[] {
  const result: MarketReply[] = [];

  const walk = (id: string) => {
    const children = replies.filter((reply) => reply.parentId === id);

    for (const child of children) {
      result.push(child);
      walk(child.id);
    }
  };

  walk(parentId);

  return result;
}
