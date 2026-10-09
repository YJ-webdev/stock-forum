"use client";

import { useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createReply } from "@/app/actions/post";
import { GifPicker, type GifResult } from "@/app/components/gif-picker";

import { resolveLanguage } from "@/lib/data/languages";
import {
  COMMENT_ACTION_LABELS,
  REPLY_INPUT_LABELS,
} from "@/lib/data/translations";

import type { MarketReply } from "./comment";

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

export function ReplyInput({
  commentId,
  username,
  currentUser,
  onCancel,
  onReplyCreated,
  parentId = null,
}: ReplyInputProps) {
  const language = resolveLanguage(currentUser?.language);
  const labels = REPLY_INPUT_LABELS[language];
  const actionLabels = COMMENT_ACTION_LABELS[language];

  const [reply, setReply] = useState("");
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [selectedGif, setSelectedGif] = useState<GifResult | null>(null);

  const [isPending, startTransition] = useTransition();

  const gifButtonRef = useRef<HTMLButtonElement>(null);

  const placeholder = labels.placeholder.replace("{name}", username);
  const hasContent = reply.trim().length > 0 || Boolean(selectedGif);

  // ---------------------------------------------------------------------------
  // SUBMIT
  // ---------------------------------------------------------------------------

  const handleReply = () => {
    if (isPending) return;

    if (!currentUser) {
      toast.error(actionLabels.login_required);
      return;
    }

    if (!hasContent) {
      toast.error(labels.empty_reply);
      return;
    }

    startTransition(async () => {
      try {
        const result = await createReply({
          commentId,
          parentId,
          content: reply.trim(),
          gifUrl: selectedGif?.src ?? null,
        });

        setReply("");
        setSelectedGif(null);
        setGifPickerOpen(false);

        const newReply: MarketReply = {
          ...result.reply,
          likeCount: 0,
          likedByMe: false,
          replyCount: 0,
        };

        await onReplyCreated(newReply);

        toast.success(labels.posted);
      } catch (error) {
        toast.error(
          error instanceof Error && error.message
            ? error.message
            : labels.post_failed,
        );
      }
    });
  };

  const handleCancel = () => {
    setReply("");
    setSelectedGif(null);
    setGifPickerOpen(false);

    onCancel();
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="mt-3 flex gap-2">
      <Avatar
        label={currentUser?.name ?? labels.guest}
        image={currentUser?.image}
      />

      <div className="min-w-0 flex-1">
        <div className="relative rounded-lg bg-zinc-100 px-3 dark:bg-zinc-800">
          <textarea
            rows={1}
            value={reply}
            disabled={isPending}
            onChange={(event) => setReply(event.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="
              min-h-10 w-full resize-none
              bg-transparent py-2.5
              text-[15px] outline-none
              placeholder:text-zinc-500
              disabled:opacity-50
            "
          />

          {/* Selected GIF */}
          {selectedGif && (
            <div className="relative mb-3 w-fit max-w-full">
              <img
                src={selectedGif.preview || selectedGif.src}
                alt={selectedGif.title}
                className="
                  block max-h-52 max-w-full
                  rounded-lg object-contain
                "
              />

              <button
                type="button"
                disabled={isPending}
                onClick={() => setSelectedGif(null)}
                aria-label={labels.remove_gif}
                title={labels.remove_gif}
                className="
                  absolute right-2 top-2
                  flex size-7 cursor-pointer
                  items-center justify-center
                  rounded-full
                  bg-black/60 text-white
                  hover:bg-black/75
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pb-2">
            {/* GIF */}
            <div className="relative">
              <button
                ref={gifButtonRef}
                type="button"
                disabled={isPending}
                onClick={() => setGifPickerOpen((open) => !open)}
                aria-label={labels.select_gif}
                title={labels.select_gif}
                aria-expanded={gifPickerOpen}
                className="
                  cursor-pointer rounded-md
                  px-2 py-1
                  text-xs font-medium text-zinc-500
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
                triggerRef={gifButtonRef}
                onSelect={(gif) => {
                  if (isPending) return;

                  setSelectedGif(gif);
                  setGifPickerOpen(false);
                }}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={handleCancel}
                className="cursor-pointer disabled:cursor-not-allowed"
              >
                {labels.cancel}
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={isPending || !hasContent}
                onClick={handleReply}
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
      role="img"
      aria-label={label}
      className="
        flex size-8 shrink-0
        items-center justify-center
        rounded-full
        bg-zinc-200
        text-xs font-medium text-zinc-700
        dark:bg-zinc-700 dark:text-zinc-200
      "
    >
      {label.slice(0, 2).toUpperCase()}
    </div>
  );
}
