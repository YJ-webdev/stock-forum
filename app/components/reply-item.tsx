"use client";

import { useState } from "react";
import { ThumbsUp } from "lucide-react";
import { toast } from "sonner";

import { deleteReply, hideReply, restoreReply } from "@/app/actions/post";

import { ContentActionsMenu } from "./content-actions-menu";
import { ReplyEditInput } from "./reply-edit-input";
import { ReplyInput } from "./reply-input";
import type { MarketReply } from "./comment";

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

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
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ReplyItem({
  reply,
  currentUser,
  onReplyUpdated,
  replies,
  depth = 0,
  isLast = false,
}: ReplyItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isModerating, setIsModerating] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [childrenCollapsed, setChildrenCollapsed] = useState(false);

  const username = reply.author.name ?? "User";

  const isAuthor = currentUser?.id === reply.author.id;
  const isAdmin = currentUser?.role === "ADMIN";

  const canEdit = isAuthor && !reply.moderatedAt;
  const canDelete = isAuthor && !reply.moderatedAt;

  // ---------------------------------------------------------------------------
  // CHILDREN
  // ---------------------------------------------------------------------------

  const childReplies = replies.filter(
    (childReply) => childReply.parentId === reply.id,
  );

  const hasChild = childReplies.length > 0;
  // ---------------------------------------------------------------------------
  // DELETE
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // ADMIN HIDE
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // ADMIN RESTORE
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="relative">
      {/* ---------------------------------------------------------------
        CURRENT REPLY
    ---------------------------------------------------------------- */}

      <div className="group/reply relative flex gap-3">
        <div className="relative z-10 shrink-0">
          <Avatar label={username} image={reply.author.image} />
        </div>

        <div className="relative min-w-0 flex-1">
          {hasChild && (
            <div
              className="
        absolute
        -left-7
        top-0
        bottom-0
        w-px
        bg-zinc-200
        dark:bg-zinc-700
      "
            />
          )}
          {/* Header */}
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] font-semibold">{username}</span>

            <span className="jakarta text-[13px] text-zinc-500">
              {formatTimeAgo(reply.createdAt)}
            </span>

            <ContentActionsMenu
              canEdit={canEdit}
              canDelete={canDelete}
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
                <span className="text-[12px] text-zinc-400">
                  (edited {formatTimeAgo(reply.editedAt)})
                </span>
              )}
            </>
          )}

          {/* Actions */}
          {!reply.moderatedAt && !isEditing && (
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
              onReplyCreated={async () => {
                setShowReplyInput(false);
                await onReplyUpdated();
              }}
            />
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------
        CHILDREN OF THIS REPLY
    ---------------------------------------------------------------- */}

      {/* Child replies */}
      {hasChild && (
        <>
          {childrenCollapsed ? (
            /* Collapsed thread indicator */
            <button
              type="button"
              aria-label="Expand replies"
              onClick={() => setChildrenCollapsed(false)}
              className="
          group/thread
          relative
          ml-4 mt-2
          block h-5 w-5
          cursor-pointer
        "
            >
              <span
                className="
            absolute
            left-0 top-0
            h-4 w-px
            bg-zinc-200
            transition-colors
            group-hover/thread:bg-zinc-400
            dark:bg-zinc-700
            dark:group-hover/thread:bg-zinc-500
          "
              />

              <span
                className="
            absolute
            left-0 top-3
            h-px w-3
            bg-zinc-200
            transition-colors
            group-hover/thread:bg-zinc-400
            dark:bg-zinc-700
            dark:group-hover/thread:bg-zinc-500
          "
              />
            </button>
          ) : (
            <div className="relative mt-3">
              {/*
          Invisible interaction area.

          Only hovering THIS area activates peer-hover/thread.
          Hovering reply content does not.
        */}

              <div className="space-y-3">
                {childReplies.map((childReply, index) => {
                  const isLastChild = index === childReplies.length - 1;

                  return (
                    <div key={childReply.id} className="relative pl-12">
                      {/* Vertical rail */}
                      <div
                        className={`
                    pointer-events-none
                    absolute
                    left-4
                    -top-6
                    w-px

                    bg-zinc-200
                    transition-colors

                    peer-hover/thread:bg-zinc-400

                    dark:bg-zinc-700
                    dark:peer-hover/thread:bg-zinc-500

                    ${isLastChild ? "h-7" : "-bottom-1"}
                  `}
                      />

                      {/* Curve into this direct child */}
                      <div
                        className="
                    pointer-events-none
                    absolute
                    left-4
                    top-0
                    h-4
                    w-8
                    rounded-bl-xl
                    border-b border-l
                    border-zinc-200
                    transition-colors

                    peer-hover/thread:border-zinc-400

                    dark:border-zinc-700
                    dark:peer-hover/thread:border-zinc-500
                  "
                      />

                      <ReplyItem
                        reply={childReply}
                        replies={replies}
                        currentUser={currentUser}
                        onReplyUpdated={onReplyUpdated}
                        depth={depth + 1}
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
// AVATAR
// -----------------------------------------------------------------------------

function Avatar({ label, image }: { label: string; image?: string | null }) {
  if (image) {
    return (
      <img
        src={image}
        alt={label}
        className="size-8 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <div
      className="
        flex size-8 shrink-0
        items-center justify-center
        rounded-full
        bg-zinc-200
        text-xs font-medium text-zinc-700
        dark:bg-zinc-700
        dark:text-zinc-200
      "
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
