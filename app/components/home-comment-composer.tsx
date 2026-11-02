"use client";

import { useEffect, useId, useRef, useState, type ClipboardEvent } from "react";
import { SquarePen } from "lucide-react";
import { toast } from "sonner";

import { createComment } from "@/app/actions/post";
import { useCurrentUser } from "@/app/context/user-context";
import { useCommentDraft } from "@/app/hooks/use-comment-draft";

import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";
import { resolveLanguage } from "@/lib/data/languages";
import {
  COMMENT_IMAGE_LABELS,
  COMMENT_LABELS,
  HOME_COMMUNITY_LABELS,
  HOME_COMPOSER_LABELS,
} from "@/lib/data/translations";

import type { CommentImage } from "@/lib/types/comment-image";
import { buildCommentContent } from "@/lib/utils/build-comment-content";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { GifPreview } from "./gif-preview";
import { ImagePreview } from "./image-preview";
import { MediaButtons, type MediaButtonsHandle } from "./media-buttons";
import type { GifResult } from "./gif-picker";

interface HomeCommentComposerProps {
  defaultSymbol: string | null;
  onPublished: (symbol: string) => void | Promise<void>;
}

const MIN_TEXTAREA_HEIGHT = 112;
const MAX_TEXTAREA_HEIGHT = 320;

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

export function HomeCommentComposer({
  defaultSymbol,
  onPublished,
}: HomeCommentComposerProps) {
  const user = useCurrentUser();

  const language = resolveLanguage(user?.language);
  const labels = HOME_COMMUNITY_LABELS[language];
  const copy = HOME_COMPOSER_LABELS[language];
  const commentLabels = COMMENT_LABELS[language];
  const imageLabels = COMMENT_IMAGE_LABELS[language];

  const {
    comment: text,
    setComment: setText,
    selectedGif,
    setSelectedGif,
    selectedImage,
    setSelectedImage,
  } = useCommentDraft("", null);

  const [expanded, setExpanded] = useState(false);
  const [symbol, setSymbol] = useState(defaultSymbol ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  const editorId = useId();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const mediaButtonsRef = useRef<MediaButtonsHandle>(null);

  const submittingRef = useRef(false);
  const imageUploadingRef = useRef(false);
  const mountedRef = useRef(false);

  const localPreviewRef = useRef<string | null>(null);
  const selectedImageRef = useRef<CommentImage | null>(selectedImage);

  const viewerId = user?.id ?? null;
  const viewerIdRef = useRef(viewerId);
  viewerIdRef.current = viewerId;

  const isLoggedIn = Boolean(viewerId);

  const isChatRestricted =
    user?.status === "BANNED" || user?.status === "MUTED";

  // Uploading does not block text editing.
  const busy = submitting;
  const editorDisabled = busy || isChatRestricted || !isLoggedIn;
  const editorOpen = expanded && isLoggedIn;

  const selectedMarket = ALL_MARKET_SYMBOLS.find(
    (market) => market.symbol === symbol,
  );

  const hasContent =
    text.trim().length > 0 ||
    Boolean(selectedGif) ||
    Boolean(selectedImage) ||
    Boolean(localPreviewUrl);

  const avatarInitial =
    Array.from(user?.name?.trim() ?? "")[0]?.toUpperCase() || "G";

  useEffect(() => {
    selectedImageRef.current = selectedImage;
  }, [selectedImage]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      mediaButtonsRef.current?.cancelUpload();

      if (localPreviewRef.current) {
        URL.revokeObjectURL(localPreviewRef.current);
        localPreviewRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setText("");
    setSelectedGif(null);
    setSelectedImage(null);
    selectedImageRef.current = null;

    setSymbol("");
    setExpanded(false);

    mediaButtonsRef.current?.cancelUpload();

    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current);
      localPreviewRef.current = null;
    }

    setLocalPreviewUrl(null);
  }, [viewerId, setText, setSelectedGif, setSelectedImage]);

  useEffect(() => {
    if (!editorOpen || isChatRestricted) return;

    inputRef.current?.focus({ preventScroll: true });
  }, [editorOpen, isChatRestricted]);

  useEffect(() => {
    const input = inputRef.current;

    if (!input || !editorOpen) return;

    function resizeTextarea() {
      if (!input) return;

      input.style.height = "auto";

      const contentHeight = input.scrollHeight;

      input.style.height = `${Math.max(
        MIN_TEXTAREA_HEIGHT,
        Math.min(contentHeight, MAX_TEXTAREA_HEIGHT),
      )}px`;

      input.style.overflowY =
        contentHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
    }

    resizeTextarea();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", resizeTextarea);

      return () => {
        window.removeEventListener("resize", resizeTextarea);
      };
    }

    let previousWidth = input.getBoundingClientRect().width;

    const observer = new ResizeObserver(() => {
      const width = input.getBoundingClientRect().width;

      if (width === previousWidth) return;

      previousWidth = width;
      resizeTextarea();
    });

    observer.observe(input);

    return () => observer.disconnect();
  }, [text, editorOpen]);

  function clearLocalPreview() {
    const previousUrl = localPreviewRef.current;

    localPreviewRef.current = null;
    setLocalPreviewUrl(null);

    if (previousUrl) {
      URL.revokeObjectURL(previousUrl);
    }
  }

  function restoreTriggerFocus() {
    window.requestAnimationFrame(() => {
      if (!mountedRef.current) return;

      triggerRef.current?.focus({ preventScroll: true });
    });
  }

  function focusInputEnd() {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (!mountedRef.current || submittingRef.current) {
          return;
        }

        const input = inputRef.current;

        if (
          !input ||
          input.disabled ||
          input.readOnly ||
          input.closest("[inert]")
        ) {
          return;
        }

        input.focus({ preventScroll: true });

        const end = input.value.length;
        input.setSelectionRange(end, end);
      });
    });
  }

  function canWrite() {
    if (!isLoggedIn) {
      toast.error(copy.login);
      return false;
    }

    if (isChatRestricted) {
      toast.error(commentLabels.restricted);
      return false;
    }

    return true;
  }

  function openEditor() {
    if (submittingRef.current || !canWrite()) {
      return;
    }

    if (!symbol && !hasContent) {
      setSymbol(defaultSymbol ?? "");
    }

    setExpanded(true);
  }

  function collapseEditor() {
    if (submittingRef.current) return;

    // Collapsing preserves the draft and selected market.
    setExpanded(false);
    restoreTriggerFocus();
  }

  function handleMarketChange(value: string | null) {
    if (editorDisabled || submittingRef.current) return;

    setSymbol(value ?? "");

    if (value) {
      focusInputEnd();
    }
  }

  function handleGifSelect(gif: GifResult) {
    if (editorDisabled || submittingRef.current || imageUploadingRef.current) {
      return;
    }

    setSelectedGif(gif);
    setSelectedImage(null);
    selectedImageRef.current = null;
    clearLocalPreview();
  }

  function handleGifRemove() {
    if (editorDisabled || submittingRef.current) return;

    setSelectedGif(null);
  }

  function handleImageUploadingChange(uploading: boolean) {
    imageUploadingRef.current = uploading;

    if (mountedRef.current) {
      setImageUploading(uploading);
    }
  }

  function handleImagePreview(url: string, _file: File) {
    if (!mountedRef.current) {
      URL.revokeObjectURL(url);
      return;
    }

    clearLocalPreview();

    localPreviewRef.current = url;
    setLocalPreviewUrl(url);

    setSelectedImage(null);
    selectedImageRef.current = null;
    setSelectedGif(null);
  }

  function handleImageSelect(image: CommentImage) {
    if (!mountedRef.current || !isLoggedIn || isChatRestricted) {
      return;
    }

    selectedImageRef.current = image;
    setSelectedImage(image);
    setSelectedGif(null);

    clearLocalPreview();
  }

  function handleImageUploadError() {
    if (!mountedRef.current) return;

    clearLocalPreview();
  }

  function handleImageRemove() {
    if (submittingRef.current) return;

    mediaButtonsRef.current?.cancelUpload();

    selectedImageRef.current = null;
    setSelectedImage(null);

    clearLocalPreview();
  }

  function handleImagePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    if (!editorOpen || editorDisabled || submittingRef.current) {
      return;
    }

    const imageFile = Array.from(event.clipboardData.items)
      .find((item) => item.kind === "file" && item.type.startsWith("image/"))
      ?.getAsFile();

    if (!imageFile) return;

    event.preventDefault();

    const mediaButtons = mediaButtonsRef.current;

    if (!mediaButtons) {
      console.error("MediaButtons ref is not available.");
      return;
    }

    void mediaButtons.uploadImage(imageFile);
  }

  async function publish() {
    if (submittingRef.current || !canWrite()) return;

    if (!selectedMarket) {
      toast.error(copy.select_market);
      return;
    }

    if (!hasContent) {
      toast.error(copy.write_comment);
      inputRef.current?.focus({ preventScroll: true });
      return;
    }

    const submittedUserId = viewerId;
    const submittedSymbol = selectedMarket.symbol;

    submittingRef.current = true;
    setSubmitting(true);

    try {
      let imageToSubmit = selectedImageRef.current;

      if (imageUploadingRef.current) {
        const uploadedImage = await mediaButtonsRef.current?.waitForUpload();

        if (!uploadedImage) {
          // Preserve text and other draft state.
          return;
        }

        imageToSubmit = uploadedImage;
      }

      if (!mountedRef.current || viewerIdRef.current !== submittedUserId) {
        return;
      }

      const submittedContent = buildCommentContent(
        text,
        selectedGif,
        imageToSubmit,
      );

      await createComment({
        content: submittedContent,
        assetSymbols: [submittedSymbol],
      });

      if (!mountedRef.current || viewerIdRef.current !== submittedUserId) {
        return;
      }

      setText("");
      setSelectedGif(null);
      setSelectedImage(null);
      selectedImageRef.current = null;

      clearLocalPreview();

      setSymbol("");
      setExpanded(false);

      toast.success(copy.success);
      restoreTriggerFocus();

      try {
        await onPublished(submittedSymbol);
      } catch (error) {
        console.error(
          "Comment published, but the home list update failed:",
          error,
        );
      }
    } catch (error) {
      if (mountedRef.current) {
        toast.error(
          error instanceof Error && error.message ? error.message : copy.failed,
        );
      }
    } finally {
      submittingRef.current = false;

      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  }

  return (
    <div className="mt-3 mb-6">
      <div data-tour-group="composer" className="flex items-start gap-3">
        <Avatar className="size-9 shrink-0" aria-hidden="true">
          <AvatarImage
            src={user?.image ?? undefined}
            alt=""
            className="object-cover"
          />

          <AvatarFallback
            data-tour="composer"
            className="
              border border-olive-500 bg-olive-500
              text-sm text-zinc-100
              dark:bg-olive-500 dark:text-zinc-100
            "
          >
            {avatarInitial}
          </AvatarFallback>
        </Avatar>

        <div className="relative min-h-10 min-w-0 flex-1">
          <button
            ref={triggerRef}
            data-tour="composer"
            type="button"
            disabled={submitting}
            aria-expanded={editorOpen}
            aria-controls={editorId}
            aria-hidden={editorOpen}
            inert={editorOpen}
            onClick={openEditor}
            className={`
              absolute inset-x-0 top-0
              flex h-10 w-full cursor-pointer items-center
              justify-between gap-3 rounded-full
              border border-zinc-300 bg-white
              px-4 text-left text-[15px] text-zinc-400
              transition-[opacity,background-color,border-color]
              duration-150 ease-out
              motion-reduce:transition-none
              enabled:hover:border-zinc-400
              enabled:hover:bg-zinc-50
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-zinc-400
              disabled:cursor-not-allowed disabled:opacity-50
              dark:border-zinc-700 dark:bg-zinc-800
              dark:text-zinc-500
              dark:enabled:hover:border-zinc-600
              dark:enabled:hover:bg-zinc-800/50
              ${
                editorOpen
                  ? "pointer-events-none invisible opacity-0"
                  : "visible opacity-100"
              }
            `}
          >
            <span className="truncate">
              {text.trim() ||
                (selectedImage || localPreviewUrl
                  ? imageLabels.attach
                  : selectedGif
                    ? copy.gif_draft
                    : labels.share_view)}
            </span>

            <SquarePen
              className="size-4 shrink-0"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </button>

          <div
            id={editorId}
            aria-hidden={!editorOpen}
            inert={!editorOpen}
            className={`
              grid transition-[grid-template-rows,opacity]
              duration-250 ease-out
              motion-reduce:transition-none
              ${
                editorOpen
                  ? "grid-rows-[1fr] opacity-100"
                  : "pointer-events-none grid-rows-[0fr] opacity-0"
              }
            `}
          >
            <div className="min-h-0 overflow-hidden">
              <div
                aria-busy={submitting}
                className={`
                  transition-transform duration-250 ease-out
                  motion-reduce:transition-none
                  ${editorOpen ? "translate-y-0" : "-translate-y-1"}
                `}
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {user?.name}
                  </span>

                  <Select
                    value={symbol || null}
                    onValueChange={handleMarketChange}
                    disabled={editorDisabled || !editorOpen}
                  >
                    <SelectTrigger
                      aria-label={copy.market}
                      className="h-8 w-auto max-w-full rounded-full text-xs"
                    >
                      <SelectValue placeholder={copy.market}>
                        {selectedMarket?.name ?? copy.market}
                      </SelectValue>
                    </SelectTrigger>

                    <SelectContent
                      align="start"
                      className="
                        w-full rounded-xl
                        border-zinc-200 bg-white
                        dark:border-zinc-700 dark:bg-zinc-900
                      "
                    >
                      {ALL_MARKET_SYMBOLS.map((market) => (
                        <SelectItem
                          key={market.symbol}
                          value={market.symbol}
                          className="cursor-pointer rounded-lg"
                        >
                          {market.displaySymbol} · {market.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div
                  onClick={() => {
                    if (!submitting && isChatRestricted) {
                      toast.error(commentLabels.restricted);
                    }
                  }}
                >
                  <textarea
                    ref={inputRef}
                    value={text}
                    onPaste={handleImagePaste}
                    onChange={(event) => {
                      if (editorDisabled || submittingRef.current) {
                        return;
                      }

                      setText(event.target.value);
                    }}
                    placeholder={labels.share_view}
                    aria-label={labels.share_view}
                    disabled={editorDisabled}
                    rows={4}
                    className={`
                      block min-h-28 w-full resize-none overflow-y-auto
                      rounded-xl border border-zinc-300 bg-transparent
                      px-3.5 py-3 text-base leading-6 text-zinc-900
                      placeholder:text-zinc-400 focus:outline-none
                      disabled:cursor-not-allowed disabled:opacity-60
                      dark:border-zinc-600 dark:text-zinc-100
                      dark:placeholder:text-zinc-500
                      md:text-[15px]
                      ${isChatRestricted ? "pointer-events-none" : ""}
                    `}
                  />
                </div>

                {selectedGif && (
                  <div className="mt-3">
                    <GifPreview
                      src={selectedGif.src}
                      preview={selectedGif.preview}
                      title={selectedGif.title || copy.gif_draft}
                      disabled={editorDisabled}
                      onRemove={handleGifRemove}
                    />
                  </div>
                )}

                {(selectedImage || localPreviewUrl) && (
                  <div className="mt-3">
                    <ImagePreview
                      image={selectedImage}
                      previewUrl={localPreviewUrl}
                      uploading={imageUploading}
                      removeLabel={imageLabels.remove}
                      disabled={submitting}
                      onRemove={handleImageRemove}
                    />
                  </div>
                )}

                <div className="@container mt-3 flex items-center justify-between gap-2 pb-2">
                  <div className="flex min-h-8 shrink-0 items-center">
                    <MediaButtons
                      ref={mediaButtonsRef}
                      key={viewerId}
                      isLoggedIn={isLoggedIn}
                      isChatRestricted={isChatRestricted}
                      busy={submitting || imageUploading}
                      imageLabels={imageLabels}
                      gifLoginMessage={commentLabels.login_gif}
                      restrictedMessage={commentLabels.restricted}
                      isSubmitting={() => submittingRef.current}
                      onImagePreview={handleImagePreview}
                      onImageSelect={handleImageSelect}
                      onImageUploadError={handleImageUploadError}
                      onGifSelect={handleGifSelect}
                      onUploadingChange={handleImageUploadingChange}
                    />
                  </div>

                  <div className="flex min-w-0 items-center justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={submitting}
                      onClick={collapseEditor}
                      className={CANCEL_BUTTON_CLASS}
                    >
                      {copy.cancel}
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      disabled={submitting}
                      aria-busy={submitting}
                      onClick={() => void publish()}
                      className="cursor-pointer disabled:cursor-not-allowed"
                    >
                      {submitting ? copy.publishing : copy.publish}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
