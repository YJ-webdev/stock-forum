"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";

import { RiHeartFill } from "react-icons/ri";
import { toast } from "sonner";

import { toggleReplyLike } from "@/app/actions/like";
import {
  deleteReply,
  hideReply,
  reportReply,
  restoreReply,
} from "@/app/actions/post";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { resolveLanguage } from "@/lib/data/languages";
import {
  COMMENT_ACTION_LABELS,
  COMMENT_VIEW_LABELS,
  CONTENT_RESULT_LABELS,
  CONTENT_STATUS_LABELS,
} from "@/lib/data/translations";

import { formatTimeAgo } from "@/lib/utils/format-time-ago";
import { getErrorMessage } from "@/lib/utils/get-error-message";

import { ContentActionsMenu } from "./content-actions-menu";
import { UserProfileTrigger, type ProfileUser } from "./profile-card";

import type { MarketReply } from "./comment";
import dynamic from "next/dynamic";

const ReplyEditInput = dynamic(() =>
  import("./reply-edit-input").then((module) => module.ReplyEditInput),
);

const ReplyInput = dynamic(() =>
  import("./reply-input").then((module) => module.ReplyInput),
);

interface ReplyItemProps {
  reply: MarketReply;
  replies: MarketReply[];

  currentUser: {
    id: string;
    role?: string | null;
    image?: string | null;
    name?: string | null;
    language?: string | null;
  } | null;

  onReplyUpdated: () => Promise<void>;
  onReplyCreated: (reply: MarketReply) => void;
  onBanRequest?: (target: ProfileUser) => void;

  depth?: number;
  isLast?: boolean;
  targetReplyId?: string | null;
}

export function ReplyItem({
  reply,
  replies,
  currentUser,
  onReplyUpdated,
  onReplyCreated,
  onBanRequest,
  depth = 0,
  targetReplyId = null,
}: ReplyItemProps) {
  const language = resolveLanguage(currentUser?.language);

  const labels = COMMENT_VIEW_LABELS[language];
  const actionLabels = COMMENT_ACTION_LABELS[language];
  const resultLabels = CONTENT_RESULT_LABELS[language];
  const statusLabels = CONTENT_STATUS_LABELS[language];

  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isModerating, setIsModerating] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);

  const [childrenCollapsed, setChildrenCollapsed] = useState(true);
  const [threadHovered, setThreadHovered] = useState(false);

  const [openProfile, setOpenProfile] = useState<"avatar" | "name" | null>(
    null,
  );

  const [likedByMe, setLikedByMe] = useState(reply.likedByMe);
  const [likeCount, setLikeCount] = useState(reply.likeCount);
  const [isLikePending, startLikeTransition] = useTransition();

  const username = reply.author.name ?? labels.guest;
  const isAuthor = currentUser?.id === reply.author.id;
  const isAdmin = currentUser?.role === "ADMIN";

  const profileTarget: ProfileUser = {
    id: reply.author.id,
    name: username,
    image: reply.author.image ?? null,
  };

  const childReplies = replies.filter((child) => child.parentId === reply.id);

  const hasChild = childReplies.length > 0;

  const childReplyCountLabel = labels.reply_count.replace(
    "{count}",
    childReplies.length.toLocaleString(language),
  );

  const containsTargetReply =
    targetReplyId !== null && hasDescendant(reply.id, targetReplyId, replies);

  const railColor = threadHovered
    ? "bg-zinc-400 dark:bg-zinc-500"
    : "bg-zinc-200 dark:bg-zinc-700";

  const curveColor = threadHovered
    ? "border-zinc-400 dark:border-zinc-500"
    : "border-zinc-200 dark:border-zinc-700";

  const threadHoverEvents = {
    onMouseEnter: () => setThreadHovered(true),
    onMouseLeave: () => setThreadHovered(false),
  };

  const collapseThreadEvents = {
    ...threadHoverEvents,
    onClick: () => setChildrenCollapsed(true),
  };

  const expandThreadEvents = {
    ...threadHoverEvents,
    onClick: () => setChildrenCollapsed(false),
  };

  function handleProfileOpenChange(key: "avatar" | "name", open: boolean) {
    setOpenProfile((current) =>
      open ? key : current === key ? null : current,
    );
  }

  async function handleDelete() {
    if (isDeleting) return;

    setIsDeleting(true);

    try {
      await deleteReply(reply.id);
      await onReplyUpdated();

      toast.success(resultLabels.deleted);
    } catch (error) {
      toast.error(getErrorMessage(error, labels.action_failed));
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleModeration(action: "hide" | "restore") {
    if (isModerating) return;

    setIsModerating(true);

    try {
      if (action === "hide") {
        await hideReply(reply.id);
      } else {
        await restoreReply(reply.id);
      }

      await onReplyUpdated();

      toast.success(
        action === "hide" ? resultLabels.hidden : resultLabels.restored,
      );
    } catch (error) {
      toast.error(getErrorMessage(error, labels.action_failed));
    } finally {
      setIsModerating(false);
    }
  }

  function handleReplyLike() {
    if (isLikePending) return;

    const previousLiked = likedByMe;
    const previousCount = likeCount;

    setLikedByMe(!previousLiked);
    setLikeCount((count) =>
      previousLiked ? Math.max(0, count - 1) : count + 1,
    );

    startLikeTransition(async () => {
      try {
        const result = await toggleReplyLike(reply.id);

        setLikedByMe(result.liked);
        setLikeCount(result.likeCount);

        toast.success(result.liked ? labels.like : labels.unlike);
      } catch (error) {
        setLikedByMe(previousLiked);
        setLikeCount(previousCount);

        toast.error(getErrorMessage(error, labels.action_failed));
      }
    });
  }

  async function handleReportReply() {
    if (!currentUser) {
      toast.error(actionLabels.login_required);
      return;
    }

    if (isReporting) return;

    setIsReporting(true);

    try {
      const result = await reportReply(reply.id);

      if (result.success) {
        toast.success(statusLabels.reply_reported, {
          description: statusLabels.reply_report_message,
        });
      }
    } catch (error) {
      toast.error(getErrorMessage(error, labels.action_failed));
    } finally {
      setIsReporting(false);
    }
  }

  useEffect(() => {
    if (containsTargetReply) {
      setChildrenCollapsed(false);
    }
  }, [containsTargetReply]);

  useEffect(() => {
    if (targetReplyId !== reply.id) return;

    const timeout = window.setTimeout(() => {
      document.getElementById(`reply-${reply.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);

    return () => window.clearTimeout(timeout);
  }, [targetReplyId, reply.id]);

  useEffect(() => {
    setLikedByMe(reply.likedByMe);
    setLikeCount(reply.likeCount);
  }, [reply.id, reply.likedByMe, reply.likeCount]);
  return (
    <div id={`reply-${reply.id}`} className="relative scroll-mt-0">
      <div className="group/reply relative flex gap-3">
        {/* Avatar */}
        <div className="relative z-1 shrink-0">
          <UserProfileTrigger
            target={profileTarget}
            currentUserId={currentUser?.id}
            language={currentUser?.language}
            isAdmin={isAdmin}
            open={openProfile === "avatar"}
            onOpenChange={(open) => handleProfileOpenChange("avatar", open)}
            onBanRequest={onBanRequest}
          >
            <button
              type="button"
              aria-label={username}
              className="
                block size-8 shrink-0 cursor-pointer rounded-full
                focus-visible:outline-none
                focus-visible:ring-2 focus-visible:ring-zinc-400
                focus-visible:ring-offset-2
              "
            >
              <Avatar className="size-8 shrink-0">
                <AvatarImage
                  src={reply.author.image ?? undefined}
                  alt=""
                  className="object-cover"
                />

                <AvatarFallback className="text-sm">
                  {getInitials(username)}
                </AvatarFallback>
              </Avatar>
            </button>
          </UserProfileTrigger>
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Thread rail */}
          {hasChild && (
            <button
              type="button"
              aria-label={
                childrenCollapsed
                  ? labels.show_replies
                  : labels.collapse_replies
              }
              aria-expanded={!childrenCollapsed}
              {...(childrenCollapsed
                ? expandThreadEvents
                : collapseThreadEvents)}
              className="
                absolute -left-9 top-8 bottom-0 z-1
                w-5 cursor-pointer
              "
            >
              <span
                className={`
                  pointer-events-none absolute
                  left-2 top-0 -bottom-6 w-px
                  transition-colors ${railColor}
                `}
              />
            </button>
          )}

          {/* Header */}
          <div className="flex min-w-0 items-center gap-1.5">
            <UserProfileTrigger
              target={profileTarget}
              currentUserId={currentUser?.id}
              language={currentUser?.language}
              isAdmin={isAdmin}
              open={openProfile === "name"}
              onOpenChange={(open) => handleProfileOpenChange("name", open)}
              onBanRequest={onBanRequest}
            >
              <button
                type="button"
                className="
                  min-w-0 cursor-pointer rounded-sm text-start
                  focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-zinc-400
                "
              >
                <span className="block truncate text-[14px] font-semibold hover:underline">
                  {username}
                </span>
              </button>
            </UserProfileTrigger>

            <span className="jakarta shrink-0 text-[13px] text-zinc-500">
              {formatTimeAgo(reply.createdAt, language)}
            </span>

            <ContentActionsMenu
              language={currentUser?.language}
              isAdmin={isAdmin}
              isAuthor={isAuthor}
              isModerated={Boolean(reply.moderatedAt)}
              isDeleting={isDeleting}
              isModerating={isModerating}
              isReporting={isReporting}
              onEdit={() => setIsEditing(true)}
              onDelete={handleDelete}
              onHide={() => handleModeration("hide")}
              onRestore={() => handleModeration("restore")}
              onReport={handleReportReply}
              hoverGroup="reply"
            />
          </div>

          {/* Content */}
          {reply.moderatedAt ? (
            <p className="mt-1 text-[15px] italic text-zinc-400">
              {labels.hidden_reply}
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
                <ReplyTextContent
                  key={reply.content}
                  content={reply.content}
                  editedLabel={reply.editedAt ? labels.edited : undefined}
                  readMoreLabel={labels.read_more}
                  readLessLabel={labels.read_less}
                />
              )}

              {reply.gifUrl && (
                <img
                  src={reply.gifUrl}
                  alt="GIF"
                  loading="lazy"
                  decoding="async"
                  className="
      mt-3 h-auto w-45 max-w-full
      rounded-lg object-contain
    "
                />
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
                  <span>{likeCount.toLocaleString(language)}</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!currentUser) {
                    toast.error(actionLabels.login_required);
                    return;
                  }

                  setShowReplyInput((previous) => !previous);
                }}
                className="
                  cursor-pointer text-sm font-medium
                  text-zinc-400 hover:text-zinc-900
                  dark:text-zinc-500 dark:hover:text-zinc-200
                "
              >
                {labels.reply}
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
              onReplyCreated={(newReply) => {
                setShowReplyInput(false);
                setChildrenCollapsed(false);

                onReplyCreated(newReply);

                requestAnimationFrame(() => {
                  document
                    .getElementById(`reply-${newReply.id}`)
                    ?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                });
              }}
            />
          )}
        </div>
      </div>

      {/* Child replies */}
      {hasChild &&
        (childrenCollapsed ? (
          <button
            type="button"
            aria-label={labels.show_replies}
            aria-expanded={false}
            {...expandThreadEvents}
            className="relative ml-2 mt-6 block h-7 cursor-pointer"
          >
            <span
              className={`
                pointer-events-none absolute left-2 top-0
                h-4 w-8 rounded-bl-xl border-b border-l
                transition-colors ${curveColor}
              `}
            />

            <span
              className="
                ml-11 flex h-4 items-end whitespace-nowrap
                text-sm font-medium text-zinc-500
                dark:text-zinc-400
              "
            >
              {childReplyCountLabel}
            </span>
          </button>
        ) : (
          <div className="relative mt-6">
            {childReplies.map((childReply, index) => {
              const isLastChild = index === childReplies.length - 1;

              return (
                <div key={childReply.id} className="relative pl-12">
                  {/* Vertical rail */}
                  <button
                    type="button"
                    aria-label={labels.collapse_replies}
                    {...collapseThreadEvents}
                    className={`
                      absolute left-2 -top-6 z-0 w-5 cursor-pointer
                      ${isLastChild ? "h-7" : "-bottom-1"}
                    `}
                  >
                    <span
                      className={`
                        pointer-events-none absolute
                        left-2 -top-2 bottom-0 w-px
                        transition-colors ${railColor}
                      `}
                    />
                  </button>

                  {/* Curve */}
                  <button
                    type="button"
                    aria-label={labels.collapse_replies}
                    {...collapseThreadEvents}
                    className="
                      absolute left-2 top-0 z-0
                      h-4 w-10 cursor-pointer
                    "
                  >
                    <span
                      className={`
                        pointer-events-none absolute left-2 top-0
                        h-4 w-8 rounded-bl-xl border-b border-l
                        transition-colors ${curveColor}
                      `}
                    />
                  </button>

                  <ReplyItem
                    reply={childReply}
                    replies={replies}
                    currentUser={currentUser}
                    onReplyUpdated={onReplyUpdated}
                    onReplyCreated={onReplyCreated}
                    onBanRequest={onBanRequest}
                    depth={depth + 1}
                    targetReplyId={targetReplyId}
                  />
                </div>
              );
            })}
          </div>
        ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// TEXT / READ MORE
// -----------------------------------------------------------------------------

interface ReplyTextContentProps {
  content: string;
  editedLabel?: string;
  readMoreLabel: string;
  readLessLabel: string;
}

const MAX_COLLAPSED_LINES = 4;
const MAX_EXPANDED_HEIGHT = 480;

export function ReplyTextContent({
  content,
  editedLabel,
  readMoreLabel,
  readLessLabel,
}: ReplyTextContentProps) {
  const contentId = useId();
  const displayContent = content.trimEnd();

  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const paragraphRef = useRef<HTMLParagraphElement>(null);

  const [expanded, setExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const paragraph = paragraphRef.current;

    if (!container || !paragraph) return;

    let active = true;
    let frame: number | null = null;
    let previousWidth: number | null = null;
    let observer: ResizeObserver | undefined;

    function measureOverflow() {
      if (!active || !paragraph) return;

      const lineHeight = Number.parseFloat(
        window.getComputedStyle(paragraph).lineHeight,
      );

      if (!Number.isFinite(lineHeight) || lineHeight <= 0) return;

      const collapsedHeight = lineHeight * MAX_COLLAPSED_LINES;
      const nextHasOverflow = paragraph.scrollHeight > collapsedHeight + 1;

      setHasOverflow((previous) =>
        previous === nextHasOverflow ? previous : nextHasOverflow,
      );
    }

    function scheduleMeasure() {
      if (!active || frame !== null) return;

      frame = window.requestAnimationFrame(() => {
        frame = null;
        measureOverflow();
      });
    }

    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(([entry]) => {
        if (!entry) return;

        const width = entry.contentRect.width;

        if (previousWidth !== null && Math.abs(width - previousWidth) < 0.5) {
          return;
        }

        previousWidth = width;
        scheduleMeasure();
      });

      observer.observe(container);
    } else {
      window.addEventListener("resize", scheduleMeasure);
    }

    scheduleMeasure();

    const fonts = document.fonts;

    if (fonts) {
      fonts.addEventListener("loadingdone", scheduleMeasure);
    }

    return () => {
      active = false;

      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }

      observer?.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      fonts?.removeEventListener("loadingdone", scheduleMeasure);
    };
  }, [displayContent, editedLabel]);

  function handleCollapse() {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = 0;
    }

    setExpanded(false);
  }

  return (
    <div ref={containerRef} className="relative min-w-0">
      <div className="relative min-w-0">
        <div
          ref={viewportRef}
          id={contentId}
          className="content-scrollbar overflow-x-hidden"
          style={{
            maxHeight: expanded ? MAX_EXPANDED_HEIGHT : undefined,
            overflowY: expanded ? "auto" : "hidden",
          }}
        >
          <p
            ref={paragraphRef}
            className={`
              m-0 min-w-0 whitespace-pre-wrap
              text-[15px] leading-6
              text-zinc-900 dark:text-zinc-200
              ${expanded ? "" : "line-clamp-4"}
            `}
            style={{
              overflowWrap: "anywhere",
              wordBreak: "normal",
            }}
          >
            {displayContent}

            {editedLabel && (
              <span className="whitespace-normal text-[12px] text-zinc-400">
                {" "}
                <span className="whitespace-nowrap">{editedLabel}</span>
              </span>
            )}
          </p>
        </div>

        {hasOverflow && !expanded && (
          <button
            type="button"
            aria-controls={contentId}
            aria-expanded={false}
            onClick={(event) => {
              event.stopPropagation();
              setExpanded(true);
            }}
            className="
              absolute right-0 bottom-0 z-10
              max-w-full cursor-pointer truncate
              rounded-md bg-zinc-100 px-2
              text-[13px] font-medium leading-6 text-zinc-600
              transition-colors
              hover:bg-zinc-200 hover:text-zinc-900
              focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-zinc-400
              dark:bg-zinc-800 dark:text-zinc-300
              dark:hover:bg-zinc-700 dark:hover:text-zinc-100
            "
          >
            {readMoreLabel}
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-1 leading-6">
          <button
            type="button"
            aria-controls={contentId}
            aria-expanded={true}
            onClick={(event) => {
              event.stopPropagation();
              handleCollapse();
            }}
            className="
              inline-block cursor-pointer rounded-sm
              p-0 align-top
              text-[13px] font-medium leading-6 text-zinc-500
              hover:text-zinc-900
              focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-zinc-400
              dark:text-zinc-400 dark:hover:text-zinc-200
            "
          >
            {readLessLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function getInitials(name: string) {
  return Array.from(name.trim())[0]?.toUpperCase() ?? "?";
}

function hasDescendant(
  parentId: string,
  targetId: string,
  replies: MarketReply[],
): boolean {
  const childrenByParent = new Map<string, string[]>();

  for (const reply of replies) {
    if (!reply.parentId) continue;

    const children = childrenByParent.get(reply.parentId);

    if (children) {
      children.push(reply.id);
    } else {
      childrenByParent.set(reply.parentId, [reply.id]);
    }
  }

  const pending = [...(childrenByParent.get(parentId) ?? [])];
  const visited = new Set<string>([parentId]);

  while (pending.length > 0) {
    const id = pending.pop();

    if (!id || visited.has(id)) continue;
    if (id === targetId) return true;

    visited.add(id);
    pending.push(...(childrenByParent.get(id) ?? []));
  }

  return false;
}
