"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
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

const MAX_TEXTAREA_HEIGHT = 240;

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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gifButtonRef = useRef<HTMLButtonElement>(null);
  const submittingRef = useRef(false);

  const isChatRestricted = user?.status === "BANNED";
  const editorDisabled = isPending || isChatRestricted;

  const hasContent = content.trim().length > 0 || Boolean(gifUrl);

  const hasChanges =
    content.trim() !== initialContent.trim() || gifUrl !== initialGifUrl;

  const saveDisabled = editorDisabled || !hasContent || !hasChanges;

  useLayoutEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    function resizeTextarea() {
      if (!textarea) return;

      textarea.style.height = "auto";

      const contentHeight = textarea.scrollHeight;

      textarea.style.height = `${Math.min(
        contentHeight,
        MAX_TEXTAREA_HEIGHT,
      )}px`;

      textarea.style.overflowY =
        contentHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
    }

    resizeTextarea();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", resizeTextarea);

      return () => {
        window.removeEventListener("resize", resizeTextarea);
      };
    }

    let previousWidth = textarea.getBoundingClientRect().width;

    const observer = new ResizeObserver(() => {
      const width = textarea.getBoundingClientRect().width;

      if (width === previousWidth) return;

      previousWidth = width;
      resizeTextarea();
    });

    observer.observe(textarea);

    return () => observer.disconnect();
  }, [content]);

  function handleCancel() {
    if (isPending || submittingRef.current) return;

    onCancel();
  }

  function handleGifSelect(gif: GifResult) {
    if (editorDisabled || submittingRef.current) return;

    setGifUrl(gif.src);
    setGifPickerOpen(false);
  }

  function handleSave() {
    if (saveDisabled || submittingRef.current) return;

    submittingRef.current = true;
    setGifPickerOpen(false);

    startTransition(async () => {
      try {
        await editReply({
          replyId,
          content: content.trim(),
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
      } finally {
        submittingRef.current = false;
      }
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (isPending || event.nativeEvent.isComposing) return;

    if (event.key === "Escape") {
      event.preventDefault();
      handleCancel();
      return;
    }

    if (isChatRestricted) return;

    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleSave();
    }
  }

  return (
    <div className="rounded-lg bg-zinc-100 px-3 pt-3 dark:bg-zinc-800">
      {/* Text */}
      <textarea
        ref={textareaRef}
        rows={1}
        value={content}
        disabled={editorDisabled}
        onChange={(event) => {
          if (editorDisabled || submittingRef.current) return;

          setContent(event.target.value);
        }}
        onKeyDown={handleKeyDown}
        placeholder={labels.placeholder}
        aria-label={labels.placeholder}
        style={{
          marginBottom: 16,
          overflowX: "hidden",
        }}
        className="
          content-scrollbar block min-h-10 w-full resize-none
          overflow-hidden bg-transparent
          text-[15px] leading-6 outline-none
          placeholder:text-zinc-400
          disabled:cursor-not-allowed disabled:opacity-60
        "
      />

      {/* GIF preview */}
      {gifUrl && (
        <div className="relative mb-2 w-fit max-w-full">
          <img
            src={gifUrl}
            alt="GIF"
            className="
              block max-h-52 w-auto max-w-full
              rounded-lg object-contain
            "
          />

          <button
            type="button"
            disabled={editorDisabled}
            onClick={() => {
              if (editorDisabled || submittingRef.current) return;

              setGifUrl(null);
            }}
            aria-label={editLabels.remove_gif}
            title={editLabels.remove_gif}
            className="
              absolute top-2 right-2
              flex size-7 cursor-pointer items-center justify-center
              rounded-full bg-black/60 text-white
              transition-colors hover:bg-black/75
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Bottom actions */}
      <div className="flex items-center justify-between gap-2 pb-2">
        <div className="relative">
          <button
            ref={gifButtonRef}
            type="button"
            disabled={editorDisabled}
            onClick={() => {
              if (editorDisabled || submittingRef.current) return;

              setGifPickerOpen((previous) => !previous);
            }}
            aria-label={editLabels.select_gif}
            title={editLabels.select_gif}
            aria-expanded={!editorDisabled && gifPickerOpen}
            className="
              cursor-pointer rounded-md px-2 py-1
              text-sm font-medium text-zinc-500
              hover:bg-zinc-200
              disabled:cursor-not-allowed disabled:opacity-50
              dark:hover:bg-zinc-700
            "
          >
            GIF
          </button>

          {!editorDisabled && (
            <GifPicker
              open={gifPickerOpen}
              onOpenChange={setGifPickerOpen}
              onSelect={handleGifSelect}
              triggerRef={gifButtonRef}
            />
          )}
        </div>

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
