"use client";

import { useState } from "react";
import { Check, EllipsisVertical, LayerArrowUp, Star } from "lucide-react";
import { TbArrowBigUpLinesFilled } from "react-icons/tb";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Direction = "BULL" | "BEAR";

const MOCK_MARKET = {
  name: "S&P 500",
  symbol: "SPX",
  price: "5,842.47",
  change: "+32.18",
  changePercent: "+0.55%",
  predictions: "1,248",
};

export function BullBearVoteCard() {
  const [direction, setDirection] = useState<Direction | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const showOverlay = (isHovered || isOverlayOpen) && !isMenuOpen;

  async function handleShare() {
    const url = window.location.href;

    setShareMessage("");

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${MOCK_MARKET.name} · BullBearVote`,
          text: "Bullish or bearish on the next session?",
          url,
        });

        return;
      }

      await navigator.clipboard.writeText(url);
      setShareMessage("Link copied.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      setShareMessage("Unable to share this link.");
    }
  }

  function closeOverlay() {
    setIsHovered(false);
    setIsOverlayOpen(false);
  }

  return (
    <article
      className="relative isolate w-full max-w-64 rounded-lg text-zinc-900 dark:text-zinc-300"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") {
          setIsHovered(true);
        }
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") {
          setIsHovered(false);
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOverlayOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          closeOverlay();

          event.currentTarget
            .querySelector<HTMLButtonElement>("[data-vote-trigger]")
            ?.focus();
        }
      }}
    >
      {/* Default card content */}
      <div className="p-5">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="ibmPlexMono truncate text-lg font-medium tracking-tight text-zinc-800 dark:text-zinc-100">
              {MOCK_MARKET.name}
            </h2>

            <p className="ibmPlexMono mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              {MOCK_MARKET.symbol}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 z-20">
            <button
              type="button"
              onClick={handleShare}
              aria-label={`Share ${MOCK_MARKET.name}`}
              className="cursor-pointer text-zinc-500 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              <LayerArrowUp size={18} strokeWidth={1.75} />
            </button>

            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger>
                <button
                  type="button"
                  aria-label="Market options"
                  className="cursor-pointer text-zinc-500 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:text-zinc-400 dark:hover:text-zinc-300"
                >
                  <EllipsisVertical
                    className="-mr-1 h-4 w-5 fill-zinc-800 dark:fill-zinc-300"
                    strokeWidth={1.75}
                  />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuItem
                  onSelect={() => setIsFavorite((previous) => !previous)}
                  className="cursor-pointer gap-2"
                >
                  <Star
                    className={`size-4 ${
                      isFavorite ? "fill-current text-amber-500" : ""
                    }`}
                  />

                  {isFavorite
                    ? "Remove from my favorites"
                    : "Add to my favorites"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Tap or keyboard activation opens voting */}
        <button
          type="button"
          data-vote-trigger
          aria-label={`Show voting options for ${MOCK_MARKET.name}`}
          aria-expanded={showOverlay}
          onClick={() => setIsOverlayOpen(true)}
          className="mt-6 block min-h-40 w-full cursor-pointer rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          <span className="ibmPlexMono block text-2xl font-medium tracking-tight tabular-nums dark:text-zinc-100">
            {MOCK_MARKET.price}
          </span>

          <span className="ibmPlexMono mt-1 block text-sm font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
            {MOCK_MARKET.change} ({MOCK_MARKET.changePercent})
          </span>

          <svg
            viewBox="0 0 160 64"
            role="img"
            aria-label="Illustrative upward price trend"
            className="mt-5 h-20 w-full text-emerald-600 dark:text-emerald-400"
          >
            <path
              d="M2 52 L12 45 L22 48 L32 37 L42 42 L52 31 L62 35 L72 24 L82 29 L92 19 L102 25 L112 15 L122 20 L132 10 L142 14 L152 5 L158 8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Full-card translucent blur overlay */}
      <div
        aria-hidden={!showOverlay}
        className={`absolute inset-0 z-10 flex flex-col justify-center rounded-lg bg-white/50 p-5 backdrop-blur-sm transition-[opacity,visibility] duration-150 dark:bg-zinc-900/50 ${
          showOverlay
            ? "visible pointer-events-auto opacity-100"
            : "invisible pointer-events-none opacity-0"
        }`}
      >
        {/* Clicking the overlay background closes it on touch */}
        <button
          type="button"
          tabIndex={-1}
          aria-label="Close voting options"
          onClick={closeOverlay}
          className="absolute inset-0 rounded-lg"
        />

        <div className="pointer-events-none relative ibmPlexMono">
          <p className="text-xs text-zinc-600 dark:text-zinc-300">
            Next session prediction
          </p>

          <p className="mt-2 text-sm text-zinc-800 dark:text-zinc-200">
            Voting closes in
          </p>

          <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            02:34:18
          </p>
        </div>

        {/* Direction selection */}
        <div className="ibmPlexMono relative mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            tabIndex={showOverlay ? 0 : -1}
            aria-pressed={direction === "BULL"}
            onClick={() => setDirection("BULL")}
            className={`flex h-12 cursor-pointer items-center justify-center gap-1 rounded-sm text-sm font-semibold transition-[color,background-color,transform] duration-150 active:translate-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900 ${
              direction === null || direction === "BULL"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-800 text-zinc-300 dark:bg-emerald-900"
            }`}
          >
            <TbArrowBigUpLinesFilled className="size-4 shrink-0" />
            Bullish
          </button>

          <button
            type="button"
            tabIndex={showOverlay ? 0 : -1}
            aria-pressed={direction === "BEAR"}
            onClick={() => setDirection("BEAR")}
            className={`flex h-12 cursor-pointer items-center justify-center gap-1 rounded-sm text-sm font-semibold transition-[color,background-color,transform] duration-150 active:translate-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900 ${
              direction === null || direction === "BEAR"
                ? "bg-rose-600 text-white"
                : "bg-rose-800 text-zinc-300 dark:bg-rose-900"
            }`}
          >
            <TbArrowBigUpLinesFilled className="size-4 shrink-0 -scale-y-100" />
            Bearish
          </button>
        </div>

        <footer className="ibmPlexMono pointer-events-none relative mt-4 space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
          <p>{MOCK_MARKET.predictions} predictions</p>

          <p role="status" className="flex min-h-4 items-center gap-1">
            {direction && (
              <>
                <Check className="size-3.5" />
                {direction === "BULL" ? "Bullish" : "Bearish"} selected
              </>
            )}
          </p>
        </footer>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {shareMessage}
      </p>
    </article>
  );
}
