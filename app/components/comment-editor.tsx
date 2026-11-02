"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import type { JSONContent } from "@tiptap/react";
import { toast } from "sonner";

import {
  createComment,
  editComment,
  type MarketPageComments,
} from "@/app/actions/post";
import { useCurrentUser } from "@/app/context/user-context";
import {
  useCommentDraft,
  type CommentDraftProps,
} from "@/app/hooks/use-comment-draft";

import { resolveLanguage } from "@/lib/data/languages";
import {
  COMMENT_LABELS,
  COMMENT_EDIT_LABELS,
  COMMENT_IMAGE_LABELS,
  CONTENT_RESULT_LABELS,
  SUBMIT_VALIDATION_LABELS,
} from "@/lib/data/translations";

import type { CommentImage } from "@/lib/types/comment-image";
import { buildCommentContent } from "@/lib/utils/build-comment-content";
import { getGifDimensions } from "@/lib/utils/gif-dimensions";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

import { CommentTextarea } from "./comment-textarea";
import { GifPreview } from "./gif-preview";
import { ImagePreview } from "./image-preview";
import { MediaButtons, type MediaButtonsHandle } from "./media-buttons";
import { VotingCountdown } from "./voting-countdown";

import type { GifResult } from "./gif-picker";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type Comment = MarketPageComments[number];

interface EditorUser {
  name?: string | null;
  image?: string | null;
  language?: string | null;
}

interface CreateProps extends CommentDraftProps {
  mode: "create";

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

  currentUser: EditorUser | null;

  onCommentCreated: (comment: Comment) => void | Promise<void>;
}

interface EditProps {
  mode: "edit";

  commentId: string;
  initialContent: JSONContent;

  onCancel: () => void;

  onSaved: (result: {
    success: boolean;
    content: JSONContent;
    editedAt: Date;
  }) => void | Promise<void>;
}

type CommentEditorProps = CreateProps | EditProps;

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

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function getNodeText(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";

  return (node.content ?? []).map(getNodeText).join("");
}

function getPositiveDimension(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

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

    const src = node.attrs.src.trim();

    // Legacy media without mediaType is treated as GIF.
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

// -----------------------------------------------------------------------------
// Create editor
// -----------------------------------------------------------------------------

function CreateCommentEditor({
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
}: CreateProps) {
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaButtonsRef = useRef<MediaButtonsHandle>(null);

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
  const inputReadOnly = !isLoggedIn || isPending || isChatRestricted;

  const hasContent =
    comment.trim().length > 0 || Boolean(selectedGif) || Boolean(selectedImage);

  const inputLabel = isLoggedIn ? commentLabels.write : commentLabels.login;

  const displayName = user?.name ?? currentUser?.name;
  const displayImage = user?.image ?? currentUser?.image;

  const avatarInitial =
    Array.from(displayName?.trim() ?? "")[0]?.toUpperCase() || "G";

  useEffect(() => {
    if (isLoggedIn) return;
    clearDraft();
  }, [isLoggedIn, clearDraft]);

  function handleImageUploadingChange(uploading: boolean) {
    imageUploadingRef.current = uploading;
    setImageUploading(uploading);
  }

  function handleCommentChange(value: string) {
    if (inputReadOnly || submittingRef.current) return;
    setComment(value);
  }

  function handleGifSelect(gif: GifResult) {
    if (inputReadOnly || submittingRef.current || imageUploadingRef.current) {
      return;
    }

    setSelectedGif(gif);
    uploadedImageRef.current = null;
    setSelectedImage(null);
    clearLocalPreview();
  }

  function handleImageSelect(image: CommentImage) {
    // Upload completion occurs before uploading state is cleared.
    if (inputReadOnly || submittingRef.current) return;

    uploadedImageRef.current = image;
    setSelectedImage(image);
    clearLocalPreview();
  }

  function handleGifRemove() {
    if (inputReadOnly || busy || submittingRef.current) return;
    setSelectedGif(null);
  }

  function handleImageRemove() {
    if (inputReadOnly || busy || submittingRef.current) return;
    mediaButtonsRef.current?.cancelUpload();
    uploadedImageRef.current = null;
    setSelectedImage(null);
    clearLocalPreview();
  }

  function handleImagePaste(file: File) {
    void mediaButtonsRef.current?.uploadImage(file);
  }

  function handleSubmit() {
    if (isPending || submittingRef.current) {
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

    if (!hasContent && !localPreviewUrl) {
      toast.error(validationLabels.content);
      textareaRef.current?.focus({ preventScroll: true });
      return;
    }

    submittingRef.current = true;

    startTransition(async () => {
      try {
        let imageToSubmit = uploadedImageRef.current ?? selectedImage;
        if (imageUploadingRef.current) {
          const uploaded = await mediaButtonsRef.current?.waitForUpload();
          if (!uploaded) return;
          imageToSubmit = uploaded;
        }
        const content = buildCommentContent(
          comment,
          selectedGif,
          imageToSubmit,
        );
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
        uploadedImageRef.current = null;
        clearLocalPreview();
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
            onImagePaste={handleImagePaste}
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

          {isLoggedIn && (selectedImage || localPreviewUrl) && (
            <ImagePreview
              image={selectedImage}
              previewUrl={localPreviewUrl}
              uploading={imageUploading}
              removeLabel={imageLabels.remove}
              disabled={inputReadOnly || busy}
              onRemove={handleImageRemove}
            />
          )}

          <div className="flex min-w-0 pb-2 items-center justify-between gap-1">
            <MediaButtons
              ref={mediaButtonsRef}
              isLoggedIn={isLoggedIn}
              isChatRestricted={isChatRestricted}
              busy={isPending || imageUploading}
              imageLabels={imageLabels}
              gifLoginMessage={commentLabels.login_gif}
              restrictedMessage={commentLabels.restricted}
              isSubmitting={() => submittingRef.current}
              onImagePreview={handleImagePreview}
              onImageUploadError={handleImageUploadError}
              onImageSelect={handleImageSelect}
              onGifSelect={handleGifSelect}
              onUploadingChange={handleImageUploadingChange}
            />

            {showCountdown && (
              <div className="hidden sm:block ml-auto">
                <VotingCountdown
                  targetMs={targetMs}
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
              aria-busy={isPending}
              onClick={handleSubmit}
              className="
                    shrink-0 cursor-pointer border-none
                    bg-transparent px-2 text-zinc-800 shadow-none
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
  );
}

// -----------------------------------------------------------------------------
// Edit editor
// -----------------------------------------------------------------------------

function EditCommentEditor({
  commentId,
  initialContent,
  onCancel,
  onSaved,
}: EditProps) {
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaButtonsRef = useRef<MediaButtonsHandle>(null);

  const submittingRef = useRef(false);
  const imageUploadingRef = useRef(false);

  const isLoggedIn = Boolean(user);

  const isChatRestricted =
    user?.status === "BANNED" || user?.status === "MUTED";

  const busy = isPending || imageUploading;
  const inputReadOnly = !isLoggedIn || isPending || isChatRestricted;

  const hasContent =
    comment.trim().length > 0 || Boolean(selectedGif) || Boolean(selectedImage);

  const hasChanges =
    comment.trim() !== initial.text.trim() ||
    getAttachmentKey(selectedGif, selectedImage) !==
      getAttachmentKey(initial.gif, initial.image);

  const saveDisabled =
    isPending ||
    (isLoggedIn &&
      !isChatRestricted &&
      ((!hasContent && !localPreviewUrl) || (!hasChanges && !localPreviewUrl)));

  const inputLabel = isLoggedIn ? labels.placeholder : commentLabels.login;

  function handleImageUploadingChange(uploading: boolean) {
    imageUploadingRef.current = uploading;
    setImageUploading(uploading);
  }

  function handleCommentChange(value: string) {
    if (inputReadOnly || submittingRef.current) return;
    setComment(value);
  }

  function handleGifSelect(gif: GifResult) {
    if (inputReadOnly || submittingRef.current || imageUploadingRef.current) {
      return;
    }

    const dimensions = getGifDimensions(gif.width, gif.height);

    uploadedImageRef.current = null;
    clearLocalPreview();
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
    if (inputReadOnly || submittingRef.current) return;

    uploadedImageRef.current = image;
    setSelectedImage(image);
    clearLocalPreview();
    setSelectedGif(null);
  }

  function handleGifRemove() {
    if (inputReadOnly || busy || submittingRef.current) return;
    setSelectedGif(null);
  }

  function handleImageRemove() {
    if (inputReadOnly || busy || submittingRef.current) return;
    mediaButtonsRef.current?.cancelUpload();
    uploadedImageRef.current = null;
    setSelectedImage(null);
    clearLocalPreview();
  }

  function handleImagePaste(file: File) {
    void mediaButtonsRef.current?.uploadImage(file);
  }

  function handleCancel() {
    if (busy || submittingRef.current) return;
    onCancel();
  }

  function handleSave() {
    if (isPending || submittingRef.current) return;

    if (!isLoggedIn) {
      toast.error(commentLabels.login.replace(/\.{3}$/, ""));
      return;
    }

    if (isChatRestricted) {
      toast.error(commentLabels.restricted);
      return;
    }

    if ((!hasContent && !localPreviewUrl) || (!hasChanges && !localPreviewUrl))
      return;

    submittingRef.current = true;

    startTransition(async () => {
      try {
        let imageToSubmit = uploadedImageRef.current ?? selectedImage;
        if (imageUploadingRef.current) {
          const uploaded = await mediaButtonsRef.current?.waitForUpload();
          if (!uploaded) return;
          imageToSubmit = uploaded;
        }
        const content = buildCommentContent(
          comment,
          selectedGif,
          imageToSubmit,
        );
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

        clearLocalPreview();
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
      handleSave();
    }
  }

  return (
    <div className="rounded-lg bg-zinc-100 px-2.5 pb-2 dark:bg-zinc-800">
      <CommentTextarea
        textareaRef={textareaRef}
        value={comment}
        onValueChange={handleCommentChange}
        onImagePaste={handleImagePaste}
        onKeyDown={handleKeyDown}
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

      {isLoggedIn && (selectedImage || localPreviewUrl) && (
        <ImagePreview
          image={selectedImage}
          previewUrl={localPreviewUrl}
          uploading={imageUploading}
          removeLabel={imageLabels.remove}
          disabled={inputReadOnly || busy}
          onRemove={handleImageRemove}
        />
      )}

      <div className="flex items-center justify-between gap-2">
        <MediaButtons
          ref={mediaButtonsRef}
          isLoggedIn={isLoggedIn}
          isChatRestricted={isChatRestricted}
          busy={isPending || imageUploading}
          imageLabels={imageLabels}
          gifLoginMessage={commentLabels.login_gif}
          restrictedMessage={commentLabels.restricted}
          isSubmitting={() => submittingRef.current}
          onImagePreview={handleImagePreview}
          onImageUploadError={handleImageUploadError}
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

// -----------------------------------------------------------------------------
// Public component
// -----------------------------------------------------------------------------

export function CommentEditor(props: CommentEditorProps) {
  if (props.mode === "create") {
    return <CreateCommentEditor {...props} />;
  }

  return <EditCommentEditor {...props} />;
}
