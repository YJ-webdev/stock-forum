// app/components/home-market-carousel.tsx

"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

import { BullBearVoteCard } from "./bull-bear-vote-card";
import { HomeMarketEntry } from "@/types/home-market";

interface HomeMarketCarouselProps {
  markets: HomeMarketEntry[];
}

interface DragState {
  pointerId: number;
  startX: number;
  startScrollLeft: number;
  active: boolean;
}

export function HomeMarketCarousel({ markets }: HomeMarketCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);

  const [isDragging, setIsDragging] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const element = scrollRef.current;

    if (!element) return;

    const maxScroll = element.scrollWidth - element.clientWidth;

    setCanScrollLeft(element.scrollLeft > 1);
    setCanScrollRight(element.scrollLeft < maxScroll - 1);
  }, []);

  useEffect(() => {
    const element = scrollRef.current;

    if (!element) return;

    updateScrollButtons();

    const observer = new ResizeObserver(updateScrollButtons);

    observer.observe(element);

    if (element.firstElementChild) {
      observer.observe(element.firstElementChild);
    }

    return () => observer.disconnect();
  }, [markets, updateScrollButtons]);

  function scrollByCard(direction: -1 | 1) {
    const container = scrollRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    container.scrollBy({
      left: direction * container.clientWidth,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    suppressClickRef.current = false;

    if (event.pointerType !== "mouse" || event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement;

    if (target.closest("button, input, textarea, select, [role='button']")) {
      return;
    }

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: event.currentTarget.scrollLeft,
      active: false,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) return;

    const distance = event.clientX - drag.startX;

    if (!drag.active) {
      if (Math.abs(distance) < 5) return;

      drag.active = true;
      suppressClickRef.current = true;

      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
    }

    event.preventDefault();

    event.currentTarget.scrollLeft = drag.startScrollLeft - distance;
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) return;

    dragRef.current = null;
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div className="group/markets relative w-full min-w-0">
      <div
        ref={scrollRef}
        role="region"
        aria-label="My markets"
        tabIndex={0}
        onScroll={updateScrollButtons}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onLostPointerCapture={() => {
          dragRef.current = null;
          setIsDragging(false);
        }}
        onPointerLeave={() => {
          if (!dragRef.current?.active) {
            dragRef.current = null;
          }
        }}
        onClickCapture={(event) => {
          if (suppressClickRef.current) {
            event.preventDefault();
            event.stopPropagation();
            suppressClickRef.current = false;
          }
        }}
        onKeyDown={(event) => {
          // Preserve keyboard behavior inside each card.
          if (event.target !== event.currentTarget) return;

          if (event.key === "ArrowLeft") {
            event.preventDefault();
            scrollByCard(-1);
          }

          if (event.key === "ArrowRight") {
            event.preventDefault();
            scrollByCard(1);
          }
        }}
        className={`hide-scrollbar w-full overflow-x-auto overscroll-x-contain rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
          isDragging ? "cursor-grabbing select-none" : "cursor-grab"
        }`}
      >
        <div className="flex w-max min-w-full gap-8 px-4">
          {markets.map(({ market, initialIsWatchlist }) => (
            <div
              key={market.symbol}
              data-carousel-card
              className="relative isolate w-44 shrink-0"
            >
              <Link
                href={`/market/${encodeURIComponent(market.symbol)}`}
                aria-label={`View ${market.name}`}
                draggable={false}
                className="absolute inset-0 z-10 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              />

              <BullBearVoteCard
                market={market}
                initialIsWatchlist={initialIsWatchlist}
              />
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        aria-label="Previous markets"
        aria-disabled={!canScrollLeft}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();

          if (canScrollLeft) {
            scrollByCard(-1);
          }
        }}
        className={`absolute left-2 top-1/2 z-30 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm opacity-0 transition-opacity duration-150 group-hover/markets:opacity-100! focus-visible:opacity-100! focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 ${
          canScrollLeft
            ? "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
            : "cursor-default text-zinc-300 dark:text-zinc-600"
        }`}
      >
        {canScrollLeft ? (
          <ChevronLeft
            className="size-5 text-zinc-800 dark:text-zinc-300"
            strokeWidth={1.75}
          />
        ) : (
          <ChevronFirst className="size-5" strokeWidth={1.75} />
        )}
      </button>

      <button
        type="button"
        aria-label="Next markets"
        aria-disabled={!canScrollRight}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();

          if (canScrollRight) {
            scrollByCard(1);
          }
        }}
        className={`absolute right-2 top-1/2 z-30 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm opacity-0 transition-opacity duration-150 group-hover/markets:opacity-100! focus-visible:opacity-100! focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 ${
          canScrollRight
            ? "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
            : "cursor-default text-zinc-300 dark:text-zinc-600"
        }`}
      >
        {canScrollRight ? (
          <ChevronRight
            className="size-5 text-zinc-800 dark:text-zinc-300"
            strokeWidth={1.75}
          />
        ) : (
          <ChevronLast className="size-5" strokeWidth={1.75} />
        )}
      </button>
    </div>
  );
}
