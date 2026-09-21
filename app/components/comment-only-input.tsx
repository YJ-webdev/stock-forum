"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { VotingCountdown } from "./voting-countdown";
import { GifPicker, type GifResult } from "@/app/components/gif-picker";

interface CommentOnlyInputProps {
  targetMs: number | null;
  countdownType: "VOTING_OPENS" | "VOTING_CLOSES" | null;
  showCountdown: boolean;
  isMarketOpen: boolean;
}

export function CommentOnlyInput({
  targetMs,
  countdownType,
  showCountdown,
  isMarketOpen,
}: CommentOnlyInputProps) {
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [selectedGif, setSelectedGif] = useState<GifResult | null>(null);

  return (
    <div className="mb-8 flex gap-3">
      <Avatar label="YJ" />

      <div className="min-w-0 flex-1">
        <div className="relative rounded-lg bg-zinc-100 px-4 dark:bg-zinc-800">
          {/* Comment */}
          <textarea
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
                className="shrink-0 cursor-pointer"
              >
                Comment
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Avatar({ label }: { label: string }) {
  return (
    <div
      className="
        flex size-9 shrink-0
        items-center justify-center
        rounded-full
        bg-zinc-200
        text-sm font-medium text-zinc-700
        dark:bg-zinc-700 dark:text-zinc-200
      "
    >
      {label.slice(0, 2).toUpperCase()}
    </div>
  );
}
