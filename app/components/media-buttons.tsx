"use client";

import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type Ref,
} from "react";
import { Image as ImageIcon, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { GifButton } from "./gif-button";

import type { CommentImage } from "@/lib/types/comment-image";
import type { GifResult } from "./gif-picker";

export interface ImageButtonLabels {
  attach: string;
  uploading: string;
  login: string;
  restricted: string;
  tooLarge: string;
  unsupported: string;
  invalid: string;
  failed: string;
}

export interface MediaButtonsHandle {
  uploadImage: (file: File) => Promise<CommentImage | null>;
  cancelUpload: () => void;
  waitForUpload: () => Promise<CommentImage | null>;
}

interface MediaButtonsProps {
  ref?: Ref<MediaButtonsHandle>;

  isLoggedIn: boolean;
  isChatRestricted: boolean;
  busy: boolean;

  imageLabels: ImageButtonLabels;
  gifLoginMessage: string;
  restrictedMessage: string;

  isSubmitting?: () => boolean;

  onImageSelect: (image: CommentImage) => void;
  onImagePreview?: (url: string, file: File) => void;
  onImageUploadError?: () => void;
  onGifSelect: (gif: GifResult) => void;
  onUploadingChange?: (uploading: boolean) => void;
}

const MAX_FILE_BYTES = 4 * 1024 * 1024;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const IMAGE_BUTTON_CLASS = `
  inline-flex cursor-pointer items-center justify-center
  rounded-md px-2 py-1.5
  text-sm font-normal leading-5 text-zinc-800
  transition-colors hover:bg-zinc-200
  focus-visible:outline-none
  focus-visible:ring-2 focus-visible:ring-ring
  disabled:cursor-wait disabled:opacity-50
  dark:text-zinc-200 dark:hover:bg-zinc-700
`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCommentImage(value: unknown): value is CommentImage {
  if (!isRecord(value)) return false;

  if (
    typeof value.src !== "string" ||
    typeof value.title !== "string" ||
    value.mediaType !== "image" ||
    typeof value.width !== "number" ||
    typeof value.height !== "number" ||
    !Number.isInteger(value.width) ||
    !Number.isInteger(value.height) ||
    value.width <= 0 ||
    value.height <= 0
  ) {
    return false;
  }

  try {
    return new URL(value.src).protocol === "https:";
  } catch {
    return false;
  }
}

function getUploadError(code: unknown, labels: ImageButtonLabels): string {
  switch (code) {
    case "LOGIN_REQUIRED":
      return labels.login;

    case "ACCOUNT_UNAVAILABLE":
    case "CHAT_RESTRICTED":
      return labels.restricted;

    case "IMAGE_TOO_LARGE":
      return labels.tooLarge;

    case "UNSUPPORTED_IMAGE":
    case "ANIMATED_IMAGE_NOT_SUPPORTED":
      return labels.unsupported;

    case "EMPTY_IMAGE":
    case "INVALID_IMAGE":
    case "SELECT_ONE_IMAGE":
      return labels.invalid;

    default:
      return labels.failed;
  }
}

export function MediaButtons({
  ref,
  isLoggedIn,
  isChatRestricted,
  busy,
  imageLabels,
  gifLoginMessage,
  restrictedMessage,
  isSubmitting,
  onImageSelect,
  onImagePreview,
  onImageUploadError,
  onGifSelect,
  onUploadingChange,
}: MediaButtonsProps) {
  const [uploading, setUploading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const uploadingRef = useRef(false);
  const mountedRef = useRef(false);

  const uploadPromiseRef = useRef<Promise<CommentImage | null> | null>(null);

  const latestRef = useRef({
    isLoggedIn,
    isChatRestricted,
    busy,
    imageLabels,
    isSubmitting,
    onImageSelect,
    onImagePreview,
    onImageUploadError,
    onGifSelect,
    onUploadingChange,
  });

  latestRef.current = {
    isLoggedIn,
    isChatRestricted,
    busy,
    imageLabels,
    isSubmitting,
    onImageSelect,
    onImagePreview,
    onImageUploadError,
    onGifSelect,
    onUploadingChange,
  };

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();

      if (uploadingRef.current) {
        latestRef.current.onUploadingChange?.(false);
      }
    };
  }, []);

  function cancelUpload() {
    controllerRef.current?.abort();
  }

  function waitForUpload() {
    return uploadPromiseRef.current ?? Promise.resolve(null);
  }

  function isGifBlocked() {
    return uploadingRef.current || Boolean(latestRef.current.isSubmitting?.());
  }

  function handleGifSelect(gif: GifResult) {
    const current = latestRef.current;

    if (
      !current.isLoggedIn ||
      current.isChatRestricted ||
      current.busy ||
      isGifBlocked()
    ) {
      return;
    }

    current.onGifSelect(gif);
  }

  function checkImageAccess() {
    const current = latestRef.current;

    if (!current.isLoggedIn) {
      toast.error(current.imageLabels.login);
      return false;
    }

    if (current.isChatRestricted) {
      toast.error(current.imageLabels.restricted);
      return false;
    }

    return !current.busy && !uploadingRef.current && !current.isSubmitting?.();
  }

  function handleImageClick() {
    if (!checkImageAccess()) return;

    inputRef.current?.click();
  }

  function uploadImage(file: File): Promise<CommentImage | null> {
    if (!checkImageAccess()) {
      return Promise.resolve(null);
    }

    const labels = latestRef.current.imageLabels;

    if (!ALLOWED_TYPES.has(file.type)) {
      toast.error(labels.unsupported);
      return Promise.resolve(null);
    }

    if (file.size === 0) {
      toast.error(labels.invalid);
      return Promise.resolve(null);
    }

    if (file.size > MAX_FILE_BYTES) {
      toast.error(labels.tooLarge);
      return Promise.resolve(null);
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    uploadingRef.current = true;
    setUploading(true);

    const previewUrl = URL.createObjectURL(file);

    latestRef.current.onImagePreview?.(previewUrl, file);
    latestRef.current.onUploadingChange?.(true);

    const promise = (async (): Promise<CommentImage | null> => {
      try {
        const formData = new FormData();
        formData.set("file", file);

        const response = await fetch("/api/comment-image", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        const result: unknown = await response.json().catch(() => null);

        if (!mountedRef.current || controller.signal.aborted) {
          return null;
        }

        const current = latestRef.current;

        if (!response.ok) {
          const code = isRecord(result) ? result.error : undefined;

          toast.error(
            response.status === 413
              ? current.imageLabels.tooLarge
              : getUploadError(code, current.imageLabels),
          );

          current.onImageUploadError?.();
          return null;
        }

        if (!isRecord(result) || !isCommentImage(result.image)) {
          toast.error(current.imageLabels.failed);
          current.onImageUploadError?.();
          return null;
        }

        if (!current.isLoggedIn || current.isChatRestricted) {
          return null;
        }

        current.onImageSelect(result.image);

        return result.image;
      } catch (error) {
        if (!mountedRef.current || controller.signal.aborted) {
          return null;
        }

        console.error("Failed to upload comment image:", error);
        toast.error(latestRef.current.imageLabels.failed);

        latestRef.current.onImageUploadError?.();

        return null;
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }

        uploadingRef.current = false;

        if (mountedRef.current) {
          setUploading(false);
          latestRef.current.onUploadingChange?.(false);
        }

        if (!latestRef.current.onImagePreview) {
          URL.revokeObjectURL(previewUrl);
        }
      }
    })();

    uploadPromiseRef.current = promise;

    void promise.finally(() => {
      if (uploadPromiseRef.current === promise) {
        uploadPromiseRef.current = null;
      }
    });

    return promise;
  }

  useImperativeHandle(ref, () => ({
    uploadImage,
    cancelUpload,
    waitForUpload,
  }));

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    event.currentTarget.value = "";

    if (!file) return;

    void uploadImage(file);
  }

  const imageLabel = uploading ? imageLabels.uploading : imageLabels.attach;

  return (
    <div className="flex shrink-0 items-center">
      <GifButton
        isLoggedIn={isLoggedIn}
        isChatRestricted={isChatRestricted}
        busy={busy || uploading}
        loginMessage={gifLoginMessage}
        restrictedMessage={restrictedMessage}
        isSubmitting={isGifBlocked}
        onSelect={handleGifSelect}
      />

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        tabIndex={-1}
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        type="button"
        disabled={busy || uploading}
        aria-label={imageLabel}
        aria-busy={uploading}
        title={imageLabel}
        onClick={handleImageClick}
        className={IMAGE_BUTTON_CLASS}
      >
        {uploading ? (
          <LoaderCircle
            className="size-4 animate-spin motion-reduce:animate-none"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        ) : (
          <ImageIcon className="size-4" strokeWidth={1.75} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
