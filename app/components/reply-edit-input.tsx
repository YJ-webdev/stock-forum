"use client";

import { useRef, useState, useTransition, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { editReply } from "@/app/actions/post";
import { useCurrentUser } from "@/app/context/user-context";

import { resolveLanguage } from "@/lib/data/languages";
import {
  COMMENT_EDIT_LABELS,
  REPLY_EDIT_LABELS,
} from "@/lib/data/translations";

import { GifPicker, type GifResult } from "./gif-picker";

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

  const [content, setContent] = useState(initialContent);
  const [gifUrl, setGifUrl] = useState<string | null>(initialGifUrl);

  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const gifButtonRef = useRef<HTMLButtonElement>(null);

  const hasContent = content.trim().length > 0 || Boolean(gifUrl);

  // ---------------------------------------------------------------------------
  // GIF
  // ---------------------------------------------------------------------------

  const handleGifSelect = (gif: GifResult) => {
    if (isPending) return;

    setGifUrl(gif.src);
    setGifPickerOpen(false);
  };

  // ---------------------------------------------------------------------------
  // SAVE
  // ---------------------------------------------------------------------------

  const handleSave = () => {
    if (isPending) return;

    const trimmedContent = content.trim();

    if (!trimmedContent && !gifUrl) {
      toast.error(labels.empty_reply);
      return;
    }

    startTransition(async () => {
      try {
        await editReply({
          replyId,
          content: trimmedContent,
          gifUrl,
        });

        await onSaved();

        toast.success(labels.updated);
      } catch (error) {
        toast.error(
          error instanceof Error && error.message
            ? error.message
            : labels.update_failed,
        );
      }
    });
  };

  // ---------------------------------------------------------------------------
  // KEYBOARD
  // ---------------------------------------------------------------------------

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isPending || event.nativeEvent.isComposing) return;

    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }

    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleSave();
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="mt-2 rounded-lg bg-zinc-100 px-3 dark:bg-zinc-800">
      {/* Text */}
      <textarea
        rows={1}
        value={content}
        disabled={isPending}
        onChange={(event) => setContent(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={labels.placeholder}
        aria-label={labels.placeholder}
        className="
          min-h-10 w-full resize-none
          bg-transparent py-2.5
          text-[15px] leading-6
          outline-none
          placeholder:text-zinc-400
          disabled:opacity-60
        "
      />

      {/* GIF preview */}
      {gifUrl && (
        <div className="relative mb-3 w-fit max-w-full">
          <img
            src={gifUrl}
            alt="GIF"
            className="
              block max-h-52
              w-auto max-w-full
              rounded-lg object-contain
            "
          />

          <button
            type="button"
            disabled={isPending}
            onClick={() => setGifUrl(null)}
            aria-label={editLabels.remove_gif}
            title={editLabels.remove_gif}
            className="
              absolute top-2 right-2
              flex size-7
              cursor-pointer items-center justify-center
              rounded-full
              bg-black/60 text-white
              transition-colors
              hover:bg-black/75
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Bottom actions */}
      <div className="flex items-center justify-between gap-2 pb-2">
        {/* GIF */}
        <div className="relative">
          <button
            ref={gifButtonRef}
            type="button"
            disabled={isPending}
            onClick={() => setGifPickerOpen((previous) => !previous)}
            aria-label={editLabels.select_gif}
            title={editLabels.select_gif}
            aria-expanded={gifPickerOpen}
            className="
              cursor-pointer rounded-md
              px-2 py-1
              text-sm font-medium
              text-zinc-500
              hover:bg-zinc-200
              disabled:cursor-not-allowed
              disabled:opacity-50
              dark:hover:bg-zinc-700
            "
          >
            GIF
          </button>

          <GifPicker
            open={gifPickerOpen}
            onOpenChange={setGifPickerOpen}
            onSelect={handleGifSelect}
            triggerRef={gifButtonRef}
          />
        </div>

        {/* Cancel / Save */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={onCancel}
            className="cursor-pointer disabled:cursor-not-allowed"
          >
            {editLabels.cancel}
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={isPending || !hasContent}
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
