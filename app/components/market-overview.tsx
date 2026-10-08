"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import type { SelectedRange } from "../hooks/useMarketQuote";

import {
  MARKET_SYMBOLS,
  CRYPTO_SYMBOLS,
  CURRENCY_SYMBOLS,
  COMMODITY_SYMBOLS,
  type MarketSymbolItem,
} from "@/lib/data/market-symbols";

import { RelativeStocks } from "./relative-stocks";

interface MarketOverviewProps {
  query?: string;
  selectedIndex?: number;
  onSearchResultsChange?: (symbols: string[]) => void;
  onNavigate?: () => void;
}

export default function MarketOverview({
  query = "",
  selectedIndex = -1,
  onSearchResultsChange,
  onNavigate,
}: MarketOverviewProps) {
  const marketCategories: Record<string, MarketSymbolItem[]> = useMemo(
    () => ({
      ...MARKET_SYMBOLS,
      Crypto: CRYPTO_SYMBOLS,
      Currency: CURRENCY_SYMBOLS,
      Commodity: COMMODITY_SYMBOLS,
    }),
    [],
  );

  const categories = Object.keys(marketCategories);

  const [activeTab, setActiveTab] = useState("America");
  const [isBrowsingCategory, setIsBrowsingCategory] = useState(false);
  const [, setActiveRange] = useState<SelectedRange>("1D");

  const overviewRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);

  const categoryHoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const normalizedQuery = query.trim().toLowerCase();
  const hasQuery = normalizedQuery.length > 0;

  const searchResults = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    const results: {
      item: MarketSymbolItem;
      category: string;
    }[] = [];

    const seen = new Set<string>();

    for (const [category, items] of Object.entries(marketCategories)) {
      for (const item of items) {
        if (seen.has(item.symbol)) {
          continue;
        }

        const matches = [item.symbol, item.displaySymbol ?? "", item.name].some(
          (value) => value.toLowerCase().includes(normalizedQuery),
        );

        if (!matches) {
          continue;
        }

        seen.add(item.symbol);
        results.push({ item, category });
      }
    }

    return results;
  }, [marketCategories, normalizedQuery]);

  const matchedCategory = searchResults[0]?.category ?? null;
  const isSearching = hasQuery && !isBrowsingCategory;

  useEffect(() => {
    setIsBrowsingCategory(false);
  }, [normalizedQuery]);

  useEffect(() => {
    if (isSearching && matchedCategory) {
      setActiveTab(matchedCategory);
    }
  }, [isSearching, matchedCategory]);

  useEffect(() => {
    onSearchResultsChange?.(
      isSearching ? searchResults.map((result) => result.item.symbol) : [],
    );
  }, [isSearching, searchResults, onSearchResultsChange]);

  // Reveal the active category without moving the page vertically.
  useEffect(() => {
    const container = categoriesRef.current;
    const activeButton = container?.querySelector<HTMLButtonElement>(
      '[data-active-category="true"]',
    );

    if (!container || !activeButton) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();
    const padding = 12;

    if (buttonRect.left < containerRect.left + padding) {
      container.scrollLeft -= containerRect.left + padding - buttonRect.left;
    } else if (buttonRect.right > containerRect.right - padding) {
      container.scrollLeft += buttonRect.right - containerRect.right + padding;
    }
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (categoryHoverTimerRef.current !== null) {
        clearTimeout(categoryHoverTimerRef.current);
      }
    };
  }, []);

  function clearCategoryHoverTimer() {
    if (categoryHoverTimerRef.current !== null) {
      clearTimeout(categoryHoverTimerRef.current);
      categoryHoverTimerRef.current = null;
    }
  }

  function handleCategorySelect(category: string) {
    clearCategoryHoverTimer();
    setActiveTab(category);
    setIsBrowsingCategory(true);
  }

  function handleCategoryMouseEnter(category: string) {
    // Touch devices select categories by tapping.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return;
    }

    clearCategoryHoverTimer();

    if (!hasQuery) {
      setActiveTab(category);
      return;
    }

    categoryHoverTimerRef.current = setTimeout(() => {
      setActiveTab(category);
      setIsBrowsingCategory(true);
      categoryHoverTimerRef.current = null;
    }, 1000);
  }

  function handleCategoryKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowUp") {
      event.preventDefault();

      document
        .querySelector<HTMLInputElement>("#market-search-input")
        ?.focus({ preventScroll: true });

      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      overviewRef.current
        ?.querySelector<HTMLTableRowElement>('[data-market-row="true"]')
        ?.focus({ preventScroll: true });

      return;
    }

    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();

    const buttons = Array.from(
      categoriesRef.current?.querySelectorAll<HTMLButtonElement>(
        '[data-market-category="true"]',
      ) ?? [],
    );

    const currentIndex = buttons.indexOf(event.currentTarget);

    if (currentIndex === -1 || buttons.length === 0) {
      return;
    }

    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex =
      (currentIndex + direction + buttons.length) % buttons.length;

    const nextButton = buttons[nextIndex];

    nextButton?.focus({ preventScroll: true });

    const container = categoriesRef.current;

    if (container && nextButton) {
      const containerRect = container.getBoundingClientRect();
      const buttonRect = nextButton.getBoundingClientRect();

      if (buttonRect.left < containerRect.left) {
        container.scrollLeft -= containerRect.left - buttonRect.left + 12;
      } else if (buttonRect.right > containerRect.right) {
        container.scrollLeft += buttonRect.right - containerRect.right + 12;
      }
    }
  }

  const displayedItems = isSearching
    ? searchResults.map((result) => result.item)
    : (marketCategories[activeTab] ?? []);

  return (
    <div
      ref={overviewRef}
      className="
        mx-auto w-full min-w-0 max-w-6xl z-40
        bg-zinc-100 md:bg-white dark:bg-zinc-800
      "
    >
      <div className="flex min-w-0 flex-col gap-3 md:mx-4">
        <div
          className="
            sticky top-0
            bg-zinc-100
            md:static md:bg-white
            dark:bg-zinc-800
          "
        >
          <div
            ref={categoriesRef}
            role="group"
            aria-label="Market categories"
            className="
              flex min-w-0 flex-nowrap items-center gap-1
              overflow-x-auto overscroll-x-contain
              px-3
              scrollbar-none
              [&::-webkit-scrollbar]:hidden
              md:flex-wrap md:gap-2 md:overflow-visible md:px-0
            "
          >
            {categories.map((category) => {
              const isActive = activeTab === category;

              return (
                <button
                  key={category}
                  type="button"
                  data-market-category="true"
                  data-active-category={isActive ? "true" : "false"}
                  aria-pressed={isActive}
                  onMouseEnter={() => handleCategoryMouseEnter(category)}
                  onMouseLeave={clearCategoryHoverTimer}
                  onClick={() => handleCategorySelect(category)}
                  onKeyDown={handleCategoryKeyDown}
                  className={`
                    flex min-h-11 shrink-0 cursor-pointer
                    items-center justify-center
                    whitespace-nowrap rounded-full
                    px-3 text-sm font-medium uppercase
                    transition-colors
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-inset
                    focus-visible:ring-zinc-400
                    md:min-h-10 md:px-4
                    ${
                      isActive
                        ? `
                          bg-zinc-200/80 text-zinc-950
                          md:bg-transparent
                          dark:bg-zinc-700/70 dark:text-zinc-100
                          dark:md:bg-transparent
                        `
                        : `
                          text-zinc-500
                          hover:text-zinc-900
                          dark:text-zinc-400
                          dark:hover:text-zinc-100
                        `
                    }
                  `}
                >
                  {category.replaceAll("_", " ")}
                </button>
              );
            })}
          </div>
        </div>

        {isSearching && displayedItems.length === 0 ? (
          <div
            role="status"
            className="
              flex min-h-40 flex-col items-center justify-center
              gap-1 px-5 text-center
            "
          >
            <p className="text-[15px] font-medium text-zinc-700 dark:text-zinc-200">
              No markets found
            </p>

            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Try another market name or symbol.
            </p>
          </div>
        ) : (
          <div className="min-w-0 pb-[env(safe-area-inset-bottom)] md:pb-0">
            <RelativeStocks
              items={displayedItems}
              setActiveRange={setActiveRange}
              selectedIndex={isSearching ? selectedIndex : -1}
              onNavigate={onNavigate}
            />
          </div>
        )}
      </div>
    </div>
  );
}
