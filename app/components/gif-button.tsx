"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { GifResult } from "./gif-picker";

const GifPicker = dynamic(
  () => import("./gif-picker").then((module) => module.GifPicker),
  { ssr: false },
);

interface GifButtonProps {
  isLoggedIn: boolean;
  isChatRestricted: boolean;
  busy: boolean;

  loginMessage: string;
  restrictedMessage: string;

  onSelect: (gif: GifResult) => void;

  // Covers the brief interval before pending state updates.
  isSubmitting?: () => boolean;
}

export function GifButton({
  isLoggedIn,
  isChatRestricted,
  busy,
  loginMessage,
  restrictedMessage,
  onSelect,
  isSubmitting,
}: GifButtonProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const unavailable = !isLoggedIn || isChatRestricted || busy;
  const showPicker = open && !unavailable;

  useEffect(() => {
    if (unavailable) {
      setOpen(false);
    }
  }, [unavailable]);

  function handleToggle() {
    if (!isLoggedIn) {
      toast.error(loginMessage);
      return;
    }

    if (isChatRestricted) {
      toast.error(restrictedMessage);
      return;
    }

    if (busy || isSubmitting?.()) return;

    setOpen((previous) => !previous);
  }

  function handleSelect(gif: GifResult) {
    if (unavailable || isSubmitting?.()) return;

    setOpen(false);
    onSelect(gif);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen && (unavailable || isSubmitting?.())) return;

    setOpen(nextOpen);
  }

  return (
    <div className="relative flex shrink-0 items-center gap-1">
      <button
        ref={triggerRef}
        type="button"
        disabled={busy}
        aria-label="Select GIF"
        aria-expanded={showPicker}
        onClick={handleToggle}
        className="
    cursor-pointer rounded-md px-2 py-1
    text-sm font-normal text-zinc-800
    transition-colors
    enabled:hover:bg-zinc-200
    focus-visible:outline-none
    focus-visible:ring-2 focus-visible:ring-ring
    disabled:cursor-wait disabled:opacity-50
    dark:text-zinc-200 dark:enabled:hover:bg-zinc-700
  "
      >
        GIF
      </button>

      {showPicker && (
        <GifPicker
          triggerRef={triggerRef}
          open={showPicker}
          onOpenChange={handleOpenChange}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}
