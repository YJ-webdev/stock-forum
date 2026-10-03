"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronRight,
  EllipsisVertical,
  Heart,
  HeartOff,
  LayerArrowUp,
  Star,
  X,
} from "lucide-react";
import { TbArrowBigUpLinesFilled } from "react-icons/tb";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useMarketQuote } from "@/app/hooks/useMarketQuote";
import type { MarketSymbolItem } from "@/lib/data/market-symbols";
import { TrendSparkline } from "./trend-sparkline";
import { Numeric } from "./numeric";
import { toast } from "sonner";
import { toggleMarketWatchlist } from "../actions/watchlist";
import { useCurrentUser } from "../context/user-context";

type Direction = "BULL" | "BEAR";

interface BullBearVoteCardProps {
  market: MarketSymbolItem;
  initialIsWatchlist: boolean;
}

interface PopupPosition {
  left: number;
  top: number;
  maxHeight: number;
}

const POPUP_WIDTH = 224;
const POPUP_GAP = 8;
const VIEWPORT_PADDING = 8;
const HOVER_CLOSE_DELAY = 150;

function supportsDesktopHover() {
  return window.matchMedia(
    "(min-width: 1024px) and (hover: hover) and (pointer: fine)",
  ).matches;
}

export function BullBearVoteCard({
  market,
  initialIsWatchlist,
}: BullBearVoteCardProps) {
  const user = useCurrentUser();
  const { data } = useMarketQuote(
    market.providerSymbol ?? market.symbol,
    market.name,
    "1D",
    market.displaySymbol,
    market.assetType,
    0,
    "5m",
  );

  const [direction, setDirection] = useState<Direction | null>(null);
  const [isWatchlist, setIsWatchlist] = useState(initialIsWatchlist);
  const [shareMessage, setShareMessage] = useState("");
  const [isVoteOpen, setIsVoteOpen] = useState(false);
  const [popupPosition, setPopupPosition] = useState<PopupPosition>({
    left: 0,
    top: 0,
    maxHeight: 0,
  });

  const popupId = useId();
  const voteTriggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const bullButtonRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusFrameRef = useRef<number | null>(null);

  const [isWatchlistPending, startWatchlistTransition] = useTransition();

  const isVotingMarket = market.assetType === "index";

  const changeColor = !data
    ? "text-zinc-400 dark:text-zinc-500"
    : data.isPositive
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-[#cf0000] dark:text-[#ff1414]";

  function cancelClose() {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function cancelFocusFrame() {
    if (focusFrameRef.current !== null) {
      cancelAnimationFrame(focusFrameRef.current);
      focusFrameRef.current = null;
    }
  }

  function openVotePopup(focusPopup = false) {
    const trigger = voteTriggerRef.current;

    if (!isVotingMarket || !trigger) return;

    cancelClose();
    cancelFocusFrame();

    const rect = trigger.getBoundingClientRect();
    const width = Math.min(
      POPUP_WIDTH,
      window.innerWidth - VIEWPORT_PADDING * 2,
    );

    const top = rect.top - POPUP_GAP;

    setPopupPosition({
      left: Math.max(
        VIEWPORT_PADDING,
        Math.min(
          rect.right - width,
          window.innerWidth - width - VIEWPORT_PADDING,
        ),
      ),
      top,
      maxHeight: Math.max(0, top - VIEWPORT_PADDING),
    });

    setIsVoteOpen(true);

    if (focusPopup) {
      focusFrameRef.current = requestAnimationFrame(() => {
        bullButtonRef.current?.focus();
        focusFrameRef.current = null;
      });
    }
  }

  function closeVotePopup(restoreFocus = false) {
    cancelClose();
    cancelFocusFrame();
    setIsVoteOpen(false);

    if (restoreFocus) {
      focusFrameRef.current = requestAnimationFrame(() => {
        voteTriggerRef.current?.focus();
        focusFrameRef.current = null;
      });
    }
  }

  function scheduleClose() {
    cancelClose();

    // Keep the popup open while crossing the small gap above the button.
    closeTimerRef.current = setTimeout(() => {
      setIsVoteOpen(false);
      closeTimerRef.current = null;
    }, HOVER_CLOSE_DELAY);
  }

  async function handleShare() {
    const url = new URL(
      `/${encodeURIComponent(market.symbol)}`,
      window.location.origin,
    ).href;

    setShareMessage("");

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${market.name} · BullBearVote`,
          text: `View ${market.name} on BullBearVote.`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setShareMessage("Link copied.");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;

      setShareMessage("Unable to share this link.");
    }
  }

  const handleToggleWatchlist = () => {
    if (!user) {
      toast.error("Log in to manage your watchlist.");
      return;
    }

    if (isWatchlistPending) return;

    const previousIsWatchlist = isWatchlist;
    const nextIsWatchlist = !previousIsWatchlist;

    setIsWatchlist(nextIsWatchlist);

    const toastId = toast.success(
      nextIsWatchlist
        ? `${market.name} added to your watchlist.`
        : `${market.name} removed from your watchlist.`,
    );

    startWatchlistTransition(async () => {
      try {
        const result = await toggleMarketWatchlist(market.symbol);

        setIsWatchlist(result.isWatchlist);
      } catch (error) {
        setIsWatchlist(previousIsWatchlist);

        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to update watchlist.",
          {
            id: toastId,
          },
        );
      }
    });
  };

  useEffect(() => {
    if (!isVoteOpen) return;

    function dismiss(restoreFocus = false) {
      if (closeTimerRef.current !== null) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }

      if (focusFrameRef.current !== null) {
        cancelAnimationFrame(focusFrameRef.current);
        focusFrameRef.current = null;
      }

      setIsVoteOpen(false);

      if (restoreFocus) {
        voteTriggerRef.current?.focus();
      }
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (
        !voteTriggerRef.current?.contains(target) &&
        !popupRef.current?.contains(target)
      ) {
        dismiss();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss(true);
      }
    }

    function handleScroll(event: Event) {
      if (
        event.target instanceof Node &&
        popupRef.current?.contains(event.target)
      ) {
        return;
      }

      dismiss(popupRef.current?.contains(document.activeElement) ?? false);
    }

    function handleResize() {
      dismiss(popupRef.current?.contains(document.activeElement) ?? false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isVoteOpen]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        clearTimeout(closeTimerRef.current);
      }

      if (focusFrameRef.current !== null) {
        cancelAnimationFrame(focusFrameRef.current);
      }
    };
  }, []);

  return (
    <article className="relative w-44 shrink-0 text-zinc-900 dark:text-zinc-300">
      <header className=" pt-3 pb-2">
        <div className="px-3 flex items-center justify-between gap-2">
          <p className="outfit tracking-wide min-w-0 truncate text-[13px] text-zinc-800 dark:text-zinc-100 dark:font-light">
            {market.displaySymbol}
          </p>

          {/* <DropdownMenu>
            <DropdownMenuTrigger>
              <ChevronRight
                className="h-5 w-5 translate-x-3 -translate-y-2 cursor-pointer text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-300"
                strokeWidth={1.75}
              />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-fit min-w-0">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  disabled={isWatchlistPending}
                  onClick={handleToggleWatchlist}
                  className="cursor-pointer whitespace-nowrap tracking-wide"
                >
                  {isWatchlist ? (
                    <HeartOff className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <Heart className="h-4 w-4" strokeWidth={1.5} />
                  )}

                  {isWatchlist
                    ? "Remove from my watchlist"
                    : "Add to my watchlist"}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu> */}

          {/* <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label={`Options for ${market.name}`}
                  className="cursor-pointer text-zinc-500 transition-colors hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:text-zinc-400 dark:hover:text-zinc-300"
                />
              }
            >
              <EllipsisVertical className="-mr-2 h-4 w-5" strokeWidth={1.75} />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-fit">
              <DropdownMenuItem
                onSelect={() => setIsWatchlist((previous) => !previous)}
                className="cursor-pointer gap-2"
              >
                <Star
                  className={`size-4 ${
                    isWatchlist ? "fill-current text-amber-500" : ""
                  }`}
                />

                {isWatchlist
                  ? "Remove from my watchlist"
                  : "Add to my watchlist"}
              </DropdownMenuItem>

              <DropdownMenuItem
                onSelect={handleShare}
                className="cursor-pointer gap-2"
              >
                <LayerArrowUp className="size-4" strokeWidth={1.75} />
                Share
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu> */}
        </div>

        <h2
          title={market.name}
          className="px-3 outfit tracking-normal mt-0.5 truncate text-2xl font-semibold text-gray-500/50 dark:text-zinc-600 "
        >
          {market.name}
        </h2>
      </header>

      <div className="min-h-41 pb-2">
        <Numeric className=" px-3 text-[18px] font-extrabold text-zinc-800 dark:text-zinc-200 tracking-tight tabular-nums">
          {data?.value ?? "—"}
        </Numeric>

        <p
          className={`jakarta min-h-5 px-3 text-sm font-medium tabular-nums ${changeColor}`}
        >
          {data ? `${data.change} (${data.percent})` : "—"}
        </p>

        <div
          role="img"
          aria-label={`${market.name} price trend`}
          className="flex h-20 items-center justify-center"
        >
          {data && data.history.length >= 2 ? (
            <TrendSparkline
              data={data.history}
              isPositive={data.isPositive}
              width={174}
              height={64}
              lunchStartMs={data.lunchStartMs}
              lunchEndMs={data.lunchEndMs}
            />
          ) : (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {data ? "Chart unavailable" : "Loading…"}
            </span>
          )}
        </div>

        <div className="flex min-h-7 justify-end">
          {isVotingMarket && (
            <button
              ref={voteTriggerRef}
              type="button"
              aria-label={`Show voting options for ${market.name}`}
              aria-haspopup="dialog"
              aria-expanded={isVoteOpen}
              aria-controls={isVoteOpen ? popupId : undefined}
              onClick={() => openVotePopup(true)}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse" && supportsDesktopHover()) {
                  openVotePopup();
                }
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === "mouse" && supportsDesktopHover()) {
                  scheduleClose();
                }
              }}
              className="outfit   inline-flex -translate-y-1 cursor-pointer items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <TbArrowBigUpLinesFilled className="size-3.5" />
              Vote
            </button>
          )}
        </div>
      </div>

      {isVoteOpen &&
        createPortal(
          <div
            ref={popupRef}
            id={popupId}
            role="dialog"
            aria-label={`Vote on ${market.name}`}
            onPointerEnter={cancelClose}
            onPointerLeave={(event) => {
              if (event.pointerType === "mouse" && supportsDesktopHover()) {
                scheduleClose();
              }
            }}
            onBlur={(event) => {
              const nextTarget = event.relatedTarget as Node | null;

              if (
                nextTarget &&
                !event.currentTarget.contains(nextTarget) &&
                !voteTriggerRef.current?.contains(nextTarget)
              ) {
                closeVotePopup();
              }
            }}
            style={{
              left: popupPosition.left,
              top: popupPosition.top,
              maxHeight: popupPosition.maxHeight,
              transform: "translateY(-100%)",
            }}
            className="outfit   fixed z-100 w-56 max-w-[calc(100vw-16px)] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-3 text-zinc-900 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-xs text-zinc-600 dark:text-zinc-300">
                {market.displaySymbol} prediction
              </p>

              <button
                type="button"
                aria-label="Close voting popup"
                onClick={() => closeVotePopup(true)}
                className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:hover:bg-zinc-800 lg:hidden"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(["BULL", "BEAR"] as const).map((option) => {
                const isBull = option === "BULL";
                const isActive = direction === null || direction === option;

                const color = isBull
                  ? isActive
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-800 text-zinc-300 dark:bg-emerald-900"
                  : isActive
                    ? "bg-rose-600 text-white"
                    : "bg-rose-800 text-zinc-300 dark:bg-rose-900";

                return (
                  <button
                    key={option}
                    ref={isBull ? bullButtonRef : undefined}
                    type="button"
                    aria-pressed={direction === option}
                    onClick={() => setDirection(option)}
                    className={`flex h-10 cursor-pointer items-center justify-center gap-1 rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${color}`}
                  >
                    <TbArrowBigUpLinesFilled
                      className={`size-4 ${isBull ? "" : "-scale-y-100"}`}
                    />
                    {isBull ? "Bull" : "Bear"}
                  </button>
                );
              })}
            </div>

            {direction && (
              <p
                role="status"
                className="mt-3 flex items-center justify-end gap-1 text-xs text-zinc-600 dark:text-zinc-300"
              >
                <Check className="size-3.5" />
                {direction === "BULL" ? "Bullish" : "Bearish"} selected
              </p>
            )}
          </div>,
          document.body,
        )}

      <p role="status" aria-live="polite" className="sr-only">
        {shareMessage}
      </p>
    </article>
  );
}
