"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { JSONContent } from "@tiptap/react";
import { toast } from "sonner";

import { createComment, type MarketPageComments } from "@/app/actions/post";
import { useCurrentUser } from "@/app/context/user-context";
import {
  useCommentDraft,
  type CommentDraftProps,
} from "@/app/hooks/use-comment-draft";

import { resolveLanguage } from "@/lib/data/languages";
import {
  COMMENT_IMAGE_LABELS,
  COMMENT_LABELS,
  SUBMIT_VALIDATION_LABELS,
} from "@/lib/data/translations";
import type { CommentImage } from "@/lib/types/comment-image";
import { buildCommentContent } from "@/lib/utils/build-comment-content";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

import { CommentTextarea } from "./comment-textarea";
import { GifPreview } from "./gif-preview";
import { ImagePreview } from "./image-preview";
import { MediaButtons } from "./media-buttons";
import { VotingCountdown } from "./voting-countdown";
import type { GifResult } from "./gif-picker";

type Comment = MarketPageComments[number];

interface CommentOnlyInputProps extends CommentDraftProps {
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
  draft,
  onDraftChange,
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

  const {
    comment,
    selectedGif,
    selectedImage,
    setComment,
    setSelectedGif,
    setSelectedImage,
    clearDraft,
  } = useCommentDraft(initialComment, null, draft, onDraftChange);

  const [isPending, startTransition] = useTransition();
  const [imageUploading, setImageUploading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submittingRef = useRef(false);
  const imageUploadingRef = useRef(false);

  const language = resolveLanguage(user?.language ?? currentUser?.language);

  const commentLabels = COMMENT_LABELS[language];
  const imageLabels = COMMENT_IMAGE_LABELS[language];
  const validationLabels = SUBMIT_VALIDATION_LABELS[language];

  const isLoggedIn = Boolean(user);

  const isChatRestricted =
    user?.status === "BANNED" || user?.status === "MUTED";

  const busy = isPending || imageUploading;

  // Text can still be edited while an image uploads.
  const inputReadOnly = !isLoggedIn || isPending || isChatRestricted;

  const hasContent =
    comment.trim().length > 0 || Boolean(selectedGif) || Boolean(selectedImage);

  const showClosingCountdown =
    showCountdown && countdownType === "VOTING_CLOSES";

  const inputLabel = isLoggedIn ? commentLabels.write : commentLabels.login;

  const displayName = user?.name ?? currentUser?.name;
  const displayImage = user?.image ?? currentUser?.image;

  const avatarInitial =
    Array.from(displayName?.trim() ?? "")[0]?.toUpperCase() || "G";

  useEffect(() => {
    if (isLoggedIn) return;

    clearDraft();
  }, [isLoggedIn, clearDraft]);

  function handleCommentChange(value: string) {
    if (inputReadOnly || submittingRef.current) return;

    setComment(value);
  }

  function handleImageUploadingChange(uploading: boolean) {
    imageUploadingRef.current = uploading;
    setImageUploading(uploading);
  }

  function handleGifSelect(gif: GifResult) {
    if (inputReadOnly || submittingRef.current || imageUploadingRef.current) {
      return;
    }

    setSelectedGif(gif);
  }

  function handleGifRemove() {
    if (inputReadOnly || submittingRef.current || imageUploadingRef.current) {
      return;
    }

    setSelectedGif(null);
  }

  function handleImageSelect(image: CommentImage) {
    // Upload completion runs before the uploading state is cleared.
    if (inputReadOnly || submittingRef.current) return;

    // The draft hook also clears the selected GIF.
    setSelectedImage(image);
  }

  function handleImageRemove() {
    if (inputReadOnly || submittingRef.current || imageUploadingRef.current) {
      return;
    }

    setSelectedImage(null);
  }

  function handleSubmit() {
    if (isPending || submittingRef.current || imageUploadingRef.current) {
      return;
    }

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

    const content = buildCommentContent(comment, selectedGif, selectedImage);

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

        clearDraft();

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
              disabled={inputReadOnly || busy}
              onRemove={handleGifRemove}
            />
          )}

          {isLoggedIn && selectedImage && (
            <ImagePreview
              image={selectedImage}
              removeLabel={imageLabels.remove}
              disabled={inputReadOnly || busy}
              onRemove={handleImageRemove}
            />
          )}

          <div className="@container flex items-center justify-between gap-2 pb-2">
            <MediaButtons
              isLoggedIn={isLoggedIn}
              isChatRestricted={isChatRestricted}
              busy={isPending}
              imageLabels={imageLabels}
              gifLoginMessage={commentLabels.login_gif}
              restrictedMessage={commentLabels.restricted}
              isSubmitting={() => submittingRef.current}
              onImageSelect={handleImageSelect}
              onGifSelect={handleGifSelect}
              onUploadingChange={handleImageUploadingChange}
            />

            <div className="flex min-w-0 items-center justify-end gap-2">
              {showClosingCountdown && (
                <div className="hidden @[380px]:block">
                  <VotingCountdown
                    targetMs={targetMs}
                    type="VOTING_CLOSES"
                    showCountdown={showClosingCountdown}
                    isMarketOpen={isMarketOpen}
                    userLanguage={language}
                  />
                </div>
              )}

              <Button
                type="button"
                size="sm"
                disabled={busy}
                aria-busy={busy}
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
                {imageUploading
                  ? imageLabels.uploading
                  : isPending
                    ? commentLabels.posting
                    : commentLabels.comment}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
