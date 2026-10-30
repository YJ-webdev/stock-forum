"use client";

import { useRef, useState, useTransition, type KeyboardEvent } from "react";
import { toast } from "sonner";

import { editReply } from "@/app/actions/post";
import { useCurrentUser } from "@/app/context/user-context";

import { resolveLanguage } from "@/lib/data/languages";
import {
  COMMENT_LABELS,
  COMMENT_EDIT_LABELS,
  REPLY_EDIT_LABELS,
} from "@/lib/data/translations";

import { Button } from "@/components/ui/button";

import { CommentTextarea } from "./comment-textarea";
import { GifButton } from "./gif-button";
import type { GifResult } from "./gif-picker";
import { GifPreview } from "./gif-preview";

interface ReplyEditInputProps {
  replyId: string;
  initialContent: string;
  initialGifUrl: string | null;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}

export function ReplyEditInput({
  replyId,
  initialContent,
  initialGifUrl,
  onCancel,
  onSaved,
}: ReplyEditInputProps) {
  const user = useCurrentUser();
  const language = resolveLanguage(user?.language);

  const labels = REPLY_EDIT_LABELS[language];
  const editLabels = COMMENT_EDIT_LABELS[language];
  const commentLabels = COMMENT_LABELS[language];

  const [content, setContent] = useState(initialContent);
  const [gifUrl, setGifUrl] = useState<string | null>(initialGifUrl);
  const [isPending, startTransition] = useTransition();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submittingRef = useRef(false);

  const isLoggedIn = Boolean(user);

  const isChatRestricted =
    user?.status === "MUTED" || user?.status === "BANNED";

  const inputReadOnly = !isLoggedIn || isChatRestricted || isPending;

  const hasContent = content.trim().length > 0 || Boolean(gifUrl);

  const hasChanges =
    content.trim() !== initialContent.trim() || gifUrl !== initialGifUrl;

  // Allow guests and restricted users to receive access feedback.
  const saveDisabled =
    isPending ||
    (isLoggedIn && !isChatRestricted && (!hasContent || !hasChanges));

  const inputLabel = isLoggedIn ? labels.placeholder : commentLabels.login;

  function handleContentChange(value: string) {
    if (inputReadOnly || submittingRef.current) return;

    setContent(value);
  }

  function handleGifSelect(gif: GifResult) {
    if (inputReadOnly || submittingRef.current) return;

    setGifUrl(gif.src);
  }

  function handleGifRemove() {
    if (inputReadOnly || submittingRef.current) return;

    setGifUrl(null);
  }

  function handleCancel() {
    if (isPending || submittingRef.current) return;

    onCancel();
  }

  function handleSave() {
    if (isPending || submittingRef.current) return;

    if (!isLoggedIn) {
      toast.error(commentLabels.login.replace(/\.{3}$/, ""));
      return;
    }

    if (isChatRestricted) {
      toast.error(commentLabels.restricted);
      return;
    }

    if (!hasContent || !hasChanges) return;

    const submittedContent = content.trim();
    const submittedGifUrl = gifUrl;

    submittingRef.current = true;

    startTransition(async () => {
      try {
        try {
          await editReply({
            replyId,
            content: submittedContent,
            gifUrl: submittedGifUrl,
          });
        } catch (error) {
          toast.error(
            error instanceof Error && error.message
              ? error.message
              : labels.update_failed,
          );

          return;
        }

        toast.success(labels.updated);

        try {
          await onSaved();
        } catch (error) {
          console.error("Failed to update saved reply in the UI:", error);
        }
      } finally {
        submittingRef.current = false;
      }
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (isPending || submittingRef.current || event.nativeEvent.isComposing) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      handleCancel();
      return;
    }

    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleSave();
    }
  }

  return (
    <div className="rounded-lg bg-zinc-100 px-2.5 dark:bg-zinc-800">
      <CommentTextarea
        textareaRef={textareaRef}
        value={content}
        onValueChange={handleContentChange}
        placeholder={inputLabel}
        isLoggedIn={isLoggedIn}
        isChatRestricted={isChatRestricted}
        busy={isPending}
        loginMessage={commentLabels.login}
        restrictedMessage={commentLabels.restricted}
        onKeyDown={handleKeyDown}
      />

      {gifUrl && (
        <GifPreview
          src={gifUrl}
          disabled={inputReadOnly}
          onRemove={handleGifRemove}
        />
      )}

      <div className="flex items-center justify-between gap-2 pb-2">
        <GifButton
          isLoggedIn={isLoggedIn}
          isChatRestricted={isChatRestricted}
          busy={isPending}
          loginMessage={commentLabels.login_gif}
          restrictedMessage={commentLabels.restricted}
          isSubmitting={() => submittingRef.current}
          onSelect={handleGifSelect}
        />

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={handleCancel}
            className="cursor-pointer disabled:cursor-not-allowed"
          >
            {editLabels.cancel}
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={saveDisabled}
            onClick={handleSave}
            className="cursor-pointer disabled:cursor-not-allowed"
          >
            {isPending ? editLabels.saving : editLabels.save}
          </Button>
        </div>
      </div>
    </div>
  );
}
