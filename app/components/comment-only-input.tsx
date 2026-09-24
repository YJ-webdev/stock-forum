"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { VotingCountdown } from "./voting-countdown";
import { GifPicker, type GifResult } from "@/app/components/gif-picker";
import { toast } from "sonner";
import { createComment } from "../actions/post";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CommentOnlyInputProps {
  assetSymbol: string;

  targetMs: number | null;
  countdownType: "VOTING_OPENS" | "VOTING_CLOSES" | null;
  showCountdown: boolean;
  isMarketOpen: boolean;
  currentUser: {
    name?: string | null;
    image?: string | null;
  } | null;

  onCommentCreated: () => Promise<void>;
}

export function CommentOnlyInput({
  assetSymbol,
  targetMs,
  countdownType,
  showCountdown,
  isMarketOpen,
  onCommentCreated,
  currentUser,
}: CommentOnlyInputProps) {
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [selectedGif, setSelectedGif] = useState<GifResult | null>(null);

  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleComment = () => {
    if (!comment.trim() && !selectedGif) {
      toast.error("Please write a comment or select a GIF.");
      return;
    }

    startTransition(async () => {
      try {
        const content = {
          type: "doc",
          content: [
            ...(comment.trim()
              ? [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: comment.trim(),
                      },
                    ],
                  },
                ]
              : []),

            ...(selectedGif
              ? [
                  {
                    type: "image",
                    attrs: {
                      src: selectedGif.src,
                      alt: selectedGif.title,
                    },
                  },
                ]
              : []),
          ],
        };

        await createComment({
          content,
          assetSymbols: [assetSymbol],
        });

        setComment("");
        setSelectedGif(null);
        setGifPickerOpen(false);

        await onCommentCreated();

        toast.success("Comment added.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to add comment.",
        );
      }
    });
  };

  return (
    <div className="mb-8 flex gap-3">
      <Avatar className="size-9 shrink-0">
        <AvatarImage
          src={currentUser?.image ?? undefined}
          alt={currentUser?.name ?? "User"}
          className="object-cover"
        />

        <AvatarFallback className="text-sm">
          {(currentUser?.name ?? "User").slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="relative rounded-lg bg-zinc-100 px-4 dark:bg-zinc-800">
          {/* Comment */}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={1}
            placeholder="Write a text to add comments..."
            className="
    min-h-11 w-full resize-none
    bg-transparent py-3
    text-[15px] outline-none
    placeholder:text-zinc-500
    placeholder:truncate
  "
          />

          {/* Selected GIF */}
          {selectedGif && (
            <div className="relative mb-3 w-fit max-w-full">
              <img
                src={selectedGif.preview || selectedGif.src}
                alt={selectedGif.title}
                className="
                  block max-h-60 max-w-full
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

          {/* Bottom actions */}
          <div className="@container flex items-center justify-between gap-2 pb-2">
            {/* Left */}
            <div className="relative flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setGifPickerOpen((open) => !open)}
                className="
        cursor-pointer rounded-md
        px-2 py-1
        text-sm font-medium text-zinc-500
        hover:bg-zinc-200
        dark:hover:bg-zinc-700
      "
              >
                GIF
              </button>

              <GifPicker
                open={gifPickerOpen}
                onOpenChange={setGifPickerOpen}
                onSelect={(gif) => {
                  setSelectedGif(gif);
                  setGifPickerOpen(false);
                }}
              />
            </div>

            {/* Right */}
            <div className="flex shrink-0 items-baseline gap-2">
              {showCountdown && countdownType === "VOTING_OPENS" && (
                <div className="hidden @[340px]:block">
                  <VotingCountdown
                    targetMs={targetMs}
                    type={countdownType}
                    showCountdown={showCountdown}
                    isMarketOpen={isMarketOpen}
                  />
                </div>
              )}

              <Button
                type="button"
                size="sm"
                disabled={isPending || (!comment.trim() && !selectedGif)}
                onClick={handleComment}
                className="shrink-0 cursor-pointer"
              >
                {isPending ? "Posting..." : "Comment"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
