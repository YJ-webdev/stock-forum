"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { VotingCountdown } from "./voting-countdown";
import { GifPicker, type GifResult } from "@/app/components/gif-picker";

import { createComment, type MarketPageComments } from "../actions/post";
import { resolveLanguage } from "@/lib/data/languages";
import { COMMENT_LABELS } from "@/lib/data/translations";

interface CommentOnlyInputProps {
  assetSymbol: string;
  targetMs: number | null;
  countdownType: "VOTING_OPENS" | "VOTING_CLOSES" | null;
  showCountdown: boolean;
  isMarketOpen: boolean;

  currentUser: {
    name?: string | null;
    image?: string | null;
    language?: string | null;
  } | null;

  onCommentCreated: (
    comment: MarketPageComments[number],
  ) => void | Promise<void>;
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

  const userLanguage = resolveLanguage(currentUser?.language);
  const commentLabels = COMMENT_LABELS[userLanguage];

  const requireLogin = () => {
    if (currentUser) return true;

    toast.error(commentLabels.login.replace(/\.{3}$/, ""), {
      id: "login-required",
    });

    return false;
  };

  const handleComment = () => {
    if (isPending || !requireLogin()) return;
    if (!comment.trim() && !selectedGif) return;

    startTransition(async () => {
      let createdComment: MarketPageComments[number] | undefined;

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

        const result = await createComment({
          content,
          assetSymbols: [assetSymbol],
        });

        createdComment = result.comment ?? undefined;
      } catch (error) {
        console.error("Failed to create comment:", error);
        toast.error(commentLabels.failed);
        return;
      }

      setComment("");
      setSelectedGif(null);
      setGifPickerOpen(false);

      toast.success(commentLabels.success);

      if (createdComment) {
        try {
          await onCommentCreated(createdComment);
        } catch (error) {
          console.error("Failed to update comment list:", error);
        }
      }
    });
  };

  return (
    <div className="mb-8 flex gap-3">
      <Avatar className="size-9 shrink-0" aria-hidden="true">
        <AvatarImage
          src={currentUser?.image ?? undefined}
          alt=""
          className="object-cover"
        />

        <AvatarFallback className="text-sm">
          {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : "G"}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="relative rounded-lg bg-zinc-100 px-4 dark:bg-zinc-800">
          <textarea
            value={comment}
            onChange={(event) => {
              if (!currentUser) return;
              setComment(event.target.value);
            }}
            readOnly={!currentUser}
            disabled={isPending}
            tabIndex={currentUser ? 0 : -1}
            aria-label={commentLabels.comment}
            onFocus={(event) => {
              if (!currentUser) {
                event.currentTarget.blur();
              }
            }}
            onClick={() => {
              if (!currentUser) requireLogin();
            }}
            rows={1}
            placeholder={
              currentUser ? commentLabels.write : commentLabels.login
            }
            className={`
              min-h-11 w-full resize-none
              bg-transparent py-3 text-[15px] outline-none
              placeholder:truncate placeholder:text-zinc-500
              disabled:opacity-50
              ${!currentUser ? "cursor-default caret-transparent" : ""}
            `}
          />

          {selectedGif && (
            <div className="relative mb-3 w-fit max-w-full">
              <img
                src={selectedGif.preview || selectedGif.src}
                alt={selectedGif.title}
                className="block max-h-60 max-w-full rounded-lg object-contain"
              />

              <button
                type="button"
                disabled={isPending}
                onClick={() => setSelectedGif(null)}
                aria-label="GIF ×"
                className="
                  absolute right-2 top-2
                  flex size-7 cursor-pointer items-center justify-center
                  rounded-full bg-black/60 text-white
                  hover:bg-black/75
                  disabled:cursor-default disabled:opacity-50
                "
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>
          )}

          <div className="@container flex items-center justify-between gap-2 pb-2">
            <div className="relative flex shrink-0 items-center gap-1">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  if (!requireLogin()) return;
                  setGifPickerOpen((open) => !open);
                }}
                className="
                  cursor-pointer rounded-md px-2 py-1
                  text-sm font-medium text-zinc-500
                  hover:bg-zinc-200 dark:hover:bg-zinc-700
                  disabled:cursor-default disabled:opacity-50
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

            <div className="flex shrink-0 items-baseline gap-2">
              {showCountdown && countdownType === "VOTING_OPENS" && (
                <div className="hidden @[340px]:block">
                  <VotingCountdown
                    targetMs={targetMs}
                    type={countdownType}
                    showCountdown={showCountdown}
                    isMarketOpen={isMarketOpen}
                    userLanguage={userLanguage}
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
                {isPending ? commentLabels.posting : commentLabels.comment}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
