"use client";

import Link from "next/link";

import { resolveLanguage } from "@/lib/data/languages";
import { MARKET_NOT_FOUND_LABELS } from "@/lib/data/translations";

import { cn } from "@/lib/utils";

interface MarketNotFoundContentProps {
  language?: string | null;
  fullHeight?: boolean;
}

const OPEN_MARKET_OVERVIEW_EVENT = "bullbearvote:open-market-overview";

export function MarketNotFoundContent({
  language,
  fullHeight = false,
}: MarketNotFoundContentProps) {
  const labels = MARKET_NOT_FOUND_LABELS[resolveLanguage(language)];

  function handleOpenMarketOverview() {
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event(OPEN_MARKET_OVERVIEW_EVENT));
    });
  }

  return (
    <div
      className={cn(
        "flex w-full items-center justify-center",
        fullHeight ? "min-h-dvh" : "min-h-[calc(100dvh-164px)]",
      )}
    >
      {" "}
      <div className="flex flex-col items-center px-6 text-center">
        <h1 className="text-xl font-medium">{labels.title}</h1>

        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {labels.description}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={handleOpenMarketOverview}
            className="rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            {labels.open_market_overview}
          </button>

          <Link
            href="/"
            className="rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            {labels.home}
          </Link>
        </div>
      </div>
    </div>
  );
}
