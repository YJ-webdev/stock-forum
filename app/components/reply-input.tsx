"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { createReply } from "@/app/actions/post";
import { useCurrentUser } from "@/app/context/user-context";

import { resolveLanguage } from "@/lib/data/languages";
import { COMMENT_LABELS, REPLY_INPUT_LABELS } from "@/lib/data/translations";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

import { CommentTextarea } from "./comment-textarea";
import { GifButton } from "./gif-button";

import type { GifResult } from "./gif-picker";
import type { MarketReply } from "./comment";
import { GifPreview } from "./gif-preview";

interface ReplyInputProps {
  commentId: string;
  parentId?: string | null;
  username: string;

  currentUser: {
    name?: string | null;
    image?: string | null;
    language?: string | null;
  } | null;

  onCancel: () => void;
  onReplyCreated: (reply: MarketReply) => void | Promise<void>;
}

const CANCEL_BUTTON_CLASS = `
  shrink-0 cursor-pointer border-none
  bg-transparent text-zinc-800 shadow-none
  transition-colors hover:bg-transparent
  dark:bg-transparent dark:text-zinc-100
  dark:hover:bg-transparent
  disabled:cursor-not-allowed
  disabled:bg-transparent disabled:opacity-50
  dark:disabled:bg-transparent
`;

export function ReplyInput({
  commentId,
  parentId = null,
  username,
  currentUser,
  onCancel,
  onReplyCreated,
}: ReplyInputProps) {
  const user = useCurrentUser();

  const [reply, setReply] = useState("");
  const [selectedGif, setSelectedGif] = useState<GifResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submittingRef = useRef(false);

  const language = resolveLanguage(user?.language ?? currentUser?.language);
  const labels = REPLY_INPUT_LABELS[language];
  const commentLabels = COMMENT_LABELS[language];

  const isLoggedIn = Boolean(user);

  const isChatRestricted =
    user?.status === "BANNED" || user?.status === "MUTED";

  const inputReadOnly = !isLoggedIn || isChatRestricted || isPending;
  const hasContent = reply.trim().length > 0 || Boolean(selectedGif);

  const inputLabel = isLoggedIn
    ? labels.placeholder.replace("{name}", () => username)
    : commentLabels.login;

  const displayName = user?.name ?? currentUser?.name;
  const displayImage = user?.image ?? currentUser?.image;

  const avatarInitial =
    Array.from(displayName?.trim() ?? "")[0]?.toUpperCase() || "G";

  useEffect(() => {
    if (isLoggedIn) return;

    setReply("");
    setSelectedGif(null);
  }, [isLoggedIn]);

  // ---------------------------------------------------------------------------
  // Draft actions
  // ---------------------------------------------------------------------------

  function handleReplyChange(value: string) {
    if (inputReadOnly || submittingRef.current) return;

    setReply(value);
  }

  function handleGifSelect(gif: GifResult) {
    if (inputReadOnly || submittingRef.current) return;

    setSelectedGif(gif);
  }

  function handleGifRemove() {
    if (inputReadOnly || submittingRef.current) return;

    setSelectedGif(null);
  }

  function handleCancel() {
    if (isPending || submittingRef.current) return;

    setReply("");
    setSelectedGif(null);

    onCancel();
  }

  // ---------------------------------------------------------------------------
  // Submission
  // ---------------------------------------------------------------------------

  function handleSubmit() {
    if (isPending || submittingRef.current) return;

    if (!isLoggedIn) {
      toast.error(commentLabels.login.replace(/\.{3}$/, ""));
      return;
    }

    if (isChatRestricted) {
      toast.error(commentLabels.restricted);
      return;
    }

    if (!hasContent) {
      toast.error(labels.empty_reply);
      textareaRef.current?.focus({ preventScroll: true });
      return;
    }

    const content = reply.trim();
    const gifUrl = selectedGif?.src ?? null;

    submittingRef.current = true;

    startTransition(async () => {
      try {
        let result: Awaited<ReturnType<typeof createReply>>;

        try {
          result = await createReply({
            commentId,
            parentId,
            content,
            gifUrl,
          });
        } catch (error) {
          console.error("Failed to create reply:", error);

          toast.error(
            error instanceof Error && error.message
              ? error.message
              : labels.post_failed,
          );

          return;
        }

        setReply("");
        setSelectedGif(null);

        toast.success(labels.posted);

        const newReply: MarketReply = {
          ...result.reply,
          likeCount: 0,
          likedByMe: false,
          replyCount: 0,
        };

        try {
          await onReplyCreated(newReply);
        } catch (error) {
          console.error("Failed to update reply list:", error);
        }
      } finally {
        submittingRef.current = false;
      }
    });
  }

  return (
    <div className="mt-3 mb-8 flex min-w-0 gap-3">
      <Avatar className="size-9 shrink-0" aria-hidden="true">
        <AvatarImage
          src={displayImage ?? undefined}
          alt=""
          className="object-cover"
        />

        <AvatarFallback className="bg-olive-500 text-lg font-normal text-white">
          {avatarInitial}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="rounded-lg bg-zinc-100 px-2.5 dark:bg-zinc-800">
          <CommentTextarea
            textareaRef={textareaRef}
            value={reply}
            onValueChange={handleReplyChange}
            placeholder={inputLabel}
            isLoggedIn={isLoggedIn}
            isChatRestricted={isChatRestricted}
            busy={isPending}
            loginMessage={commentLabels.login}
            restrictedMessage={commentLabels.restricted}
          />

          {isLoggedIn && selectedGif && (
            <GifPreview
              src={selectedGif.src}
              preview={selectedGif.preview}
              title={selectedGif.title}
              disabled={inputReadOnly}
              onRemove={handleGifRemove}
            />
          )}

          <div className="@container flex items-center justify-between gap-2 pb-2">
            <GifButton
              isLoggedIn={isLoggedIn}
              isChatRestricted={isChatRestricted}
              busy={isPending}
              loginMessage={commentLabels.login_gif}
              restrictedMessage={commentLabels.restricted}
              isSubmitting={() => submittingRef.current}
              onSelect={handleGifSelect}
            />

            <div className="flex min-w-0 items-center justify-end gap-2">
              <Button
                type="button"
                size="sm"
                disabled={isPending}
                onClick={handleCancel}
                className={CANCEL_BUTTON_CLASS}
              >
                {labels.cancel}
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={isPending}
                onClick={handleSubmit}
                className="cursor-pointer disabled:cursor-not-allowed"
              >
                {isPending ? labels.replying : labels.reply}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
