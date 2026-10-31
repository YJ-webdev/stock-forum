"use client";

import type { MouseEvent } from "react";
import { ArrowUp } from "lucide-react";

function handleScrollToTop(event: MouseEvent<HTMLButtonElement>) {
  const container =
    event.currentTarget.closest<HTMLElement>("[data-main-scroll]") ?? window;

  container.scrollTo({
    top: 0,
    behavior: "instant",
  });
}

export function ScrollToTopButton() {
  return (
    <div
      className="
        pointer-events-none sticky bottom-6 z-20
        flex h-0 shrink-0 justify-end px-4
      "
    >
      <button
        type="button"
        aria-label="Back to top"
        title="Back to top"
        onClick={handleScrollToTop}
        className="
          pointer-events-auto flex size-11 -translate-y-full
          cursor-pointer items-center justify-center rounded-full
          border border-zinc-200 bg-white
          text-zinc-700
          hover:bg-zinc-100
          focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-zinc-400
          dark:border-zinc-700 dark:bg-zinc-800
          dark:text-zinc-100 dark:hover:bg-zinc-700
        "
      >
        <ArrowUp aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}
