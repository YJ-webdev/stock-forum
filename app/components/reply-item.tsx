"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";

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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { resolveLanguage, type Language } from "@/lib/data/languages";
import {
  COMMENT_ACTION_LABELS,
  COMMENT_VIEW_LABELS,
  CONTENT_RESULT_LABELS,
  CONTENT_STATUS_LABELS,
  REPLY_VIEW_LABELS,
} from "@/lib/data/translations";

import { ContentActionsMenu } from "./content-actions-menu";
import { ProfileCard } from "./profile-card";
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
    language?: string | null;
  } | null;

  onReplyUpdated: () => Promise<void>;
  onReplyCreated: (reply: MarketReply) => void;

  replies: MarketReply[];

  depth?: number;
  isLast?: boolean;
  targetReplyId?: string | null;
}

export function ReplyItem({
  reply,
  currentUser,
  onReplyUpdated,
  onReplyCreated,
  replies,
  depth = 0,
  targetReplyId = null,
}: ReplyItemProps) {
  const language = resolveLanguage(currentUser?.language);

  const labels = COMMENT_VIEW_LABELS[language];
  const actionLabels = COMMENT_ACTION_LABELS[language];
  const resultLabels = CONTENT_RESULT_LABELS[language];
  const statusLabels = CONTENT_STATUS_LABELS[language];
  const replyLabels = REPLY_VIEW_LABELS[language];

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

  const childReplies = replies.filter(
    (childReply) => childReply.parentId === reply.id,
  );

  const hasChild = childReplies.length > 0;

  const childReplyCountLabel = labels.reply_count.replace(
    "{count}",
    childReplies.length.toLocaleString(language),
  );

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

  function handleProfileOpenChange(key: "avatar" | "name", open: boolean) {
    setOpenProfile((current) =>
      open ? key : current === key ? null : current,
    );
  }

  // DELETE / MODERATION

  const handleDelete = async () => {
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
  };

  const handleHide = async () => {
    if (isModerating) return;

    setIsModerating(true);

    try {
      await hideReply(reply.id);
      await onReplyUpdated();

      toast.success(resultLabels.hidden);
    } catch (error) {
      toast.error(getErrorMessage(error, labels.action_failed));
    } finally {
      setIsModerating(false);
    }
  };

  const handleRestore = async () => {
    if (isModerating) return;

    setIsModerating(true);

    try {
      await restoreReply(reply.id);
      await onReplyUpdated();

      toast.success(resultLabels.restored);
    } catch (error) {
      toast.error(getErrorMessage(error, labels.action_failed));
    } finally {
      setIsModerating(false);
    }
  };

  // LIKE

  const handleReplyLike = () => {
    if (!currentUser) {
      toast.error(actionLabels.login_required);
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
  };

  // REPORT

  const handleReportReply = async () => {
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
  };

  // DEEP LINK

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

  return (
    <div id={`reply-${reply.id}`} className="relative scroll-mt-0">
      <div className="group/reply relative flex gap-3">
        {/* Avatar / profile */}
        <div className="relative z-1 shrink-0">
          <Popover
            modal={false}
            open={openProfile === "avatar"}
            onOpenChange={(open) => handleProfileOpenChange("avatar", open)}
          >
            <PopoverTrigger
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
            </PopoverTrigger>

            <PopoverContent
              align="start"
              side="bottom"
              sideOffset={8}
              className="w-80 max-w-[calc(100vw-2rem)] rounded-lg p-0"
            >
              <ProfileCard
                userId={reply.author.id}
                name={username}
                image={reply.author.image}
                currentUserId={currentUser?.id}
                language={currentUser?.language}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="relative min-w-0 flex-1">
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
                  left-2 top-0 -bottom-6 w-px transition-colors
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
          <div className="flex min-w-0 items-center gap-1.5">
            <Popover
              modal={false}
              open={openProfile === "name"}
              onOpenChange={(open) => handleProfileOpenChange("name", open)}
            >
              <PopoverTrigger
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
              </PopoverTrigger>

              <PopoverContent
                align="start"
                side="bottom"
                sideOffset={8}
                className="w-80 max-w-[calc(100vw-2rem)] rounded-lg p-0"
              >
                <ProfileCard
                  userId={reply.author.id}
                  name={username}
                  image={reply.author.image}
                  currentUserId={currentUser?.id}
                  language={currentUser?.language}
                />
              </PopoverContent>
            </Popover>

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
              onHide={handleHide}
              onRestore={handleRestore}
              onReport={handleReportReply}
              hoverGroup="reply"
            />
          </div>

          {/* Content */}
          {reply.moderatedAt ? (
            <p className="mt-1 text-[15px] italic text-zinc-400">
              {replyLabels.hidden_reply}
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
                <ReplyTextContent key={reply.content} content={reply.content} />
              )}

              {reply.gifUrl && (
                <img
                  src={reply.gifUrl}
                  alt="GIF"
                  className="
                    mt-2 h-auto w-45 max-w-full
                    rounded-lg object-contain
                  "
                />
              )}

              {reply.editedAt && (
                <span className="text-[12px] text-zinc-400">
                  {labels.edited}
                </span>
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
                  text-zinc-400 dark:text-zinc-500
                  hover:text-zinc-900 dark:hover:text-zinc-200
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
      {hasChild && (
        <>
          {childrenCollapsed ? (
            <button
              type="button"
              aria-label={labels.show_replies}
              aria-expanded={false}
              {...expandThreadEvents}
              className="
                relative ml-2 mt-6 block h-7 cursor-pointer
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
                        absolute left-2 -top-6 z-0
                        w-5 cursor-pointer
                        ${isLastChild ? "h-7" : "-bottom-1"}
                      `}
                    >
                      <span
                        className={`
                          pointer-events-none absolute
                          left-2 -top-2 bottom-0 w-px transition-colors
                          ${
                            threadHovered
                              ? "bg-zinc-400 dark:bg-zinc-500"
                              : "bg-zinc-200 dark:bg-zinc-700"
                          }
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
                      reply={childReply}
                      replies={replies}
                      currentUser={currentUser}
                      onReplyUpdated={onReplyUpdated}
                      onReplyCreated={onReplyCreated}
                      depth={depth + 1}
                      targetReplyId={targetReplyId}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// TEXT / READ MORE

function ReplyTextContent({ content }: { content: string }) {
  const contentId = useId();
  const displayContent = content.trimEnd();

  const containerRef = useRef<HTMLDivElement>(null);
  const measurementRef = useRef<HTMLParagraphElement>(null);
  const measurementTextRef = useRef<HTMLSpanElement>(null);
  const measurementSuffixRef = useRef<HTMLSpanElement>(null);

  const [expanded, setExpanded] = useState(false);
  const [animating, setAnimating] = useState(false);

  const [layout, setLayout] = useState<{
    collapsedText: string;
    collapsedHeight: number;
    fullHeight: number;
    hasOverflow: boolean;
  } | null>(null);

  const buttonClassName = `
    inline-block cursor-pointer rounded-sm
    text-[13px] font-medium leading-6
    text-zinc-500 hover:text-zinc-900
    dark:text-zinc-400 dark:hover:text-zinc-200
    focus-visible:outline-none
    focus-visible:ring-2 focus-visible:ring-zinc-400
  `;

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measurement = measurementRef.current;
    const textElement = measurementTextRef.current;
    const suffixElement = measurementSuffixRef.current;

    if (!container || !measurement || !textElement || !suffixElement) {
      return;
    }

    const measure = () => {
      if (container.getBoundingClientRect().width <= 0) return;

      const lineHeight = Number.parseFloat(
        window.getComputedStyle(measurement).lineHeight,
      );

      const maxHeight = lineHeight * 4;

      const measureHeight = (text: string, suffix: string) => {
        textElement.textContent = text;
        suffixElement.textContent = suffix;

        return measurement.getBoundingClientRect().height;
      };

      const naturalHeight = measureHeight(displayContent, "");

      if (naturalHeight <= maxHeight + 0.5) {
        setLayout({
          collapsedText: displayContent,
          collapsedHeight: naturalHeight,
          fullHeight: naturalHeight,
          hasOverflow: false,
        });
        return;
      }

      // Preserve emoji and combined characters where supported.
      const characters =
        typeof Intl.Segmenter === "function"
          ? Array.from(
              new Intl.Segmenter(undefined, {
                granularity: "grapheme",
              }).segment(displayContent),
              (segment) => segment.segment,
            )
          : Array.from(displayContent);

      let low = 0;
      let high = characters.length;

      // Include the complete suffix in every measurement.
      while (low < high) {
        const middle = Math.ceil((low + high) / 2);

        const candidate = characters.slice(0, middle).join("").trimEnd();

        const height = measureHeight(candidate, "… Read more");

        if (height <= maxHeight + 0.5) {
          low = middle;
        } else {
          high = middle - 1;
        }
      }

      const collapsedText = characters.slice(0, low).join("").trimEnd();

      const collapsedHeight = measureHeight(collapsedText, "… Read more");

      const fullHeight = measureHeight(displayContent, " Read less");

      setLayout((previous) => {
        if (
          previous?.collapsedText === collapsedText &&
          previous.collapsedHeight === collapsedHeight &&
          previous.fullHeight === fullHeight &&
          previous.hasOverflow
        ) {
          return previous;
        }

        return {
          collapsedText,
          collapsedHeight,
          fullHeight,
          hasOverflow: true,
        };
      });
    };

    measure();

    let lastWidth = container.getBoundingClientRect().width;

    const observer = new ResizeObserver(() => {
      const width = container.getBoundingClientRect().width;

      if (width !== lastWidth) {
        lastWidth = width;
        measure();
      }
    });

    observer.observe(container);

    let active = true;

    const handleFontsLoaded = () => {
      if (active) measure();
    };

    void document.fonts.ready.then(handleFontsLoaded);
    document.fonts.addEventListener("loadingdone", handleFontsLoaded);

    return () => {
      active = false;
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", handleFontsLoaded);
    };
  }, [displayContent]);

  useEffect(() => {
    if (!animating) return;

    const timeout = window.setTimeout(() => {
      setAnimating(false);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [animating, expanded]);

  const hasOverflow = layout?.hasOverflow ?? false;

  // Keep the full text during the height transition.
  const showFullText = expanded || animating || !hasOverflow;

  return (
    <div ref={containerRef} className="relative mt-0.5 min-w-0">
      {/* Measure text and suffix together at the actual content width. */}
      <p
        ref={measurementRef}
        aria-hidden="true"
        className="
          pointer-events-none invisible absolute inset-x-0 top-0
          m-0 whitespace-pre-wrap
          text-[15px] leading-6 wrap-anywhere
        "
      >
        <span ref={measurementTextRef} />
        <span
          ref={measurementSuffixRef}
          className="
  inline-block align-top whitespace-nowrap
  text-[13px] font-medium leading-6
"
        />
      </p>

      <div
        id={contentId}
        className="
          overflow-hidden
          transition-[height] duration-200 ease-in-out
          motion-reduce:transition-none
        "
        style={{
          height: layout
            ? expanded
              ? layout.fullHeight
              : layout.collapsedHeight
            : undefined,
        }}
        onTransitionEnd={(event) => {
          if (
            event.target === event.currentTarget &&
            event.propertyName === "height"
          ) {
            setAnimating(false);
          }
        }}
      >
        <p
          className="
            m-0 min-w-0 whitespace-pre-wrap
            text-[15px] leading-6
            text-zinc-900 wrap-anywhere dark:text-zinc-200
          "
        >
          <span>{showFullText ? displayContent : layout?.collapsedText}</span>

          {hasOverflow && (
            <span className="inline-block align-top  whitespace-nowrap text-[13px] font-medium leading-6">
              {!showFullText && "…"}{" "}
              <button
                type="button"
                aria-controls={contentId}
                aria-expanded={expanded}
                disabled={animating}
                onClick={(event) => {
                  event.stopPropagation();
                  setAnimating(true);
                  setExpanded((previous) => !previous);
                }}
                className={`${buttonClassName} ${showFullText ? "ml-3" : "ml-1"}`}
              >
                {showFullText ? "Read less" : "Read more"}
              </button>
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
// HELPERS

function getInitials(name: string) {
  return Array.from(name.trim())[0]?.toUpperCase() ?? "?";
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function formatTimeAgo(date: Date | string, language: Language): string {
  const time = new Date(date).getTime();

  if (!Number.isFinite(time)) return "";

  const seconds = Math.floor(Math.max(0, Date.now() - time) / 1000);

  const formatter = new Intl.RelativeTimeFormat(language, {
    numeric: "auto",
    style: "short",
  });

  if (seconds < 60) {
    return formatter.format(0, "second");
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return formatter.format(-minutes, "minute");
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return formatter.format(-hours, "hour");
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return formatter.format(-days, "day");
  }

  return new Date(time).toLocaleDateString(language);
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
