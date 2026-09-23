"use client";

import { useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createReply } from "@/app/actions/post";
import { GifPicker, type GifResult } from "@/app/components/gif-picker";

interface ReplyInputProps {
  commentId: string;
  parentId?: string | null;
  username: string;

  currentUser: {
    name?: string | null;
    image?: string | null;
  } | null;

  onCancel: () => void;
  onReplyCreated: (replyId: string) => Promise<void>;
}

export function ReplyInput({
  commentId,
  username,
  currentUser,
  onCancel,
  onReplyCreated,
  parentId = null,
}: ReplyInputProps) {
  const [reply, setReply] = useState("");

  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [selectedGif, setSelectedGif] = useState<GifResult | null>(null);

  const [isPending, startTransition] = useTransition();

  const gifButtonRef = useRef<HTMLButtonElement>(null);

  const handleReply = () => {
    if (!reply.trim() && !selectedGif) {
      toast.error("Please write a reply or select a GIF.");
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

        await onReplyCreated(result.reply.id);

        toast.success("Reply posted.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to post reply.",
        );
      }
    });
  };

  return (
    <div className="mt-3 flex gap-2">
      <Avatar label={currentUser?.name ?? "You"} image={currentUser?.image} />

      <div className="min-w-0 flex-1">
        <div className="relative rounded-lg bg-zinc-100 px-3 dark:bg-zinc-800">
          <textarea
            autoFocus
            rows={1}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={`Reply to ${username}...`}
            className="
              min-h-10 w-full resize-none
              bg-transparent py-2.5
              text-[15px] outline-none
              placeholder:text-zinc-500
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
                onClick={() => setSelectedGif(null)}
                className="
                  absolute right-2 top-2
                  flex size-7 cursor-pointer
                  items-center justify-center
                  rounded-full
                  bg-black/60 text-white
                  hover:bg-black/75
                "
              >
                <X size={15} />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pb-2">
            {/* GIF */}
            <div className="relative">
              <button
                ref={gifButtonRef}
                type="button"
                onClick={() => setGifPickerOpen((open) => !open)}
                className="
                  cursor-pointer rounded-md
                  px-2 py-1
                  text-xs font-medium text-zinc-500
                  hover:bg-zinc-200
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
                onClick={() => {
                  setReply("");
                  setSelectedGif(null);
                  setGifPickerOpen(false);

                  onCancel();
                }}
              >
                Cancel
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={isPending || (!reply.trim() && !selectedGif)}
                onClick={handleReply}
              >
                {isPending ? "Replying..." : "Reply"}
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
