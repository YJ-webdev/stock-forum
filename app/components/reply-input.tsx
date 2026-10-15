"use client";

import { useLayoutEffect, useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createReply } from "@/app/actions/post";
import { GifPicker, type GifResult } from "@/app/components/gif-picker";
import { useCurrentUser } from "@/app/context/user-context";

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

const MAX_TEXTAREA_HEIGHT = 240;

export function ReplyInput({
  commentId,
  username,
  currentUser,
  onCancel,
  onReplyCreated,
  parentId = null,
}: ReplyInputProps) {
  const user = useCurrentUser();

  const language = resolveLanguage(user?.language ?? currentUser?.language);

  const labels = REPLY_INPUT_LABELS[language];
  const actionLabels = COMMENT_ACTION_LABELS[language];

  const [reply, setReply] = useState("");
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [selectedGif, setSelectedGif] = useState<GifResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const gifButtonRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submittingRef = useRef(false);

  const isChatRestricted = user?.status === "BANNED";
  const editorDisabled = isPending || isChatRestricted;

  const placeholder = labels.placeholder.replace("{name}", () => username);
  const hasContent = reply.trim().length > 0 || Boolean(selectedGif);
  const submitDisabled = editorDisabled || !hasContent;

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
  }, [reply]);

  function handleGifSelect(gif: GifResult) {
    if (editorDisabled || submittingRef.current) return;

    setSelectedGif(gif);
    setGifPickerOpen(false);
  }

  function handleReply() {
    if (editorDisabled || submittingRef.current) return;

    if (!user) {
      toast.error(actionLabels.login_required);
      return;
    }

    if (!hasContent) {
      toast.error(labels.empty_reply);
      return;
    }

    submittingRef.current = true;
    setGifPickerOpen(false);

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
      } finally {
        submittingRef.current = false;
      }
    });
  }

  function handleCancel() {
    if (isPending || submittingRef.current) return;

    setReply("");
    setSelectedGif(null);
    setGifPickerOpen(false);

    onCancel();
  }

  return (
    <div className="mt-3 flex gap-2">
      <Avatar
        label={user?.name ?? currentUser?.name ?? labels.guest}
        image={user?.image ?? currentUser?.image}
      />

      <div className="min-w-0 flex-1">
        <div className="relative rounded-lg bg-zinc-100 px-3 dark:bg-zinc-800">
          {/* Text */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={reply}
            disabled={editorDisabled}
            onChange={(event) => {
              if (editorDisabled || submittingRef.current) return;

              setReply(event.target.value);
            }}
            placeholder={placeholder}
            aria-label={placeholder}
            className="
              content-scrollbar block min-h-10 w-full resize-none
              overflow-hidden bg-transparent py-2.5
              text-[15px] leading-6 outline-none
              placeholder:text-zinc-500
              disabled:cursor-not-allowed disabled:opacity-50
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
                disabled={editorDisabled}
                onClick={() => {
                  if (editorDisabled || submittingRef.current) return;

                  setSelectedGif(null);
                }}
                aria-label={labels.remove_gif}
                title={labels.remove_gif}
                className="
                  absolute top-2 right-2
                  flex size-7 cursor-pointer items-center justify-center
                  rounded-full bg-black/60 text-white
                  hover:bg-black/75
                  disabled:cursor-not-allowed disabled:opacity-50
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
                disabled={editorDisabled}
                onClick={() => {
                  if (editorDisabled || submittingRef.current) return;

                  setGifPickerOpen((open) => !open);
                }}
                aria-label={labels.select_gif}
                title={labels.select_gif}
                aria-expanded={!editorDisabled && gifPickerOpen}
                className="
                  cursor-pointer rounded-md px-2 py-1
                  text-xs font-medium text-zinc-500
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
                  triggerRef={gifButtonRef}
                  onSelect={handleGifSelect}
                />
              )}
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
                disabled={submitDisabled}
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
        flex size-8 shrink-0 items-center justify-center
        rounded-full bg-zinc-200
        text-xs font-medium text-zinc-700
        dark:bg-zinc-700 dark:text-zinc-200
      "
    >
      {Array.from(label).slice(0, 2).join("").toUpperCase()}
    </div>
  );
}
