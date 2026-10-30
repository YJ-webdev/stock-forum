"use client";

import type { JSONContent } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { RiHeartFill } from "react-icons/ri";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { toggleCommentLike } from "@/app/actions/like";
import {
  deleteComment,
  getCommentReplies,
  hideComment,
  reportComment,
  restoreComment,
  type MarketPageComments,
} from "@/app/actions/post";

import { resolveLanguage } from "@/lib/data/languages";
import {
  COMMENT_ACTION_LABELS,
  COMMENT_VIEW_LABELS,
  CONTENT_RESULT_LABELS,
  CONTENT_STATUS_LABELS,
} from "@/lib/data/translations";

import { formatTimeAgo } from "@/lib/utils/format-time-ago";
import { isDeletedPredictionContent } from "@/lib/utils/is-deleted-prediction-content";
import { getErrorMessage } from "@/lib/utils/get-error-message";

import { ContentActionsMenu } from "./content-actions-menu";
import { UserProfileTrigger, type ProfileUser } from "./profile-card";
import { ReplyItem, ReplyTextContent } from "./reply-item";

import type { MarketReply } from "./comment";
import dynamic from "next/dynamic";

const CommentEditInput = dynamic(() =>
  import("./comment-edit-input").then((module) => module.CommentEditInput),
);

const PredictionCommentEditInput = dynamic(() =>
  import("./prediction-comment-edit-input").then(
    (module) => module.PredictionCommentEditInput,
  ),
);

const ReplyInput = dynamic(() =>
  import("./reply-input").then((module) => module.ReplyInput),
);

type Comment = MarketPageComments[number];

export type CommentUser = {
  id: string;
  role?: string | null;
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
  onBanRequest?: (target: ProfileUser) => void;

  onPredictionEdited?: (prediction: NonNullable<Comment["prediction"]>) => void;
}

export function CommentItem({
  comment,
  currentUser,
  onUpdate,
  onRemove,
  onPredictionEdited,
  targetCommentId,
  targetReplyId,
  shouldOpenReplies,
  highlightTargetComment,
  marketname,
  marketSymbol,
}: CommentItemProps) {
  const currentUserId = currentUser?.id;
  const language = resolveLanguage(currentUser?.language);

  const labels = COMMENT_VIEW_LABELS[language];
  const actionLabels = COMMENT_ACTION_LABELS[language];
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
  const [editingPrediction, setEditingPrediction] = useState(false);
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

  const initialEditContent: JSONContent = isDeletedPredictionComment
    ? {
        type: "doc",
        content: [{ type: "paragraph" }],
      }
    : comment.content;

  const profileTarget = {
    id: comment.author.id,
    name: username,
    image: comment.author.image ?? null,
  };

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
    if (!shouldOpenReplies) return;

    setShowReplies(true);

    if (!repliesLoaded) {
      void loadReplies();
    }
  }, [shouldOpenReplies, repliesLoaded, loadReplies]);

  useEffect(() => {
    if (targetCommentId !== comment.id) return;

    const frame = requestAnimationFrame(() => {
      const element = commentRef.current;

      if (!element) return;

      let scrollContainer = element.parentElement;

      while (scrollContainer) {
        const { overflowY } = getComputedStyle(scrollContainer);

        if (
          /^(auto|scroll|overlay)$/.test(overflowY) &&
          scrollContainer.scrollHeight > scrollContainer.clientHeight
        ) {
          break;
        }

        scrollContainer = scrollContainer.parentElement;
      }

      const height = scrollContainer?.clientHeight ?? window.innerHeight;

      element.style.scrollMarginTop = `${height * 0.25}px`;

      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [targetCommentId, comment.id]);

  useEffect(() => {
    setLikedByMe(comment.likedByMe);
    setLikeCount(comment.likeCount);
  }, [comment.id, comment.likedByMe, comment.likeCount]);

  // Leave edit mode if the viewer changes.
  useEffect(() => {
    setIsEditing(false);
    setEditingPrediction(false);
  }, [comment.id, currentUserId]);

  const handleEdit = () => {
    if (!isAuthor || comment.withdrawnAt || comment.moderatedAt) {
      return;
    }

    setEditingPrediction(Boolean(comment.prediction));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingPrediction(false);
  };

  const handleDelete = async () => {
    if (isDeleting) return;

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
    if (isModerating) return;

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
    if (isModerating) return;

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

        onUpdate(comment.id, (current) => ({
          ...current,
          likedByMe: result.liked,
          likeCount: result.likeCount,
        }));

        toast.success(result.liked ? labels.like : labels.unlike);
      } catch (error) {
        setLikedByMe(previousLiked);
        setLikeCount(previousCount);

        toast.error(getErrorMessage(error, labels.action_failed));
      }
    });
  };

  const handleReportComment = async () => {
    if (isReporting) return;

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

  const showEditor =
    isEditing && isAuthor && !comment.withdrawnAt && !comment.moderatedAt;

  const avatar = (
    <Avatar className="size-9">
      <AvatarImage
        src={comment.author.image ?? undefined}
        alt={username}
        className="object-cover"
      />

      <AvatarFallback className="bg-olive-500 text-[22px] font-normal text-white">
        {Array.from(username)[0]?.toUpperCase() ??
          Array.from(labels.guest)[0]?.toUpperCase() ??
          "?"}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <div
      ref={commentRef}
      id={`comment-${comment.id}`}
      className={`
        relative -mx-4 -my-3 scroll-mt-0 px-4 py-4
        transition-colors
        ${showEditor ? "" : "hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50"}
        ${isHighlighted ? "bg-amber-50/80 dark:bg-olive-800" : ""}
      `}
    >
      {showEditor ? (
        editingPrediction && comment.prediction ? (
          <PredictionCommentEditInput
            key={`prediction-edit:${comment.id}:${comment.prediction.id}`}
            commentId={comment.id}
            prediction={comment.prediction}
            initialContent={initialEditContent}
            onCancel={handleCancelEdit}
            onSaved={(result) => {
              onUpdate(comment.id, (current) => ({
                ...current,
                content: result.content,
                editedAt: result.editedAt,
                prediction: result.prediction ?? current.prediction,
              }));

              if (result.prediction) {
                onPredictionEdited?.(result.prediction);
              }

              handleCancelEdit();
            }}
          />
        ) : (
          <div className="flex min-w-0 gap-3">
            <div className="shrink-0">{avatar}</div>

            <div className="min-w-0 flex-1">
              <CommentEditInput
                key={`comment-edit:${comment.id}`}
                commentId={comment.id}
                initialContent={initialEditContent}
                onCancel={handleCancelEdit}
                onSaved={(result) => {
                  onUpdate(comment.id, (current) => ({
                    ...current,
                    content: result.content,
                    editedAt: result.editedAt,
                  }));

                  handleCancelEdit();
                }}
              />
            </div>
          </div>
        )
      ) : (
        <div className="z-1 flex gap-3">
          <UserProfileTrigger
            target={profileTarget}
            currentUserId={currentUserId}
            language={language}
            isAdmin={isAdmin}
          >
            <button
              type="button"
              aria-label={username}
              className="
                relative z-10 size-9 shrink-0 self-start
                cursor-pointer rounded-full
                focus-visible:outline-none
                focus-visible:ring-2 focus-visible:ring-zinc-400
                focus-visible:ring-offset-2
              "
            >
              {avatar}
            </button>
          </UserProfileTrigger>

          <div className="min-w-0 flex-1">
            <div className="group/comment relative min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <UserProfileTrigger
                  target={profileTarget}
                  currentUserId={currentUserId}
                  language={language}
                  isAdmin={isAdmin}
                >
                  <button
                    type="button"
                    className="
                      min-w-0 max-w-full shrink cursor-pointer
                      rounded-sm text-start
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-zinc-400
                    "
                  >
                    <span className="block truncate text-[14px] dark:text-muted-foreground font-semibold hover:underline">
                      {username}
                    </span>
                  </button>
                </UserProfileTrigger>

                {marketname && marketSymbol && (
                  <Link
                    href={`/market/${encodeURIComponent(marketSymbol)}`}
                    className="flex shrink-0 items-center gap-2 whitespace-nowrap"
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
                  <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
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

                      {comment.prediction.pointsBet > 0 && (
                        <span className="tabular-nums">
                          {" · "}
                          {comment.prediction.pointsBet.toLocaleString(
                            language,
                          )}
                        </span>
                      )}
                    </span>
                  </div>
                )}

                <span className="min-w-0 shrink truncate text-[13px]  text-zinc-600  dark:text-zinc-400">
                  {formatTimeAgo(comment.createdAt, language)}
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
              ) : isDeletedPredictionComment ? (
                <p className="mt-1 text-[15px] italic text-zinc-400">
                  {statusLabels.deleted_comment}
                </p>
              ) : (
                <div className="mt-0.5 min-w-0">
                  <CommentTextContent
                    content={comment.content}
                    editedLabel={comment.editedAt ? labels.edited : undefined}
                    readMoreLabel={labels.read_more}
                    readLessLabel={labels.read_less}
                  />
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
                      hover:text-zinc-900 disabled:cursor-default
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
                      cursor-pointer text-sm font-medium
                      text-zinc-400 hover:text-zinc-900
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
                    flex -translate-x-2 cursor-pointer
                    items-center gap-2 rounded-xl px-2
                    text-sm font-semibold text-zinc-600
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
                                  left-2 top-0 bottom-0 w-px
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
                            aria-label={labels.collapse_replies}
                            {...threadEvents}
                            className="
                                absolute -left-9.5 top-0 z-0
                                h-4 w-10 cursor-pointer
                              "
                          >
                            <span
                              className={`
                                  pointer-events-none absolute
                                  left-2 top-0 h-4 w-8
                                  rounded-bl-xl border-b border-l
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
      )}
    </div>
  );
}

function CommentTextContent({
  content,
  editedLabel,
  readMoreLabel,
  readLessLabel,
}: {
  content: JSONContent;
  editedLabel?: string;
  readMoreLabel: string;
  readLessLabel: string;
}) {
  const paragraphs: string[] = [];
  const images: { src: string; alt: string }[] = [];

  for (const node of content.content ?? []) {
    if (node.type === "paragraph") {
      paragraphs.push(getCommentParagraphText(node));
    }

    if (
      node.type === "image" &&
      typeof node.attrs?.src === "string" &&
      node.attrs.src
    ) {
      images.push({
        src: node.attrs.src,
        alt: typeof node.attrs.alt === "string" ? node.attrs.alt : "GIF",
      });
    }
  }

  const text = paragraphs.join("\n").trimEnd();

  return (
    <>
      {text && (
        <ReplyTextContent
          key={text}
          content={text}
          editedLabel={editedLabel}
          readMoreLabel={readMoreLabel}
          readLessLabel={readLessLabel}
        />
      )}

      {images.map((image, index) => (
        <img
          key={`${image.src}-${index}`}
          src={image.src}
          alt={image.alt}
          loading="lazy"
          decoding="async"
          className="
            mt-3 h-auto w-45 max-w-full
            rounded-lg object-contain
          "
        />
      ))}

      {!text && editedLabel && (
        <span className="mt-1 block text-[12px] text-zinc-400">
          {editedLabel}
        </span>
      )}
    </>
  );
}

function getCommentParagraphText(node: JSONContent): string {
  if (node.type === "text") {
    return node.text ?? "";
  }

  if (node.type === "hardBreak") {
    return "\n";
  }

  return (node.content ?? []).map(getCommentParagraphText).join("");
}
