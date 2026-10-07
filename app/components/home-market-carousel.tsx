// app/components/home-market-carousel.tsx
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type PointerEvent,
} from "react";

import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pin,
} from "lucide-react";
import { PiPlusMinus } from "react-icons/pi";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  addMarketsToWatchlist,
  removeMarketsFromWatchlist,
} from "@/app/actions/watchlist";
import type { HomeMarketEntry } from "@/types/home-market";
import { MAX_WATCHLIST_MARKETS } from "@/lib/constants/watchlist";

import { BullBearVoteCard } from "./bull-bear-vote-card";
import { MarketPicker } from "./market-picker";
import { useCurrentUser } from "../context/user-context";

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
  const router = useRouter();
  const user = useCurrentUser();

  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const savingRef = useRef(false);

  const [isDragging, setIsDragging] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const isEmpty = markets.length === 0;
  const existingSymbols = markets.map(({ market }) => market.symbol);

  const symbolsToAdd = selectedSymbols.filter(
    (symbol) => !existingSymbols.includes(symbol),
  );

  const symbolsToRemove = existingSymbols.filter(
    (symbol) => !selectedSymbols.includes(symbol),
  );

  const totalWatchlistCount = new Set(selectedSymbols).size;

  const hasChanges = symbolsToAdd.length > 0 || symbolsToRemove.length > 0;

  const updateScrollButtons = useCallback(() => {
    const element = scrollRef.current;

    if (!element) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const maxScroll = element.scrollWidth - element.clientWidth;

    setCanScrollLeft(element.scrollLeft > 1);
    setCanScrollRight(element.scrollLeft < maxScroll - 1);
  }, []);

  useEffect(() => {
    const element = scrollRef.current;

    updateScrollButtons();

    if (!element) return;

    const observer = new ResizeObserver(updateScrollButtons);

    observer.observe(element);

    if (element.firstElementChild) {
      observer.observe(element.firstElementChild);
    }

    return () => observer.disconnect();
  }, [markets, updateScrollButtons]);

  function openPicker() {
    if (!user) {
      toast.error("Log in to manage your watchlist.");
      return;
    }

    setSelectedSymbols([...existingSymbols]);
    setIsPickerOpen(true);
  }

  function handlePickerOpenChange(open: boolean) {
    if (savingRef.current) return;

    setIsPickerOpen(open);

    if (!open) {
      setSelectedSymbols([]);
    }
  }

  function toggleMarket(symbol: string) {
    if (savingRef.current) return;

    setSelectedSymbols((previous) => {
      if (previous.includes(symbol)) {
        return previous.filter((item) => item !== symbol);
      }

      if (previous.length >= MAX_WATCHLIST_MARKETS) {
        return previous;
      }

      return [...previous, symbol];
    });
  }

  function handleSaveMarkets() {
    if (savingRef.current || !hasChanges) return;

    if (!user) {
      toast.error("Log in to manage your watchlist.");
      return;
    }

    if (totalWatchlistCount > MAX_WATCHLIST_MARKETS) {
      toast.error(`You can follow up to ${MAX_WATCHLIST_MARKETS} markets.`);
      return;
    }

    const additions = [...symbolsToAdd];
    const removals = [...symbolsToRemove];

    savingRef.current = true;

    startTransition(async () => {
      let removed = false;

      try {
        // Remove first so replacements work at the watchlist limit.
        if (removals.length > 0) {
          await removeMarketsFromWatchlist(removals);
          removed = true;
        }

        if (additions.length > 0) {
          await addMarketsToWatchlist(additions);
        }

        setIsPickerOpen(false);
        setSelectedSymbols([]);

        toast.success("Watchlist updated.");
        router.refresh();
      } catch (error) {
        if (removed) {
          router.refresh();
        }

        toast.error(
          removed
            ? "Markets were removed, but new markets could not be added. Please try again."
            : error instanceof Error
              ? error.message
              : "Failed to update your watchlist.",
        );
      } finally {
        savingRef.current = false;
      }
    });
  }

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

    if (event.pointerType !== "mouse" || event.button !== 0) return;

    const target = event.target;

    if (
      target instanceof Element &&
      target.closest("button, input, textarea, select, [role='button']")
    ) {
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
    <>
      <div className="group/markets relative mt-4 min-h-[254.5px] w-full min-w-0">
        {isEmpty ? (
          <div className="h-[254.5px] w-full px-4">
            <div className="outfit flex h-full w-full items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/60 dark:border-zinc-700 dark:bg-zinc-800/20">
              <div className="flex flex-col items-center text-center">
                <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <Pin
                    className="size-5 text-zinc-500 dark:text-zinc-400"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </div>

                <p className="text-[18px] font-normal text-zinc-900 dark:text-zinc-300">
                  Your markets, all in one place
                </p>

                <p className="mt-1 text-xs font-light text-zinc-500 dark:text-zinc-400">
                  Add markets to follow prices and community sentiment.
                </p>

                <button
                  type="button"
                  onClick={openPicker}
                  aria-haspopup="dialog"
                  className="
                    mt-4 inline-flex h-9 cursor-pointer
                    items-center justify-center gap-1.5
                    rounded-md border border-zinc-200 bg-white px-3
                    text-sm font-normal text-zinc-900 transition-colors
                    hover:bg-zinc-100
                    focus-visible:outline-none focus-visible:ring-2
                    focus-visible:ring-zinc-400
                    dark:border-zinc-700 dark:bg-zinc-900
                    dark:text-zinc-300 dark:hover:bg-zinc-800
                  "
                >
                  <Plus
                    className="size-4"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  Add markets
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
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
              className={`
                hide-scrollbar w-full overflow-x-auto
                overscroll-x-contain rounded-sm
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-zinc-400
                ${isDragging ? "cursor-grabbing select-none" : "cursor-grab"}
              `}
            >
              <div className="flex min-h-[254.5px] w-max min-w-full items-center gap-8 px-4 py-2">
                {markets.map(
                  ({
                    market,
                    initialIsWatchlist,
                    initialVote,
                    initialVoteSessionKey,
                  }) => (
                    <div
                      key={market.symbol}
                      data-carousel-card
                      className="relative isolate w-44 shrink-0"
                    >
                      <Link
                        href={`/market/${encodeURIComponent(market.symbol)}`}
                        aria-label={`View ${market.name}`}
                        draggable={false}
                        className="
                          absolute inset-0 z-10 cursor-pointer rounded-lg
                          focus-visible:outline-none focus-visible:ring-2
                          focus-visible:ring-zinc-400
                        "
                      />

                      <BullBearVoteCard
                        market={market}
                        initialIsWatchlist={initialIsWatchlist}
                        initialVote={initialVote}
                        initialVoteSessionKey={initialVoteSessionKey}
                      />
                    </div>
                  ),
                )}

                {user && (
                  <button
                    type="button"
                    onClick={openPicker}
                    aria-haspopup="dialog"
                    className="
                      outfit flex h-60 w-44 shrink-0 cursor-pointer
                      flex-col items-center justify-center gap-2
                      rounded-xl border-2 border-dashed border-zinc-200
                      bg-zinc-50/60 text-sm text-zinc-500 transition-colors
                      hover:border-zinc-400 hover:bg-zinc-100
                      focus-visible:outline-none focus-visible:ring-2
                      focus-visible:ring-zinc-400
                      dark:border-zinc-700 dark:bg-zinc-800/20
                      dark:text-zinc-400 dark:hover:border-zinc-500
                      dark:hover:bg-zinc-800/50
                    "
                  >
                    <PiPlusMinus
                      className="size-5 shrink-0"
                      aria-hidden="true"
                    />
                    Manage watchlist
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              aria-label="Previous markets"
              aria-disabled={!canScrollLeft}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();

                if (canScrollLeft) scrollByCard(-1);
              }}
              className={`
                absolute left-2 top-1/2 z-30 flex size-9
                -translate-y-1/2 items-center justify-center
                rounded-full border border-zinc-200 bg-white shadow-sm
                opacity-0 transition-opacity duration-150
                group-hover/markets:opacity-100!
                focus-visible:opacity-100!
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-zinc-400
                dark:border-zinc-700 dark:bg-zinc-900
                ${
                  canScrollLeft
                    ? "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    : "cursor-default text-zinc-300 dark:text-zinc-600"
                }
              `}
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

                if (canScrollRight) scrollByCard(1);
              }}
              className={`
                absolute right-2 top-1/2 z-30 flex size-9
                -translate-y-1/2 items-center justify-center
                rounded-full border border-zinc-200 bg-white shadow-sm
                opacity-0 transition-opacity duration-150
                group-hover/markets:opacity-100!
                focus-visible:opacity-100!
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-zinc-400
                dark:border-zinc-700 dark:bg-zinc-900
                ${
                  canScrollRight
                    ? "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    : "cursor-default text-zinc-300 dark:text-zinc-600"
                }
              `}
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
          </>
        )}
      </div>

      <Dialog open={isPickerOpen} onOpenChange={handlePickerOpenChange}>
        <DialogContent className="outfit flex h-[85dvh] max-h-170 flex-col gap-0 overflow-hidden rounded-xl p-0 text-zinc-900 dark:text-zinc-300 sm:max-w-lg">
          <DialogHeader className="shrink-0 px-6 pb-5 pt-7 text-left">
            <DialogTitle className="pr-6 text-xl font-medium">
              Manage your watchlist
            </DialogTitle>

            <DialogDescription className="text-sm leading-6">
              Select up to {MAX_WATCHLIST_MARKETS} markets you'd like to follow.
              <span className="ml-1">
                {selectedSymbols.length} / {MAX_WATCHLIST_MARKETS} selected.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 pb-6">
            <MarketPicker
              selectedSymbols={selectedSymbols}
              onToggle={toggleMarket}
              existingSymbols={existingSymbols}
              disabled={isPending}
            />
          </div>

          <div className="shrink-0 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-3">
              <span
                className="text-sm text-zinc-500 dark:text-zinc-400"
                aria-live="polite"
              >
                {totalWatchlistCount} / {MAX_WATCHLIST_MARKETS} markets
              </span>

              <Button
                type="button"
                className="h-10 text-sm font-normal"
                disabled={
                  isPending ||
                  !hasChanges ||
                  totalWatchlistCount > MAX_WATCHLIST_MARKETS
                }
                onClick={handleSaveMarkets}
              >
                {isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>

            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              You can follow up to {MAX_WATCHLIST_MARKETS} markets.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
