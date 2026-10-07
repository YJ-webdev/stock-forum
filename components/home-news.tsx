"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, Newspaper } from "lucide-react";

import type { HomeMarketHeadline } from "@/app/actions/news";

interface HomeNewsProps {
  briefs: HomeMarketHeadline[];
}

function getNewsLogo(url: string): string | null {
  try {
    const domain = new URL(url).hostname;

    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
      domain,
    )}&sz=64`;
  } catch {
    return null;
  }
}

function NewsLogo({ url, source }: { url: string; source: string }) {
  const logo = getNewsLogo(url);
  const [failed, setFailed] = useState(false);

  return (
    <span className="flex size-5 shrink-0 items-center justify-center">
      {logo && !failed ? (
        <img
          src={logo}
          alt={source}
          width={20}
          height={20}
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-6 object-contain"
        />
      ) : (
        <Newspaper
          aria-label={source}
          className="size-5 text-zinc-400"
          strokeWidth={1.5}
        />
      )}
    </span>
  );
}

export const HomeNews = ({ briefs }: HomeNewsProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hoveredRef = useRef(false);
  const focusedRef = useRef(false);
  const pointerDownRef = useRef(false);
  const resumeAtRef = useRef(0);

  const moveRef = useRef<((direction: number) => void) | null>(null);

  const headlines = briefs.slice(0, 3);
  const count = headlines.length;
  const infinite = count > 1;

  // Last clone → original articles → first clone.
  const slides = infinite
    ? [headlines[count - 1], ...headlines, headlines[0]]
    : headlines;

  const contentKey = JSON.stringify(headlines.map((headline) => headline.id));

  const delayAutoScroll = () => {
    resumeAtRef.current = Date.now() + 8_000;
  };

  useEffect(() => {
    const container = scrollRef.current;

    if (!container || count === 0) {
      return;
    }

    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    let animationFrame = 0;
    let jumping = false;
    let moving = false;
    let previousWidth = container.clientWidth;
    let lastLogicalIndex = 0;

    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const getPhysicalIndex = () => {
      const width = container.clientWidth;

      return width ? Math.round(container.scrollLeft / width) : 0;
    };

    const getLogicalIndex = (physicalIndex: number) =>
      infinite ? (((physicalIndex - 1 + count) % count) + count) % count : 0;

    const jumpTo = (physicalIndex: number) => {
      jumping = true;
      container.style.scrollSnapType = "none";

      container.scrollTo({
        left: physicalIndex * container.clientWidth,
        behavior: "instant",
      });

      cancelAnimationFrame(animationFrame);

      animationFrame = requestAnimationFrame(() => {
        container.style.scrollSnapType = "";
        jumping = false;
      });
    };

    const settle = () => {
      if (jumping || pointerDownRef.current) {
        return;
      }

      const width = container.clientWidth;
      const physicalIndex = getPhysicalIndex();

      if (
        !width ||
        Math.abs(container.scrollLeft - physicalIndex * width) > 2
      ) {
        return;
      }

      moving = false;
      lastLogicalIndex = getLogicalIndex(physicalIndex);

      if (!infinite) {
        return;
      }

      let targetIndex: number | null = null;

      if (physicalIndex === 0) {
        targetIndex = count;
      } else if (physicalIndex === count + 1) {
        targetIndex = 1;
      }

      if (targetIndex === null) {
        return;
      }

      const articles =
        container.querySelectorAll<HTMLElement>("[data-news-item]");

      const activeElement = document.activeElement;

      const restoreLinkFocus =
        activeElement instanceof HTMLElement &&
        Boolean(articles[physicalIndex]?.contains(activeElement));

      jumpTo(targetIndex);

      if (restoreLinkFocus) {
        articles[targetIndex]
          ?.querySelector<HTMLAnchorElement>("a")
          ?.focus({ preventScroll: true });
      }
    };

    const scheduleSettle = () => {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settle, 180);
    };

    const move = (direction: number) => {
      if (!infinite || jumping || moving || pointerDownRef.current) {
        return;
      }

      const width = container.clientWidth;
      const physicalIndex = getPhysicalIndex();

      if (
        !width ||
        Math.abs(container.scrollLeft - physicalIndex * width) > 2
      ) {
        return;
      }

      // Normalize a clone before starting another movement.
      if (physicalIndex === 0 || physicalIndex === count + 1) {
        settle();
        return;
      }

      moving = true;

      container.scrollTo({
        left: (physicalIndex + direction) * width,
        behavior: motionPreference.matches ? "instant" : "smooth",
      });

      scheduleSettle();
    };

    moveRef.current = move;

    const onScroll = () => {
      if (!jumping) {
        moving = true;
        scheduleSettle();
      }
    };

    const onPointerDown = () => {
      pointerDownRef.current = true;
      delayAutoScroll();
    };

    const onPointerUp = () => {
      pointerDownRef.current = false;
      delayAutoScroll();
      scheduleSettle();
    };

    jumpTo(infinite ? 1 : 0);

    container.addEventListener("scroll", onScroll, { passive: true });
    container.addEventListener("scrollend", settle);
    container.addEventListener("pointerdown", onPointerDown);

    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    const resizeObserver = new ResizeObserver(() => {
      const width = container.clientWidth;

      if (!width || width === previousWidth) {
        return;
      }

      previousWidth = width;
      moving = false;

      jumpTo(infinite ? lastLogicalIndex + 1 : 0);
    });

    resizeObserver.observe(container);

    const interval = window.setInterval(() => {
      if (
        motionPreference.matches ||
        hoveredRef.current ||
        focusedRef.current ||
        pointerDownRef.current ||
        Date.now() < resumeAtRef.current ||
        document.hidden
      ) {
        return;
      }

      move(1);
    }, 6_000);

    return () => {
      clearTimeout(settleTimer);
      window.clearInterval(interval);
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();

      container.removeEventListener("scroll", onScroll);
      container.removeEventListener("scrollend", settle);
      container.removeEventListener("pointerdown", onPointerDown);

      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);

      container.style.scrollSnapType = "";
      moveRef.current = null;
      pointerDownRef.current = false;
    };
  }, [contentKey, count, infinite]);

  if (count === 0) {
    return null;
  }

  return (
    <section
      aria-label="Market headlines"
      onMouseEnter={() => {
        hoveredRef.current = true;
      }}
      onMouseLeave={() => {
        hoveredRef.current = false;
        delayAutoScroll();
      }}
      onFocusCapture={() => {
        focusedRef.current = true;
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          focusedRef.current = false;
          delayAutoScroll();
        }
      }}
      className="
        outfit flex min-w-0 w-full items-center
        bg-zinc-100/50 text-[14px] font-[350]
        dark:bg-zinc-800/50
      "
    >
      <div
        ref={scrollRef}
        tabIndex={0}
        aria-label="Market headlines. Use left and right arrows to navigate."
        onTouchStart={delayAutoScroll}
        onTouchMove={delayAutoScroll}
        onTouchEnd={delayAutoScroll}
        onWheel={delayAutoScroll}
        onKeyDown={(event) => {
          delayAutoScroll();

          if (event.target !== event.currentTarget) {
            return;
          }

          if (event.key === "ArrowRight") {
            event.preventDefault();
            moveRef.current?.(1);
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            moveRef.current?.(-1);
          }
        }}
        className="
          flex min-w-0 flex-1 snap-x snap-mandatory
          overflow-x-auto overscroll-x-contain
          scrollbar-none [&::-webkit-scrollbar]:hidden
          focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-inset focus-visible:ring-zinc-400
        "
      >
        {slides.map((brief, index) => {
          const isClone = infinite && (index === 0 || index === count + 1);

          return (
            <article
              key={`${brief.id}-${index}`}
              data-news-item
              aria-hidden={isClone ? true : undefined}
              className="
                flex w-full shrink-0 snap-start items-center
                gap-3 px-3 py-3
              "
            >
              <NewsLogo url={brief.url} source={brief.source} />

              <div className="flex min-w-0 flex-1 items-center gap-1">
                <a
                  href={brief.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  tabIndex={isClone ? -1 : undefined}
                  aria-label={`${brief.title} (opens in a new tab)`}
                  title={brief.summary}
                  className="
    min-w-0 flex-1 truncate
    text-zinc-800 transition-colors
    hover:text-zinc-600
    focus-visible:outline-none focus-visible:ring-2
    focus-visible:ring-zinc-400
    dark:text-zinc-200 dark:hover:text-zinc-400
  "
                >
                  {brief.summary}
                </a>
              </div>
            </article>
          );
        })}
      </div>

      {infinite && (
        <button
          type="button"
          aria-label="Next headline"
          title="Next headline"
          onClick={() => {
            delayAutoScroll();
            moveRef.current?.(1);
          }}
          className="
            mr-2 hidden size-8 shrink-0 cursor-pointer
            items-center justify-center rounded-sm
            text-zinc-800 transition-colors
            hover:bg-zinc-200/70
            focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-zinc-400
            md:inline-flex
            dark:text-zinc-300 dark:hover:bg-zinc-800
          "
        >
          <ChevronRight
            aria-hidden="true"
            className="size-4"
            strokeWidth={1.5}
          />
        </button>
      )}
    </section>
  );
};
