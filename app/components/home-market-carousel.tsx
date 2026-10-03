"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { MarketSymbolItem } from "@/lib/data/market-symbols";
import { BullBearVoteCard } from "./bull-bear-vote-card";

interface HomeMarketCarouselProps {
  markets: {
    market: MarketSymbolItem;
    initialIsWatchlist: boolean;
  }[];
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
    const element = scrollRef.current;

    if (!element) return;

    const card = element.querySelector<HTMLElement>("[data-carousel-card]");

    const row = element.firstElementChild;

    const gap = row
      ? parseFloat(window.getComputedStyle(row).columnGap) || 0
      : 0;

    const distance = card
      ? card.getBoundingClientRect().width + gap
      : element.clientWidth;

    element.scrollBy({
      left: direction * distance,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    suppressClickRef.current = false;

    if (event.pointerType !== "mouse" || event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement;

    if (target.closest("button, a, input, textarea, select, [role='button']")) {
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
    <div className="relative w-full min-w-0">
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
        <div className="flex w-max min-w-full gap-6">
          {markets.map(({ market, initialIsWatchlist }) => (
            <div
              key={market.symbol}
              data-carousel-card
              className="w-46 shrink-0"
            >
              <BullBearVoteCard
                market={market}
                initialIsWatchlist={initialIsWatchlist}
              />
            </div>
          ))}
        </div>
      </div>

      {canScrollLeft && (
        <button
          type="button"
          aria-label="Previous markets"
          onClick={() => scrollByCard(-1)}
          className="absolute left-0 top-1/2 z-20 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}

      {canScrollRight && (
        <button
          type="button"
          aria-label="Next markets"
          onClick={() => scrollByCard(1)}
          className="absolute right-0 top-1/2 z-20 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          <ChevronRight className="size-5" />
        </button>
      )}
    </div>
  );
}
