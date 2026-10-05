"use client";

import { useEffect, useRef, useState } from "react";

import { useMarketQuote } from "@/app/hooks/useMarketQuote";
import type { MarketSymbolItem } from "@/lib/data/market-symbols";

import { Numeric } from "./numeric";
import { TrendSparkline } from "./trend-sparkline";
import { MarketVoteButton } from "./market-vote-button";
import { MarketSentiment } from "./market-sentiment";
import { HomeMarketItem } from "@/types/home-market";

type Direction = "BULL" | "BEAR";

interface BullBearVoteCardProps {
  market: HomeMarketItem;
  initialIsWatchlist: boolean;
}

function supportsDesktopHover() {
  return window.matchMedia(
    "(min-width: 1024px) and (hover: hover) and (pointer: fine)",
  ).matches;
}

export function BullBearVoteCard({ market }: BullBearVoteCardProps) {
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
  const [isVoteOpen, setIsVoteOpen] = useState(false);

  const voteRowRef = useRef<HTMLDivElement>(null);
  const voteTriggerRef = useRef<HTMLButtonElement>(null);
  const bullButtonRef = useRef<HTMLButtonElement>(null);

  const changeColor = !data
    ? "text-zinc-400 dark:text-zinc-500"
    : data.isPositive
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-[#cf0000] dark:text-[#ff1414]";

  function closeVoteOptions() {
    setIsVoteOpen(false);
  }

  // Move keyboard focus into the options when the trigger was focused.
  useEffect(() => {
    if (isVoteOpen && document.activeElement === voteTriggerRef.current) {
      bullButtonRef.current?.focus();
    }
  }, [isVoteOpen]);

  // Touch users can dismiss by tapping outside the row.
  useEffect(() => {
    if (!isVoteOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !voteRowRef.current?.contains(event.target)
      ) {
        setIsVoteOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isVoteOpen]);

  return (
    <article className="relative w-44  shrink-0 text-zinc-900 dark:text-zinc-300">
      <header className=" pb-3">
        <p className="outfit min-w-0 truncate pl-3 text-[13px] tracking-wide text-zinc-800 dark:font-light dark:text-zinc-100">
          {market.displaySymbol}
        </p>

        <h3
          title={market.name}
          className="outfit truncate pl-3 text-2xl font-semibold tracking-normal text-gray-500/50 dark:text-zinc-600"
        >
          {market.name}
        </h3>
      </header>

      <div className=" pb-2 ">
        <Numeric className="pl-3 text-[18px] font-extrabold tracking-tight tabular-nums text-zinc-800 dark:text-zinc-200">
          {data?.value ?? "—"}
        </Numeric>

        <p
          className={`jakarta min-h-5 pl-3 text-sm font-medium tabular-nums ${changeColor}`}
        >
          {data ? `${data.change} (${data.percent})` : "—"}
        </p>

        <div
          role="img"
          aria-label={`${market.name} price trend`}
          className="flex h-18 mt-4 items-center justify-center"
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

        <div
          ref={voteRowRef}
          className="outfit relative h-17"
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse" && supportsDesktopHover()) {
              const activeElement = document.activeElement;

              if (
                activeElement instanceof HTMLElement &&
                activeElement.matches(":focus-visible") &&
                event.currentTarget.contains(activeElement)
              ) {
                return;
              }

              closeVoteOptions();
            }
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              closeVoteOptions();
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && isVoteOpen) {
              event.preventDefault();
              closeVoteOptions();

              // The trigger remains mounted; focus after it becomes visible.
              requestAnimationFrame(() => {
                voteTriggerRef.current?.focus();
              });
            }
          }}
        >
          {market.assetType === "index" && (
            <div className="relative flex flex-col gap-2  z-20">
              <MarketSentiment symbol={market.symbol} />
              <MarketVoteButton
                marketName={market.name}
                symbol={market.symbol}
              />
            </div>
          )}
          <p aria-live="polite" className="sr-only">
            {direction
              ? `${direction === "BULL" ? "Bullish" : "Bearish"} selected`
              : ""}
          </p>
        </div>
      </div>
    </article>
  );
}
