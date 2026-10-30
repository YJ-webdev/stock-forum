"use client";

import { X } from "lucide-react";

interface GifPreviewProps {
  src: string;
  preview?: string | null;
  title?: string;
  disabled: boolean;
  onRemove: () => void;
}

export function GifPreview({
  src,
  preview,
  title = "GIF",
  disabled,
  onRemove,
}: GifPreviewProps) {
  return (
    <div className="relative mb-3 w-fit max-w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={preview || src}
        alt={title}
        decoding="async"
        className="block max-h-60 max-w-full rounded-lg object-contain"
      />

      <button
        type="button"
        aria-label="Remove GIF"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;

          onRemove();
        }}
        className="
          absolute right-2 top-2
          flex size-7 cursor-pointer
          items-center justify-center rounded-full
          bg-black/60 text-white
          transition-colors hover:bg-black/75
          disabled:cursor-not-allowed disabled:opacity-50
        "
      >
        <X size={15} aria-hidden="true" />
      </button>
    </div>
  );
}
