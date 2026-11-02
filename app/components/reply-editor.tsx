"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import { toast } from "sonner";

import { createReply, editReply } from "@/app/actions/post";
import { useCurrentUser } from "@/app/context/user-context";

import { resolveLanguage } from "@/lib/data/languages";
import {
  COMMENT_LABELS,
  COMMENT_EDIT_LABELS,
  REPLY_INPUT_LABELS,
  REPLY_EDIT_LABELS,
  IMAGE_BUTTON_LABELS,
} from "@/lib/data/translations";
import { getGifDimensions } from "@/lib/utils/gif-dimensions";

import type { CommentImage } from "@/lib/types/comment-image";
import type { GifResult } from "./gif-picker";
import type { MarketReply } from "./comment";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

import { CommentTextarea } from "./comment-textarea";
import { MediaButtons, type MediaButtonsHandle } from "./media-buttons";
import { GifPreview } from "./gif-preview";
import { ImagePreview } from "./image-preview";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface EditorUser {
  name?: string | null;
  image?: string | null;
  language?: string | null;
}

interface BaseProps {
  onCancel: () => void;
}

interface CreateProps extends BaseProps {
  mode: "create";

  commentId: string;
  parentId?: string | null;
  username: string;
  currentUser: EditorUser | null;

  onReplyCreated: (reply: MarketReply) => void | Promise<void>;
}

interface EditProps extends BaseProps {
  mode: "edit";

  reply: MarketReply;
  onSaved: () => void | Promise<void>;
}

type ReplyEditorProps = CreateProps | EditProps;

interface EditableGif {
  src: string;
  preview: string;
  title: string;
  width: number | null;
  height: number | null;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const CANCEL_BUTTON_CLASS = `
  shrink-0 cursor-pointer border-none
  bg-transparent text-zinc-800 shadow-none
  transition-colors hover:bg-transparent
  dark:bg-transparent dark:text-zinc-100
  dark:hover:bg-transparent
  disabled:cursor-not-allowed
  disabled:bg-transparent disabled:opacity-50
  dark:disabled:bg-transparent
`;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function getInitialGif(reply?: MarketReply): EditableGif | null {
  if (!reply?.gifUrl) return null;

  const dimensions = getGifDimensions(reply.gifWidth, reply.gifHeight);

  return {
    src: reply.gifUrl,
    preview: reply.gifUrl,
    title: "GIF",
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
  };
}

function getInitialImage(reply?: MarketReply): CommentImage | null {
  if (!reply?.imageUrl) return null;

  return {
    src: reply.imageUrl,
    title: "Image",
    width: reply.imageWidth ?? 0,
    height: reply.imageHeight ?? 0,
    mediaType: "image",
  };
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function ReplyEditor(props: ReplyEditorProps) {
  const user = useCurrentUser();

  const isCreate = props.mode === "create";
  const initialReply = props.mode === "edit" ? props.reply : undefined;

  const language = resolveLanguage(
    user?.language ??
      (props.mode === "create" ? props.currentUser?.language : null),
  );

  const commentLabels = COMMENT_LABELS[language];
  const inputLabels = REPLY_INPUT_LABELS[language];
  const editLabels = REPLY_EDIT_LABELS[language];
  const actionLabels = COMMENT_EDIT_LABELS[language];
  const imageLabels = IMAGE_BUTTON_LABELS[language];

  const [content, setContent] = useState(initialReply?.content ?? "");
  const [selectedGif, setSelectedGif] = useState<EditableGif | null>(() =>
    getInitialGif(initialReply),
  );
  const [selectedImage, setSelectedImage] = useState<CommentImage | null>(() =>
    getInitialImage(initialReply),
  );

  const [isUploading, setIsUploading] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const localPreviewRef = useRef<string | null>(null);
  const uploadedImageRef = useRef<CommentImage | null>(null);

  useEffect(() => {
    return () => {
      if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
    };
  }, []);

  function clearLocalPreview() {
    const url = localPreviewRef.current;
    localPreviewRef.current = null;
    setLocalPreviewUrl(null);
    if (url) URL.revokeObjectURL(url);
  }

  function handleImagePreview(url: string, _file: File) {
    clearLocalPreview();
    localPreviewRef.current = url;
    setLocalPreviewUrl(url);
    uploadedImageRef.current = null;
    setSelectedImage(null);
    setSelectedGif(null);
  }

  function handleImageUploadError() {
    clearLocalPreview();
  }

  const [isPending, startTransition] = useTransition();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaButtonsRef = useRef<MediaButtonsHandle>(null);

  const uploadingRef = useRef(false);
  const submittingRef = useRef(false);

  // ---------------------------------------------------------------------------
  // User / permissions
  // ---------------------------------------------------------------------------

  const isLoggedIn = Boolean(user);

  const isChatRestricted =
    user?.status === "MUTED" || user?.status === "BANNED";

  const busy = isPending || isUploading;

  const inputReadOnly = !isLoggedIn || isChatRestricted || isPending;

  // ---------------------------------------------------------------------------
  // Content state
  // ---------------------------------------------------------------------------

  const gifUrl = selectedGif?.src ?? null;
  const imageUrl = selectedImage?.src ?? null;

  const hasContent =
    content.trim().length > 0 || Boolean(gifUrl) || Boolean(imageUrl);

  const hasChanges =
    isCreate ||
    content.trim() !== (initialReply?.content ?? "").trim() ||
    gifUrl !== (initialReply?.gifUrl ?? null) ||
    imageUrl !== (initialReply?.imageUrl ?? null);

  const submitDisabled =
    isPending ||
    (!isCreate &&
      isLoggedIn &&
      !isChatRestricted &&
      ((!hasContent && !localPreviewUrl) || (!hasChanges && !localPreviewUrl)));

  const placeholder = !isLoggedIn
    ? commentLabels.login
    : isCreate
      ? inputLabels.placeholder.replace("{name}", props.username)
      : editLabels.placeholder;

  // ---------------------------------------------------------------------------
  // Avatar
  // ---------------------------------------------------------------------------

  const displayName =
    user?.name ?? (props.mode === "create" ? props.currentUser?.name : null);

  const displayImage =
    user?.image ?? (props.mode === "create" ? props.currentUser?.image : null);

  const avatarInitial =
    Array.from(displayName?.trim() ?? "")[0]?.toUpperCase() || "G";

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (isLoggedIn) return;

    setContent("");
    setSelectedGif(null);
    setSelectedImage(null);
  }, [isLoggedIn]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleUploadingChange(uploading: boolean) {
    uploadingRef.current = uploading;
    setIsUploading(uploading);
  }

  function handleContentChange(value: string) {
    if (inputReadOnly || submittingRef.current) return;

    setContent(value);
  }

  function handleGifSelect(gif: GifResult) {
    if (inputReadOnly || submittingRef.current || uploadingRef.current) return;

    uploadedImageRef.current = null;
    clearLocalPreview();
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

  function handleImageSelect(image: CommentImage) {
    if (!isLoggedIn || isChatRestricted || isPending || submittingRef.current) {
      return;
    }

    uploadedImageRef.current = image;
    setSelectedImage(image);
    setSelectedGif(null);
    clearLocalPreview();
  }

  function handleImagePaste(file: File) {
    if (
      !isLoggedIn ||
      isChatRestricted ||
      isPending ||
      uploadingRef.current ||
      submittingRef.current
    ) {
      return;
    }

    void mediaButtonsRef.current?.uploadImage(file);
  }

  function handleImageRemove() {
    if (isPending || submittingRef.current) return;
    mediaButtonsRef.current?.cancelUpload();
    uploadedImageRef.current = null;
    setSelectedImage(null);
    clearLocalPreview();
  }

  function handleCancel() {
    if (busy || submittingRef.current) return;

    props.onCancel();
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

    if (!hasContent && !localPreviewUrl) {
      toast.error(isCreate ? inputLabels.empty_reply : editLabels.empty_reply);
      textareaRef.current?.focus({ preventScroll: true });
      return;
    }

    if (!hasChanges && !localPreviewUrl) return;

    const submittedContent = content.trim();
    const submittedGifUrl = selectedGif?.src ?? null;

    const gifDimensions = getGifDimensions(
      selectedGif?.width,
      selectedGif?.height,
    );

    submittingRef.current = true;

    startTransition(async () => {
      try {
        let submittedImage = uploadedImageRef.current ?? selectedImage;
        if (uploadingRef.current) {
          const uploaded = await mediaButtonsRef.current?.waitForUpload();
          if (!uploaded) return;
          submittedImage = uploaded;
        }
        if (props.mode === "create") {
          // -----------------------------------------------------------------
          // Create
          // -----------------------------------------------------------------

          let result: Awaited<ReturnType<typeof createReply>>;

          try {
            result = await createReply({
              commentId: props.commentId,
              parentId: props.parentId ?? null,
              content: submittedContent,
              gifUrl: submittedGifUrl,
              gifWidth: gifDimensions?.width ?? null,
              gifHeight: gifDimensions?.height ?? null,
              image: submittedImage,
            });
          } catch (error) {
            console.error("Failed to create reply:", error);

            toast.error(
              error instanceof Error && error.message
                ? error.message
                : inputLabels.post_failed,
            );

            return;
          }

          toast.success(inputLabels.posted);

          const newReply: MarketReply = {
            ...result.reply,
            likeCount: 0,
            likedByMe: false,
            replyCount: 0,
          };

          try {
            await props.onReplyCreated(newReply);
          } catch (error) {
            console.error("Failed to update reply list:", error);
          }
        } else {
          // -----------------------------------------------------------------
          // Edit
          // -----------------------------------------------------------------

          try {
            await editReply({
              replyId: props.reply.id,
              content: submittedContent,
              gifUrl: submittedGifUrl,
              gifWidth: gifDimensions?.width ?? null,
              gifHeight: gifDimensions?.height ?? null,
              image: submittedImage,
            });
          } catch (error) {
            console.error("Failed to edit reply:", error);

            toast.error(
              error instanceof Error && error.message
                ? error.message
                : editLabels.update_failed,
            );

            return;
          }

          toast.success(editLabels.updated);

          try {
            await props.onSaved();
          } catch (error) {
            console.error("Failed to update saved reply in the UI:", error);
          }
        }
      } finally {
        submittingRef.current = false;
      }
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (isPending || submittingRef.current || event.nativeEvent.isComposing) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      handleCancel();
      return;
    }

    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleSubmit();
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const editor = (
    <div className="min-w-0 flex-1 rounded-lg bg-zinc-100 px-2.5 dark:bg-zinc-800">
      <CommentTextarea
        textareaRef={textareaRef}
        value={content}
        onValueChange={handleContentChange}
        onImagePaste={handleImagePaste}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        isLoggedIn={isLoggedIn}
        isChatRestricted={isChatRestricted}
        busy={isPending}
        loginMessage={commentLabels.login}
        restrictedMessage={commentLabels.restricted}
      />

      {selectedGif && (
        <GifPreview
          src={selectedGif.src}
          preview={selectedGif.preview}
          title={selectedGif.title}
          disabled={inputReadOnly}
          onRemove={() => setSelectedGif(null)}
        />
      )}

      {(selectedImage || localPreviewUrl) && (
        <ImagePreview
          image={selectedImage}
          previewUrl={localPreviewUrl}
          uploading={isUploading}
          removeLabel={imageLabels.remove}
          disabled={inputReadOnly}
          onRemove={handleImageRemove}
        />
      )}

      <div className="@container flex items-center justify-between gap-2 pb-2">
        <MediaButtons
          ref={mediaButtonsRef}
          isLoggedIn={isLoggedIn}
          isChatRestricted={isChatRestricted}
          busy={busy}
          imageLabels={imageLabels}
          gifLoginMessage={commentLabels.login_gif}
          restrictedMessage={commentLabels.restricted}
          isSubmitting={() => submittingRef.current}
          onImagePreview={handleImagePreview}
          onImageUploadError={handleImageUploadError}
          onImageSelect={handleImageSelect}
          onGifSelect={handleGifSelect}
          onUploadingChange={handleUploadingChange}
        />

        <div className="flex min-w-0 items-center justify-end gap-2">
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={handleCancel}
            className={
              isCreate
                ? CANCEL_BUTTON_CLASS
                : "cursor-pointer disabled:cursor-not-allowed"
            }
            variant={isCreate ? "default" : "ghost"}
          >
            {isCreate ? inputLabels.cancel : actionLabels.cancel}
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={submitDisabled}
            onClick={handleSubmit}
            className="cursor-pointer disabled:cursor-not-allowed"
          >
            {isCreate
              ? isPending
                ? inputLabels.replying
                : inputLabels.reply
              : isPending
                ? actionLabels.saving
                : actionLabels.save}
          </Button>
        </div>
      </div>
    </div>
  );

  if (!isCreate) return editor;

  return (
    <div className="mt-3 mb-8 flex min-w-0 gap-3">
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

      {editor}
    </div>
  );
}
