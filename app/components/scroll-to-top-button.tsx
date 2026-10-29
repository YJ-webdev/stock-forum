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

    function updateVisibility() {
      const scrollTop =
        container instanceof HTMLElement
          ? container.scrollTop
          : container.scrollY;

      setVisible(scrollTop >= threshold);
    }

    const frame = window.requestAnimationFrame(updateVisibility);

    container.addEventListener("scroll", updateVisibility, {
      passive: true,
    });

    return () => {
      window.cancelAnimationFrame(frame);
      container.removeEventListener("scroll", updateVisibility);
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
      <button
        type="button"
        aria-label="Back to top"
        title="Back to top"
        aria-hidden={!visible}
        tabIndex={visible ? 0 : -1}
        disabled={!visible}
        onClick={scrollToTop}
        className={`
          flex size-11 -translate-y-full
          items-center justify-center rounded-full
          border border-zinc-200 bg-white/95
          text-zinc-700 shadow-md backdrop-blur-sm
          transition-[opacity,background-color,border-color]
          duration-200
          hover:border-zinc-300 hover:bg-zinc-100
          focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-zinc-400
          motion-reduce:transition-none
          dark:border-zinc-700 dark:bg-zinc-800/95
          dark:text-zinc-100
          dark:hover:border-zinc-600 dark:hover:bg-zinc-700
          ${
            visible
              ? "pointer-events-auto cursor-pointer opacity-100"
              : "pointer-events-none opacity-0"
          }
        `}
      >
        <ArrowUp aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}
