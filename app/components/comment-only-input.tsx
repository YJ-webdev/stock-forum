"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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

import { CommentTextarea } from "./comment-textarea";
import { GifButton } from "./gif-button";
import { VotingCountdown } from "./voting-countdown";
import type { GifResult } from "./gif-picker";
import { GifPreview } from "./gif-preview";
import { buildCommentContent } from "@/lib/utils/build-comment-content";

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
  const [isPending, startTransition] = useTransition();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submittingRef = useRef(false);

  const language = resolveLanguage(user?.language ?? currentUser?.language);
  const commentLabels = COMMENT_LABELS[language];
  const validationLabels = SUBMIT_VALIDATION_LABELS[language];

  const isLoggedIn = Boolean(user);

  const isChatRestricted =
    user?.status === "BANNED" || user?.status === "MUTED";

  const inputReadOnly = !isLoggedIn || isChatRestricted || isPending;
  const hasContent = comment.trim().length > 0 || Boolean(selectedGif);

  const showClosingCountdown =
    showCountdown && countdownType === "VOTING_CLOSES";

  const inputLabel = isLoggedIn ? commentLabels.write : commentLabels.login;

  const displayName = user?.name ?? currentUser?.name;
  const displayImage = user?.image ?? currentUser?.image;

  const avatarInitial =
    Array.from(displayName?.trim() ?? "")[0]?.toUpperCase() || "G";

  useEffect(() => {
    if (isLoggedIn) return;

    setComment("");
    setSelectedGif(null);
  }, [isLoggedIn]);

  function handleCommentChange(value: string) {
    if (inputReadOnly || submittingRef.current) return;

    setComment(value);
  }

  function handleGifSelect(gif: GifResult) {
    if (inputReadOnly || submittingRef.current) return;

    setSelectedGif(gif);
  }

  function handleGifRemove() {
    if (inputReadOnly || submittingRef.current) return;

    setSelectedGif(null);
  }

  function handleSubmit() {
    if (isPending || submittingRef.current) return;

    if (!isLoggedIn) {
      toast.error(commentLabels.login.replace(/\.{3}$/, ""));
      return;
    }

    if (isChatRestricted) {
      toast.error(commentLabels.restricted);
      return;
    }

    if (!hasContent) {
      toast.error(validationLabels.content);
      textareaRef.current?.focus({ preventScroll: true });
      return;
    }

    const content = buildCommentContent(comment, selectedGif);

    submittingRef.current = true;

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
          <CommentTextarea
            textareaRef={textareaRef}
            value={comment}
            onValueChange={handleCommentChange}
            placeholder={inputLabel}
            isLoggedIn={isLoggedIn}
            isChatRestricted={isChatRestricted}
            busy={isPending}
            loginMessage={commentLabels.login}
            restrictedMessage={commentLabels.restricted}
          />

          {isLoggedIn && selectedGif && (
            <GifPreview
              src={selectedGif.src}
              preview={selectedGif.preview}
              title={selectedGif.title}
              disabled={inputReadOnly}
              onRemove={handleGifRemove}
            />
          )}

          <div className="@container flex items-center justify-between gap-2 pb-2">
            <GifButton
              isLoggedIn={isLoggedIn}
              isChatRestricted={isChatRestricted}
              busy={isPending}
              loginMessage={commentLabels.login_gif}
              restrictedMessage={commentLabels.restricted}
              isSubmitting={() => submittingRef.current}
              onSelect={handleGifSelect}
            />

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
                  dark:bg-transparent dark:text-zinc-100
                  dark:hover:bg-transparent
                  disabled:cursor-not-allowed
                  disabled:bg-transparent disabled:opacity-50
                  dark:disabled:bg-transparent
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
