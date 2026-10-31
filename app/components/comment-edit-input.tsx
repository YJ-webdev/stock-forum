"use client";

import { useRef, useState, useTransition, type KeyboardEvent } from "react";
import type { JSONContent } from "@tiptap/react";
import { toast } from "sonner";

import { editComment } from "@/app/actions/post";
import { useCurrentUser } from "@/app/context/user-context";

import { resolveLanguage } from "@/lib/data/languages";
import {
  COMMENT_LABELS,
  COMMENT_EDIT_LABELS,
  COMMENT_IMAGE_LABELS,
  CONTENT_RESULT_LABELS,
} from "@/lib/data/translations";

import type { CommentImage } from "@/lib/types/comment-image";
import { buildCommentContent } from "@/lib/utils/build-comment-content";
import { getGifDimensions } from "@/lib/utils/gif-dimensions";

import { Button } from "@/components/ui/button";

import { CommentTextarea } from "./comment-textarea";
import { GifPreview } from "./gif-preview";
import { ImagePreview } from "./image-preview";
import { MediaButtons } from "./media-buttons";
import type { GifResult } from "./gif-picker";

interface CommentEditInputProps {
  commentId: string;
  initialContent: JSONContent;

  onCancel: () => void;

  onSaved: (result: {
    success: boolean;
    content: JSONContent;
    editedAt: Date;
  }) => void | Promise<void>;
}

interface EditableGif {
  src: string;
  preview?: string;
  title: string;
  width: number | null;
  height: number | null;
}

interface EditableContent {
  text: string;
  gif: EditableGif | null;
  image: CommentImage | null;
}

function getNodeText(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";

  return (node.content ?? []).map(getNodeText).join("");
}

function getPositiveDimension(value: unknown): number | null {
  const number = Number(value);

  return Number.isInteger(number) && number > 0 ? number : null;
}

function getInitialComment(content: JSONContent): EditableContent {
  const paragraphs: string[] = [];

  let gif: EditableGif | null = null;
  let image: CommentImage | null = null;

  for (const node of content.content ?? []) {
    if (node.type === "paragraph") {
      paragraphs.push(getNodeText(node));
    }

    if (
      node.type !== "image" ||
      typeof node.attrs?.src !== "string" ||
      !node.attrs.src.trim()
    ) {
      continue;
    }

    const src = node.attrs.src;

    // Existing comments without mediaType are legacy GIF comments.
    if (node.attrs.mediaType === "image") {
      image = {
        src,
        title: typeof node.attrs.alt === "string" ? node.attrs.alt : "Image",
        width: getPositiveDimension(node.attrs.width) ?? 1,
        height: getPositiveDimension(node.attrs.height) ?? 1,
        mediaType: "image",
      };

      gif = null;
    } else {
      const dimensions = getGifDimensions(node.attrs.width, node.attrs.height);

      gif = {
        src,
        preview: src,
        title: typeof node.attrs.alt === "string" ? node.attrs.alt : "GIF",
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
      };

      image = null;
    }
  }

  return {
    text: paragraphs.join("\n"),
    gif,
    image,
  };
}

function getAttachmentKey(
  gif: EditableGif | null,
  image: CommentImage | null,
): string | null {
  if (image) return `image:${image.src}`;
  if (gif) return `gif:${gif.src}`;

  return null;
}

export function CommentEditInput({
  commentId,
  initialContent,
  onCancel,
  onSaved,
}: CommentEditInputProps) {
  const user = useCurrentUser();
  const language = resolveLanguage(user?.language);

  const labels = COMMENT_EDIT_LABELS[language];
  const commentLabels = COMMENT_LABELS[language];
  const imageLabels = COMMENT_IMAGE_LABELS[language];
  const resultLabels = CONTENT_RESULT_LABELS[language];

  const [initial] = useState(() => getInitialComment(initialContent));

  const [comment, setComment] = useState(initial.text);
  const [selectedGif, setSelectedGif] = useState<EditableGif | null>(
    initial.gif,
  );
  const [selectedImage, setSelectedImage] = useState<CommentImage | null>(
    initial.image,
  );

  const [isPending, startTransition] = useTransition();
  const [imageUploading, setImageUploading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submittingRef = useRef(false);
  const imageUploadingRef = useRef(false);

  const isLoggedIn = Boolean(user);

  const isChatRestricted =
    user?.status === "BANNED" || user?.status === "MUTED";

  const busy = isPending || imageUploading;
  const inputReadOnly = !isLoggedIn || isChatRestricted || isPending;

  const hasContent =
    comment.trim().length > 0 || Boolean(selectedGif) || Boolean(selectedImage);

  const hasChanges =
    comment.trim() !== initial.text.trim() ||
    getAttachmentKey(selectedGif, selectedImage) !==
      getAttachmentKey(initial.gif, initial.image);

  const saveDisabled =
    busy || (isLoggedIn && !isChatRestricted && (!hasContent || !hasChanges));

  const inputLabel = isLoggedIn ? labels.placeholder : commentLabels.login;

  function handleCommentChange(value: string) {
    if (inputReadOnly || submittingRef.current || imageUploadingRef.current) {
      return;
    }

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

    const dimensions = getGifDimensions(gif.width, gif.height);

    setSelectedGif({
      src: gif.src,
      preview: gif.preview,
      title: gif.title,
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
    });

    setSelectedImage(null);
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

    setSelectedImage(image);
    setSelectedGif(null);
  }

  function handleImageRemove() {
    if (inputReadOnly || submittingRef.current || imageUploadingRef.current) {
      return;
    }

    setSelectedImage(null);
  }

  function handleCancel() {
    if (isPending || submittingRef.current || imageUploadingRef.current) {
      return;
    }

    onCancel();
  }

  function handleSave() {
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

    if (!hasContent || !hasChanges) return;

    const content = buildCommentContent(comment, selectedGif, selectedImage);

    submittingRef.current = true;

    startTransition(async () => {
      try {
        let result: Awaited<ReturnType<typeof editComment>>;

        try {
          result = await editComment({
            commentId,
            content,
          });
        } catch (error) {
          toast.error(
            error instanceof Error && error.message
              ? error.message
              : labels.update_failed,
          );

          return;
        }

        if (!result.success) {
          toast.error(labels.update_failed);
          return;
        }

        toast.success(resultLabels.edited);

        try {
          await onSaved(result);
        } catch (error) {
          console.error("Failed to update saved comment in the UI:", error);
        }
      } finally {
        submittingRef.current = false;
      }
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      isPending ||
      submittingRef.current ||
      imageUploadingRef.current ||
      event.nativeEvent.isComposing
    ) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      handleCancel();
      return;
    }

    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleSave();
    }
  }

  return (
    <div className="rounded-lg bg-zinc-100 px-2.5 dark:bg-zinc-800">
      <CommentTextarea
        textareaRef={textareaRef}
        value={comment}
        onValueChange={handleCommentChange}
        placeholder={inputLabel}
        isLoggedIn={isLoggedIn}
        isChatRestricted={isChatRestricted}
        busy={busy}
        loginMessage={commentLabels.login}
        restrictedMessage={commentLabels.restricted}
        onKeyDown={handleKeyDown}
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

      <div className="flex items-center justify-between gap-2 pb-2">
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

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={handleCancel}
            className="cursor-pointer disabled:cursor-not-allowed"
          >
            {labels.cancel}
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={saveDisabled}
            aria-busy={busy}
            onClick={handleSave}
            className="cursor-pointer disabled:cursor-not-allowed"
          >
            {imageUploading
              ? imageLabels.uploading
              : isPending
                ? labels.saving
                : labels.save}
          </Button>
        </div>
      </div>
    </div>
  );
}
