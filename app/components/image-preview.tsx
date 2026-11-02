"use client";

import { LoaderCircle, X } from "lucide-react";

import type { CommentImage } from "@/lib/types/comment-image";

interface ImagePreviewProps {
  image?: CommentImage | null;
  previewUrl?: string | null;
  uploading?: boolean;
  removeLabel: string;
  disabled?: boolean;
  onRemove: () => void;
}

export function ImagePreview({
  image,
  previewUrl,
  uploading = false,
  removeLabel,
  disabled = false,
  onRemove,
}: ImagePreviewProps) {
  const src = previewUrl || image?.src;

  if (!src) return null;

  return (
    <div className="pb-3">
      <div className="relative w-fit max-w-full">
        <img
          src={src}
          alt={image?.title ?? "Image"}
          width={image?.width}
          height={image?.height}
          decoding="async"
          className="
            block h-auto max-h-72 w-auto max-w-full
            rounded-lg object-contain
          "
        />

        {uploading && (
          <div
            role="status"
            aria-label="Uploading image"
            className="
              absolute bottom-2 right-2
              flex size-7 items-center justify-center
              rounded-full bg-black/65 text-white
            "
          >
            <LoaderCircle
              className="size-4 animate-spin motion-reduce:animate-none"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </div>
        )}

        <button
          type="button"
          disabled={disabled}
          aria-label={removeLabel}
          title={removeLabel}
          onClick={onRemove}
          className="
            absolute right-2 top-2
            inline-flex size-7 cursor-pointer
            items-center justify-center rounded-full
            bg-black/65 text-white transition-colors
            hover:bg-black/85
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-white
            disabled:cursor-not-allowed disabled:opacity-50
          "
        >
          <X className="size-4" strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
