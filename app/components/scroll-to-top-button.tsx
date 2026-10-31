"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

interface ScrollToTopButtonProps {
  threshold?: number;
}

export function ScrollToTopButton({ threshold = 400 }: ScrollToTopButtonProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLElement | Window | null>(null);

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const container =
      anchor.closest<HTMLElement>("[data-main-scroll]") ?? window;

    scrollContainerRef.current = container;

    let frame: number | null = null;
    let previousVisible = false;

    function updateVisibility() {
      frame = null;

      const scrollTop =
        container instanceof HTMLElement
          ? container.scrollTop
          : container.scrollY;

      const nextVisible = scrollTop > Math.max(0, threshold);

      if (nextVisible === previousVisible) return;

      previousVisible = nextVisible;
      setVisible(nextVisible);
    }

    function scheduleUpdate() {
      if (frame !== null) return;

      frame = window.requestAnimationFrame(updateVisibility);
    }

    setVisible(false);
    scheduleUpdate();

    container.addEventListener("scroll", scheduleUpdate, {
      passive: true,
    });

    return () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }

      container.removeEventListener("scroll", scheduleUpdate);
      scrollContainerRef.current = null;
    };
  }, [threshold]);

  function scrollToTop() {
    const container = scrollContainerRef.current;
    if (!container) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    container.scrollTo({
      top: 0,
      behavior: reduceMotion ? "instant" : "smooth",
    });
  }

  return (
    <div
      ref={anchorRef}
      className="
        pointer-events-none sticky bottom-6 z-20
        flex h-0 shrink-0 justify-end px-4
      "
    >
      {visible && (
        <button
          type="button"
          aria-label="Back to top"
          title="Back to top"
          onClick={scrollToTop}
          className="
            pointer-events-auto flex size-11 -translate-y-full
            cursor-pointer items-center justify-center rounded-full
            border border-zinc-200 bg-white
            text-zinc-700 shadow-md
            transition-transform duration-150
            hover:scale-105 active:scale-95
            focus-visible:outline-none
            focus-visible:ring-2 focus-visible:ring-zinc-400
            motion-reduce:transition-none
            motion-reduce:hover:scale-100
            motion-reduce:active:scale-100
            dark:border-zinc-700 dark:bg-zinc-800
            dark:text-zinc-100
          "
        >
          <ArrowUp aria-hidden="true" className="size-5" />
        </button>
      )}
    </div>
  );
}
