// app/components/market-overview.tsx

"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { useCurrentUser } from "@/app/context/user-context";
import { resolveLanguage } from "@/lib/data/languages";
import { MARKET_PICKER_LABELS } from "@/lib/data/translations";

import {
  MARKET_SYMBOLS,
  CRYPTO_SYMBOLS,
  CURRENCY_SYMBOLS,
  COMMODITY_SYMBOLS,
  type MarketSymbolItem,
} from "@/lib/data/market-symbols";
import { RelativeStocks } from "./relative-stocks";

const MARKET_CATEGORIES: Record<string, MarketSymbolItem[]> = {
  ...MARKET_SYMBOLS,
  Crypto: CRYPTO_SYMBOLS,
  Currency: CURRENCY_SYMBOLS,
  Commodity: COMMODITY_SYMBOLS,
};

const CATEGORY_NAMES = Object.keys(MARKET_CATEGORIES);
const CATEGORY_HOVER_DELAY_MS = 1_000;

function revealCategory(container: HTMLElement, button: HTMLElement) {
  const containerRect = container.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();
  const padding = 12;

  if (buttonRect.left < containerRect.left + padding) {
    container.scrollLeft -= containerRect.left + padding - buttonRect.left;
  } else if (buttonRect.right > containerRect.right - padding) {
    container.scrollLeft += buttonRect.right - containerRect.right + padding;
  }
}

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
  const user = useCurrentUser();
  const language = resolveLanguage(user?.language);
  const categoryLabels = MARKET_PICKER_LABELS[language].groups;

  const [activeTab, setActiveTab] = useState("America");
  const [isBrowsingCategory, setIsBrowsingCategory] = useState(false);

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

    for (const [category, items] of Object.entries(MARKET_CATEGORIES)) {
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
  }, [normalizedQuery]);

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

    revealCategory(container, activeButton);
  }, [activeTab, language]);

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
    }, CATEGORY_HOVER_DELAY_MS);
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
      revealCategory(container, nextButton);
    }
  }

  const displayedItems = isSearching
    ? searchResults.map((result) => result.item)
    : (MARKET_CATEGORIES[activeTab] ?? []);

  return (
    <div
      ref={overviewRef}
      className="
        mx-auto w-full min-w-0 max-w-6xl
        bg-white dark:bg-zinc-800
      "
    >
      <div className="mx-0 flex min-w-0 flex-col gap-3 md:mx-4">
        <div
          className="
            sticky top-0 z-50
            bg-white dark:bg-zinc-800
          "
        >
          <div
            ref={categoriesRef}
            role="group"
            aria-label="Market categories"
            className="
              flex min-w-0 touch-pan-x items-center
              overflow-x-auto overscroll-x-contain
              scrollbar-none [&::-webkit-scrollbar]:hidden
              flex-nowrap gap-2 px-0
            "
          >
            {CATEGORY_NAMES.map((category) => {
              const isActive = activeTab === category;
              const categoryName =
                categoryLabels[category.toLowerCase()] ??
                category.replace(/_/g, " ");

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
                    flex shrink-0 cursor-pointer
                    items-center justify-center
                    whitespace-nowrap rounded-full
                    text-sm font-medium uppercase
                    transition-colors
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-inset
                    focus-visible:ring-zinc-400
                    min-h-10 px-4
                    ${
                      isActive
                        ? `
                          text-zinc-950
                          bg-transparent
                          dark:text-zinc-100
                          dark:bg-transparent
                        `
                        : `
                          text-zinc-500 hover:text-zinc-900
                          dark:text-zinc-400 dark:hover:text-zinc-100
                        `
                    }
                  `}
                >
                  {categoryName}
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
          <div className="min-w-0 pb-0">
            <RelativeStocks
              items={displayedItems}
              selectedIndex={isSearching ? selectedIndex : -1}
              onNavigate={onNavigate}
            />
          </div>
        )}
      </div>
    </div>
  );
}
