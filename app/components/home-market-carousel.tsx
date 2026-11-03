"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type PointerEvent,
  type MouseEvent,
  type KeyboardEvent,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PiPlusMinus } from "react-icons/pi";
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
import { MAX_WATCHLIST_MARKETS } from "@/lib/constants/watchlist";
import { resolveLanguage } from "@/lib/data/languages";
import { MARKET_NAME_LABELS, WATCHLIST_LABELS } from "@/lib/data/translations";
import type { HomeMarketEntry } from "@/types/home-market";

import { useCurrentUser } from "../context/user-context";
import { BullBearVoteCard } from "./bull-bear-vote-card";

const MarketPicker = dynamic(() =>
  import("./market-picker").then((module) => module.MarketPicker),
);

type Direction = -1 | 1;
type DragState = {
  pointerId: number;
  startX: number;
  startScrollLeft: number;
  active: boolean;
};

const MANAGE_CLASS =
  "outfit flex h-60 shrink-0 cursor-pointer flex-col items-center justify-center gap-2 " +
  "rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/60 text-sm text-zinc-500 " +
  "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 " +
  "dark:border-zinc-700 dark:bg-zinc-800/20 dark:text-zinc-400";

function formatLabel(
  template: string,
  values: Record<string, string | number>,
) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

function useCarouselScroll(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);
  const suppressClick = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [edges, setEdges] = useState({ left: false, right: false });

  const updateEdges = useCallback(() => {
    const el = ref.current;
    const left = !!el && el.scrollLeft > 1;
    const right = !!el && el.scrollLeft < el.scrollWidth - el.clientWidth - 1;
    setEdges((old) =>
      old.left === left && old.right === right ? old : { left, right },
    );
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    updateEdges();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updateEdges);
      observer.observe(el);
      if (el.firstElementChild) observer.observe(el.firstElementChild);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateEdges);
    return () => window.removeEventListener("resize", updateEdges);
  }, [enabled, updateEdges]);

  const scroll = useCallback((direction: Direction) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({
      left: direction * el.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, []);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    if (
      event.target instanceof Element &&
      event.target.closest("button, input, textarea, select, [role='button']")
    )
      return;

    suppressClick.current = false;
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: event.currentTarget.scrollLeft,
      active: false,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const distance = event.clientX - state.startX;

    if (!state.active) {
      if (Math.abs(distance) < 5) return;
      state.active = true;
      suppressClick.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
    }

    event.preventDefault();
    event.currentTarget.scrollLeft = state.startScrollLeft - distance;
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return {
    ref,
    edges,
    scroll,
    updateEdges,
    isDragging,
    dragHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finishDrag,
      onPointerCancel: finishDrag,
      onLostPointerCapture: () => {
        drag.current = null;
        setIsDragging(false);
      },
      onPointerLeave: () => {
        if (!drag.current?.active) drag.current = null;
      },
      onClickCapture: (event: MouseEvent<HTMLDivElement>) => {
        if (!suppressClick.current) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClick.current = false;
      },
      onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          scroll(event.key === "ArrowLeft" ? -1 : 1);
        }
      },
    },
  };
}

export function HomeMarketCarousel({
  markets,
}: {
  markets: HomeMarketEntry[];
}) {
  const router = useRouter();
  const user = useCurrentUser();
  const language = resolveLanguage(user?.language);
  const labels = WATCHLIST_LABELS[language];
  const marketNames = MARKET_NAME_LABELS[language];
  const carousel = useCarouselScroll(markets.length > 0);

  const saving = useRef(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const existing = markets.map(({ market }) => market.symbol);
  const existingSet = new Set(existing);
  const selectedSet = new Set(selected);
  const additions = selected.filter((symbol) => !existingSet.has(symbol));
  const removals = existing.filter((symbol) => !selectedSet.has(symbol));
  const hasChanges = additions.length > 0 || removals.length > 0;
  const limitLabel = formatLabel(labels.limit, { max: MAX_WATCHLIST_MARKETS });

  function openPicker() {
    if (saving.current) return;
    if (!user) return void toast.error(labels.login);
    setSelected(existing);
    setPickerOpen(true);
  }

  function changePickerOpen(open: boolean) {
    if (saving.current) return;
    setPickerOpen(open);
    if (!open) setSelected([]);
  }

  function toggleMarket(symbol: string) {
    if (saving.current) return;
    setSelected((previous) =>
      previous.includes(symbol)
        ? previous.filter((item) => item !== symbol)
        : previous.length < MAX_WATCHLIST_MARKETS
          ? [...previous, symbol]
          : previous,
    );
  }

  function saveMarkets() {
    if (saving.current || !hasChanges) return;
    if (!user) return void toast.error(labels.login);
    if (selectedSet.size > MAX_WATCHLIST_MARKETS) {
      toast.error(limitLabel);
      return;
    }

    const toAdd = [...additions];
    const toRemove = [...removals];
    saving.current = true;

    startTransition(async () => {
      let removed = false;
      try {
        // Free capacity before adding replacements at the watchlist limit.
        if (toRemove.length) {
          await removeMarketsFromWatchlist(toRemove);
          removed = true;
        }
        if (toAdd.length) await addMarketsToWatchlist(toAdd);

        setPickerOpen(false);
        setSelected([]);
        toast.success(labels.updated);
        router.refresh();
      } catch {
        if (removed) {
          setSelected((previous) =>
            previous.filter((symbol) => !toAdd.includes(symbol)),
          );
          router.refresh();
        }
        toast.error(removed ? labels.partial_failure : labels.failed);
      } finally {
        saving.current = false;
      }
    });
  }

  return (
    <>
      <div className="group/markets relative min-h-[254.5px] w-full min-w-0">
        {markets.length === 0 ? (
          <div className="h-[254.5px] w-full px-4">
            <button
              type="button"
              onClick={openPicker}
              aria-haspopup="dialog"
              className={`${MANAGE_CLASS} w-full`}
            >
              <PiPlusMinus className="size-5 shrink-0" aria-hidden="true" />
              {labels.manage}
            </button>
          </div>
        ) : (
          <>
            <div
              ref={carousel.ref}
              role="region"
              aria-label={labels.my_markets}
              tabIndex={0}
              onScroll={carousel.updateEdges}
              {...carousel.dragHandlers}
              className={`hide-scrollbar w-full overflow-x-auto overscroll-x-contain rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${carousel.isDragging ? "cursor-grabbing select-none" : "cursor-grab"}`}
            >
              <div className="flex min-h-[254.5px] w-max min-w-full items-center gap-8 px-4 py-2">
                {markets.map(
                  ({ market, initialVote, initialVoteSessionKey }) => (
                    <div
                      key={market.symbol}
                      data-carousel-card
                      className="relative isolate w-44 shrink-0"
                    >
                      <Link
                        href={`/market/${encodeURIComponent(market.symbol)}`}
                        prefetch={false}
                        aria-label={formatLabel(labels.view_market, {
                          market: marketNames[market.symbol] ?? market.name,
                        })}
                        draggable={false}
                        className="absolute inset-0 z-10 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                      />
                      <BullBearVoteCard
                        market={market}
                        initialVote={initialVote}
                        initialVoteSessionKey={initialVoteSessionKey}
                        userLanguage={language}
                      />
                    </div>
                  ),
                )}

                {user && (
                  <button
                    type="button"
                    onClick={openPicker}
                    aria-haspopup="dialog"
                    className={`${MANAGE_CLASS} w-44`}
                  >
                    <PiPlusMinus
                      className="size-5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="px-3 text-center">{labels.manage}</span>
                  </button>
                )}
              </div>
            </div>

            <ScrollButton
              direction={-1}
              label={labels.previous}
              canScroll={carousel.edges.left}
              onScroll={carousel.scroll}
            />
            <ScrollButton
              direction={1}
              label={labels.next}
              canScroll={carousel.edges.right}
              onScroll={carousel.scroll}
            />
          </>
        )}
      </div>

      <Dialog open={pickerOpen} onOpenChange={changePickerOpen}>
        <DialogContent
          overlayClassName="bg-black/30 dark:bg-black/60 backdrop-blur-none!"
          className="outfit flex h-[85dvh] max-h-170 flex-col gap-0 overflow-hidden rounded-xl p-0 text-zinc-900 dark:border dark:text-zinc-100 sm:max-w-lg"
        >
          <DialogHeader className="shrink-0 px-6 pt-7 pb-5 text-left">
            <DialogTitle className="pr-6 text-xl font-medium">
              {labels.title}
            </DialogTitle>
            <DialogDescription className="text-sm leading-6">
              {formatLabel(labels.description, { max: MAX_WATCHLIST_MARKETS })}{" "}
              <span>
                {formatLabel(labels.selected, {
                  count: selected.length,
                  max: MAX_WATCHLIST_MARKETS,
                })}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 pb-6">
            {pickerOpen && (
              <MarketPicker
                selectedSymbols={selected}
                onToggle={toggleMarket}
                existingSymbols={existing}
                disabled={isPending}
                language={language}
              />
            )}
          </div>

          <div className="shrink-0 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-3">
              <span
                className="text-sm text-zinc-500 dark:text-zinc-400"
                aria-live="polite"
              >
                {formatLabel(labels.market_count, {
                  count: selectedSet.size,
                  max: MAX_WATCHLIST_MARKETS,
                })}
              </span>
              <Button
                type="button"
                className="h-10 text-sm font-normal"
                disabled={
                  isPending ||
                  !hasChanges ||
                  selectedSet.size > MAX_WATCHLIST_MARKETS
                }
                onClick={saveMarkets}
              >
                {isPending ? labels.saving : labels.save}
              </Button>
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              {limitLabel}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ScrollButton({
  direction,
  label,
  canScroll,
  onScroll,
}: {
  direction: Direction;
  label: string;
  canScroll: boolean;
  onScroll: (direction: Direction) => void;
}) {
  const Icon =
    direction === -1
      ? canScroll
        ? ChevronLeft
        : ChevronFirst
      : canScroll
        ? ChevronRight
        : ChevronLast;

  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={!canScroll}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (canScroll) onScroll(direction);
      }}
      className={`group/scroll absolute top-1/2 z-20 flex -translate-y-1/2 items-center justify-center rounded-full p-2 opacity-0 transition-opacity duration-150 group-hover/markets:opacity-100! focus-visible:opacity-100! focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${direction === -1 ? "left-0" : "right-0"} ${canScroll ? "cursor-pointer" : "cursor-default"}`}
    >
      <span
        aria-hidden="true"
        className={`flex size-9 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm transition-colors dark:border-zinc-700 dark:bg-zinc-900 ${canScroll ? "text-black group-hover/scroll:bg-zinc-100 dark:text-white dark:group-hover/scroll:bg-zinc-800" : "text-zinc-300 dark:text-zinc-600"}`}
      >
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
    </button>
  );
}
