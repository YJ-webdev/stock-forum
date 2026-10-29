"use client";

import { useLayoutEffect, useRef, useState, useTransition } from "react";
import type { JSONContent } from "@tiptap/react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { VotingCountdown } from "./voting-countdown";

import { createComment, type MarketPageComments } from "../actions/post";
import { useCurrentUser } from "@/app/context/user-context";

import { resolveLanguage } from "@/lib/data/languages";
import { COMMENT_LABELS } from "@/lib/data/translations";

import dynamic from "next/dynamic";
import type { GifResult } from "./gif-picker";

const GifPicker = dynamic(
  () => import("./gif-picker").then((module) => module.GifPicker),
  {
    ssr: false,
  },
);

interface CommentOnlyInputProps {
  initialComment?: string;

  submitComment?: (input: {
    content: JSONContent;
    assetSymbols: string[];
  }) => ReturnType<typeof createComment>;

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

const MAX_TEXTAREA_HEIGHT = 240;

export function CommentOnlyInput({
  assetSymbol,
  targetMs,
  countdownType,
  showCountdown,
  isMarketOpen,
  onCommentCreated,
  currentUser,
  initialComment = "",
  submitComment = createComment,
}: CommentOnlyInputProps) {
  const user = useCurrentUser();

  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [selectedGif, setSelectedGif] = useState<GifResult | null>(null);
  const [comment, setComment] = useState(initialComment);
  const [isPending, startTransition] = useTransition();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gifButtonRef = useRef<HTMLButtonElement>(null);
  const submittingRef = useRef(false);

  const userLanguage = resolveLanguage(user?.language ?? currentUser?.language);
  const commentLabels = COMMENT_LABELS[userLanguage];

  const isLoggedIn = Boolean(user);
  const isChatRestricted =
    user?.status === "BANNED" || user?.status === "MUTED";
  const editorDisabled = isPending || isChatRestricted;
  const hasContent = comment.trim().length > 0 || Boolean(selectedGif);

  const displayName = user?.name ?? currentUser?.name;
  const displayImage = user?.image ?? currentUser?.image;

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
  }, [comment]);

  function requireLogin() {
    if (isLoggedIn) return true;

    toast.error(commentLabels.login.replace(/\.{3}$/, ""), {
      id: "login-required",
    });

    return false;
  }

  function handleGifSelect(gif: GifResult) {
    if (editorDisabled || submittingRef.current || !requireLogin()) {
      return;
    }

    setSelectedGif(gif);
    setGifPickerOpen(false);
  }

  function handleComment() {
    if (editorDisabled || submittingRef.current || !requireLogin()) {
      return;
    }

    if (!hasContent) return;

    submittingRef.current = true;
    setGifPickerOpen(false);

    startTransition(async () => {
      try {
        const text = comment.trim();
        const nodes: JSONContent[] = [];

        if (text) {
          for (const line of text.split(/\r\n|\r|\n/)) {
            nodes.push({
              type: "paragraph",
              content: line ? [{ type: "text", text: line }] : [],
            });
          }
        }

        if (selectedGif) {
          nodes.push({
            type: "image",
            attrs: {
              src: selectedGif.src,
              alt: selectedGif.title,
            },
          });
        }

        const content: JSONContent = {
          type: "doc",
          content: nodes,
        };

        let createdComment: MarketPageComments[number] | undefined;

        try {
          const result = await submitComment({
            content,
            assetSymbols: [assetSymbol],
          });

          createdComment = result.comment ?? undefined;
        } catch (error) {
          console.error("Failed to create comment:", error);

          toast.error(
            error instanceof Error && error.message
              ? error.message
              : commentLabels.failed,
          );

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
      } finally {
        submittingRef.current = false;
      }
    });
  }

  return (
    <div className="mb-8 flex gap-3">
      <Avatar className="size-9 shrink-0" aria-hidden="true">
        <AvatarImage
          src={displayImage ?? undefined}
          alt=""
          className="object-cover"
        />

        <AvatarFallback className="bg-olive-500 text-lg font-normal text-white">
          {displayName ? Array.from(displayName)[0]?.toUpperCase() || "G" : "G"}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="relative rounded-lg bg-zinc-100 px-4 dark:bg-zinc-800">
          {/* Text */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={comment}
            onChange={(event) => {
              if (!isLoggedIn || editorDisabled || submittingRef.current) {
                return;
              }

              setComment(event.target.value);
            }}
            readOnly={!isLoggedIn}
            disabled={editorDisabled}
            tabIndex={isLoggedIn ? 0 : -1}
            aria-label={commentLabels.comment}
            onFocus={(event) => {
              if (!isLoggedIn) {
                event.currentTarget.blur();
              }
            }}
            onClick={() => {
              if (!isLoggedIn) requireLogin();
            }}
            placeholder={isLoggedIn ? commentLabels.write : commentLabels.login}
            className={`
              content-scrollbar block min-h-11 w-full resize-none
              overflow-hidden bg-transparent py-3
              text-[15px] leading-6 outline-none
              placeholder:truncate placeholder:text-zinc-500
              disabled:cursor-not-allowed disabled:opacity-50
              ${!isLoggedIn ? "cursor-default caret-transparent" : ""}
            `}
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
                disabled={editorDisabled}
                onClick={() => {
                  if (!isLoggedIn || editorDisabled || submittingRef.current) {
                    return;
                  }

                  setSelectedGif(null);
                }}
                aria-label="Remove GIF"
                title="Remove GIF"
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

          <div className="@container flex items-center justify-between gap-2 pb-2">
            {/* GIF */}
            <div className="relative flex shrink-0 items-center gap-1">
              <button
                ref={gifButtonRef}
                type="button"
                disabled={editorDisabled}
                onClick={() => {
                  if (
                    editorDisabled ||
                    submittingRef.current ||
                    !requireLogin()
                  ) {
                    return;
                  }

                  setGifPickerOpen((open) => !open);
                }}
                aria-label="Select GIF"
                aria-expanded={isLoggedIn && !editorDisabled && gifPickerOpen}
                className="
                  cursor-pointer rounded-md px-2 py-1
                  text-sm font-medium text-zinc-500
                  hover:bg-zinc-200 dark:hover:bg-zinc-700
                  disabled:cursor-not-allowed disabled:opacity-50
                "
              >
                GIF
              </button>

              {gifPickerOpen && isLoggedIn && !editorDisabled && (
                <GifPicker
                  open={gifPickerOpen}
                  onOpenChange={setGifPickerOpen}
                  onSelect={handleGifSelect}
                  triggerRef={gifButtonRef}
                />
              )}
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
                disabled={editorDisabled || !hasContent}
                onClick={handleComment}
                className="
                  shrink-0 cursor-pointer
                  disabled:cursor-not-allowed
                "
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
