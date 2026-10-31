"use client";

import { X } from "lucide-react";

import type { CommentImage } from "@/lib/types/comment-image";

interface ImagePreviewProps {
  image: CommentImage;
  removeLabel: string;
  disabled?: boolean;
  onRemove: () => void;
}

export function ImagePreview({
  image,
  removeLabel,
  disabled = false,
  onRemove,
}: ImagePreviewProps) {
  return (
    <div className="pb-3">
      <div className="relative w-fit max-w-full">
        <img
          src={image.src}
          alt={image.title}
          width={image.width}
          height={image.height}
          decoding="async"
          className="
            block h-auto max-h-72 w-auto max-w-full
            rounded-lg object-contain
          "
        />

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
            focus-visible:ring-2 focus-visible:ring-white
            disabled:cursor-not-allowed disabled:opacity-50
          "
        >
          <X className="size-4" strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
