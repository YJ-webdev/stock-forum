"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  const MARKET_CATEGORIES: Record<string, MarketSymbolItem[]> = useMemo(
    () => ({
      ...MARKET_SYMBOLS,
      Crypto: CRYPTO_SYMBOLS,
      Currency: CURRENCY_SYMBOLS,
      Commodity: COMMODITY_SYMBOLS,
    }),
    [],
  );

  const categories = Object.keys(MARKET_CATEGORIES);

  const [activeTab, setActiveTab] = useState("America");
  const [isBrowsingCategory, setIsBrowsingCategory] = useState(false);
  const [, setActiveRange] = useState<SelectedRange>("1D");

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

        const symbol = item.symbol.toLowerCase();
        const displaySymbol = item.displaySymbol?.toLowerCase() ?? "";
        const name = item.name.toLowerCase();

        const matches =
          symbol.includes(normalizedQuery) ||
          displaySymbol.includes(normalizedQuery) ||
          name.includes(normalizedQuery);

        if (!matches) {
          continue;
        }

        seen.add(item.symbol);

        results.push({
          item,
          category,
        });
      }
    }

    return results;
  }, [MARKET_CATEGORIES, normalizedQuery]);

  const matchedCategory = searchResults[0]?.category ?? null;

  const isSearching = hasQuery && !isBrowsingCategory;

  useEffect(() => {
    setIsBrowsingCategory(false);
  }, [normalizedQuery]);

  useEffect(() => {
    if (!isSearching || !matchedCategory) {
      return;
    }

    setActiveTab(matchedCategory);
  }, [isSearching, matchedCategory]);

  useEffect(() => {
    if (!onSearchResultsChange) {
      return;
    }

    if (!isSearching) {
      onSearchResultsChange([]);
      return;
    }

    onSearchResultsChange(searchResults.map((result) => result.item.symbol));
  }, [isSearching, searchResults, onSearchResultsChange]);

  useEffect(() => {
    return () => {
      if (categoryHoverTimerRef.current) {
        clearTimeout(categoryHoverTimerRef.current);
      }
    };
  }, []);

  const handleCategorySelect = (category: string) => {
    if (categoryHoverTimerRef.current) {
      clearTimeout(categoryHoverTimerRef.current);
      categoryHoverTimerRef.current = null;
    }

    setActiveTab(category);
    setIsBrowsingCategory(true);
  };

  const handleCategoryMouseEnter = (category: string) => {
    if (categoryHoverTimerRef.current) {
      clearTimeout(categoryHoverTimerRef.current);
      categoryHoverTimerRef.current = null;
    }

    if (!hasQuery) {
      setActiveTab(category);
      return;
    }

    categoryHoverTimerRef.current = setTimeout(() => {
      setActiveTab(category);
      setIsBrowsingCategory(true);
      categoryHoverTimerRef.current = null;
    }, 1000);
  };

  const handleCategoryMouseLeave = () => {
    if (categoryHoverTimerRef.current) {
      clearTimeout(categoryHoverTimerRef.current);
      categoryHoverTimerRef.current = null;
    }
  };

  const handleCategoryKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();

      const searchInput = document.querySelector<HTMLInputElement>(
        "#market-search-input",
      );

      searchInput?.focus();

      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      const firstRow = document.querySelector<HTMLTableRowElement>(
        '[data-market-row="true"]',
      );

      firstRow?.focus();

      return;
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();

      const categoryButtons = Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          '[data-market-category="true"]',
        ),
      );

      const currentIndex = categoryButtons.indexOf(event.currentTarget);

      if (currentIndex === -1) {
        return;
      }

      const nextIndex =
        event.key === "ArrowRight"
          ? (currentIndex + 1) % categoryButtons.length
          : (currentIndex - 1 + categoryButtons.length) %
            categoryButtons.length;

      categoryButtons[nextIndex]?.focus();
    }
  };

  const displayedItems = isSearching
    ? searchResults.map((result) => result.item)
    : (MARKET_CATEGORIES[activeTab] ?? []);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-col gap-3 md:mx-4">
        <div className="flex flex-wrap justify-start gap-2 px-2 md:space-x-0 md:px-0">
          {categories.map((category) => {
            const isActive = activeTab === category;

            return (
              <button
                key={category}
                type="button"
                data-market-category="true"
                data-active-category={isActive ? "true" : "false"}
                onMouseEnter={() => handleCategoryMouseEnter(category)}
                onMouseLeave={handleCategoryMouseLeave}
                onClick={() => handleCategorySelect(category)}
                onKeyDown={handleCategoryKeyDown}
                className={`
                  cursor-pointer rounded-full
                  px-2 py-1.75
                  text-sm font-medium uppercase
                  transition-all
                  md:px-4
                  border
                  border-white
                  dark:border-transparent
                  ${
                    isActive
                      ? `
                        text-black
                        dark:text-zinc-100
                      `
                      : `
                        text-zinc-500
                        dark:text-zinc-400
                      `
                  }
                `}
              >
                {category.replaceAll("_", " ")}
              </button>
            );
          })}
        </div>

        {isSearching && displayedItems.length === 0 ? (
          <div className="flex min-h-32 items-center justify-center px-4 text-sm text-zinc-500 dark:text-zinc-400">
            No markets found
          </div>
        ) : (
          <RelativeStocks
            items={displayedItems}
            setActiveRange={setActiveRange}
            selectedIndex={isSearching ? selectedIndex : -1}
            onNavigate={onNavigate}
          />
        )}
      </div>
    </div>
  );
}
