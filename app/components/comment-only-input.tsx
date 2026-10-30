// app/components/comment-only-input.tsx
"use client";

import dynamic from "next/dynamic";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import type { JSONContent } from "@tiptap/react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { createComment, type MarketPageComments } from "@/app/actions/post";
import { useCurrentUser } from "@/app/context/user-context";
import { resolveLanguage } from "@/lib/data/languages";
import {
  COMMENT_LABELS,
  SUBMIT_VALIDATION_LABELS,
} from "@/lib/data/translations";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

import { VotingCountdown } from "./voting-countdown";
import type { GifResult } from "./gif-picker";

const GifPicker = dynamic(
  () => import("./gif-picker").then((module) => module.GifPicker),
  { ssr: false },
);

const MAX_TEXTAREA_HEIGHT = 240;

type Comment = MarketPageComments[number];

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
  onCommentCreated: (comment: Comment) => void | Promise<void>;
}

function buildCommentContent(
  comment: string,
  gif: GifResult | null,
): JSONContent {
  const text = comment.trim();
  const content: JSONContent[] = [];

  if (text) {
    for (const line of text.split(/\r\n|\r|\n/)) {
      content.push({
        type: "paragraph",
        content: line ? [{ type: "text", text: line }] : [],
      });
    }
  }

  if (gif) {
    content.push({
      type: "image",
      attrs: { src: gif.src, alt: gif.title },
    });
  }

  return { type: "doc", content };
}

export function CommentOnlyInput({
  initialComment = "",
  submitComment = createComment,
  assetSymbol,
  targetMs,
  countdownType,
  showCountdown,
  isMarketOpen,
  currentUser,
  onCommentCreated,
}: CommentOnlyInputProps) {
  const user = useCurrentUser();
  const [comment, setComment] = useState(initialComment);
  const [selectedGif, setSelectedGif] = useState<GifResult | null>(null);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gifButtonRef = useRef<HTMLButtonElement>(null);
  const submittingRef = useRef(false);

  const language = resolveLanguage(user?.language ?? currentUser?.language);
  const commentLabels = COMMENT_LABELS[language];
  const validationLabels = SUBMIT_VALIDATION_LABELS[language];

  const isLoggedIn = Boolean(user);
  const isChatRestricted =
    user?.status === "BANNED" || user?.status === "MUTED";
  const editorDisabled = isPending || isChatRestricted;
  const hasContent = comment.trim().length > 0 || Boolean(selectedGif);
  const showGifPicker = gifPickerOpen && isLoggedIn && !editorDisabled;
  const showClosingCountdown =
    showCountdown && countdownType === "VOTING_CLOSES";
  const inputLabel = isLoggedIn ? commentLabels.write : commentLabels.login;

  const displayName = user?.name ?? currentUser?.name;
  const displayImage = user?.image ?? currentUser?.image;
  const avatarInitial =
    Array.from(displayName?.trim() ?? "")[0]?.toUpperCase() || "G";

  // Clear guest drafts and close the picker when editing becomes unavailable.
  useEffect(() => {
    if (!isLoggedIn) {
      setComment("");
      setSelectedGif(null);
    }

    if (!isLoggedIn || editorDisabled) setGifPickerOpen(false);
  }, [isLoggedIn, editorDisabled]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    function resizeTextarea() {
      if (!textarea) return;
      textarea.style.height = "auto";
      const contentHeight = textarea.scrollHeight;
      textarea.style.height = `${Math.min(contentHeight, MAX_TEXTAREA_HEIGHT)}px`;
      textarea.style.overflowY =
        contentHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
    }

    resizeTextarea();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", resizeTextarea);
      return () => window.removeEventListener("resize", resizeTextarea);
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

  function showLoginMessage() {
    toast.error(commentLabels.login.replace(/\.{3}$/, ""));
  }

  function handleGifPickerToggle() {
    if (!isLoggedIn) {
      toast.error(commentLabels.login_gif);
      return;
    }

    if (editorDisabled || submittingRef.current) {
      toast.error(validationLabels.unavailable);
      return;
    }

    setGifPickerOpen((open) => !open);
  }

  function handleGifSelect(gif: GifResult) {
    if (!isLoggedIn || editorDisabled || submittingRef.current) return;
    setSelectedGif(gif);
    setGifPickerOpen(false);
  }

  function handleGifRemove() {
    if (!isLoggedIn || editorDisabled || submittingRef.current) return;
    setSelectedGif(null);
  }

  function handleSubmit() {
    if (!isLoggedIn) {
      showLoginMessage();
      return;
    }

    if (isPending || submittingRef.current) return;

    if (isChatRestricted) {
      toast.error(validationLabels.unavailable);
      return;
    }

    if (!hasContent) {
      toast.error(validationLabels.content);
      textareaRef.current?.focus({ preventScroll: true });
      return;
    }

    const content = buildCommentContent(comment, selectedGif);
    submittingRef.current = true;
    setGifPickerOpen(false);

    startTransition(async () => {
      try {
        let createdComment: Comment | undefined;

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
    <div className="mb-8 flex min-w-0 gap-3">
      <Avatar className="size-9 shrink-0" aria-hidden="true">
        <AvatarImage
          src={displayImage ?? undefined}
          alt=""
          className="object-cover"
        />
        <AvatarFallback className="bg-olive-500 text-lg font-normal text-white">
          {avatarInitial}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="rounded-lg bg-zinc-100 px-2.5 dark:bg-zinc-800">
          <textarea
            ref={textareaRef}
            rows={1}
            value={isLoggedIn ? comment : ""}
            disabled={editorDisabled}
            readOnly={!isLoggedIn}
            tabIndex={isLoggedIn && !isChatRestricted ? 0 : -1}
            aria-label={inputLabel}
            placeholder={inputLabel}
            onChange={(event) => {
              if (!isLoggedIn || editorDisabled || submittingRef.current)
                return;
              setComment(event.target.value);
            }}
            onFocus={(event) => {
              if (!isLoggedIn) event.currentTarget.blur();
            }}
            onClick={() => {
              if (!isLoggedIn) showLoginMessage();
            }}
            style={{ overflowX: "hidden" }}
            className={`
              content-scrollbar block min-h-11 w-full
              resize-none overflow-hidden bg-transparent
              px-1.5 py-4 text-[15px] leading-6 outline-none
              placeholder:truncate placeholder:text-zinc-500
              disabled:cursor-not-allowed disabled:opacity-60
              ${!isLoggedIn ? "cursor-default caret-transparent" : ""}
            `}
          />

          {isLoggedIn && selectedGif && (
            <div className="relative mb-3 w-fit max-w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedGif.preview || selectedGif.src}
                alt={selectedGif.title}
                decoding="async"
                className="block max-h-60 max-w-full rounded-lg object-contain"
              />
              <button
                type="button"
                aria-label="Remove GIF"
                disabled={editorDisabled}
                onClick={handleGifRemove}
                className="
                  absolute right-2 top-2 flex size-7 cursor-pointer
                  items-center justify-center rounded-full bg-black/60 text-white
                  transition-colors hover:bg-black/75
                  disabled:cursor-not-allowed disabled:opacity-50
                "
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>
          )}

          <div className="@container flex items-center justify-between gap-2 pb-2">
            <div className="flex shrink-0 items-center gap-1">
              <button
                ref={gifButtonRef}
                type="button"
                aria-label="Select GIF"
                aria-expanded={showGifPicker}
                onClick={handleGifPickerToggle}
                className="
                  cursor-pointer rounded-md px-2 py-1
                  text-sm font-medium text-zinc-500
                  hover:bg-zinc-200 dark:hover:bg-zinc-700
                "
              >
                GIF
              </button>

              {showGifPicker && (
                <GifPicker
                  triggerRef={gifButtonRef}
                  open={gifPickerOpen}
                  onOpenChange={setGifPickerOpen}
                  onSelect={handleGifSelect}
                />
              )}
            </div>

            <div className="flex min-w-0 items-center justify-end gap-2">
              {showClosingCountdown && (
                <div className="hidden @[380px]:block">
                  <VotingCountdown
                    targetMs={targetMs}
                    type="VOTING_CLOSES"
                    showCountdown={showCountdown}
                    isMarketOpen={isMarketOpen}
                    userLanguage={language}
                  />
                </div>
              )}

              <Button
                type="button"
                size="sm"
                disabled={isPending}
                onClick={handleSubmit}
                className="
                  shrink-0 cursor-pointer border-none
                  bg-transparent text-zinc-800 shadow-none
                  transition-colors hover:bg-transparent
                  dark:bg-transparent dark:text-zinc-100 dark:hover:bg-transparent
                  disabled:cursor-not-allowed disabled:bg-transparent
                  disabled:opacity-50 dark:disabled:bg-transparent
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
