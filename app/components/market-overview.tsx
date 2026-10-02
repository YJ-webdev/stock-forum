"use client";

import { useState } from "react";

import type { SelectedRange } from "../hooks/useMarketQuote";

import {
  MARKET_SYMBOLS,
  CRYPTO_SYMBOLS,
  CURRENCY_SYMBOLS,
  COMMODITY_SYMBOLS,
  type MarketSymbolItem,
} from "@/lib/data/market-symbols";

import { RelativeStocks } from "./relative-stocks";

export default function MarketOverview() {
  const MARKET_CATEGORIES: Record<string, MarketSymbolItem[]> = {
    ...MARKET_SYMBOLS,
    Crypto: CRYPTO_SYMBOLS,
    Currency: CURRENCY_SYMBOLS,
    Commodity: COMMODITY_SYMBOLS,
  };

  const categories = Object.keys(MARKET_CATEGORIES);

  const [activeTab, setActiveTab] = useState("America");
  const [, setActiveRange] = useState<SelectedRange>("1D");

  const currentMarketSymbols = MARKET_CATEGORIES[activeTab] ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-col gap-3 md:mx-4">
        {/* Categories */}
        <div className="flex flex-wrap gap-2 justify-start px-2 md:space-x-0 md:px-0">
          {categories.map((category) => {
            const isActive = activeTab === category;

            return (
              <button
                key={category}
                type="button"
                onMouseEnter={() => setActiveTab(category)}
                className={`
                  cursor-pointer rounded-full
                  px-2 py-1.75
                  text-sm font-medium uppercase
                  transition-all
                  md:px-4
                  dark:font-normal
                  border
                  border-white
                  dark:border-transparent
                  ${
                    isActive
                      ? `
                        text-black
                        dark:text-white
                      `
                      : `
                        text-zinc-500
                        dark:text-zinc-300
                      `
                  }
                `}
              >
                {category.replaceAll("_", " ")}
              </button>
            );
          })}
        </div>

        {/* Markets */}
        <RelativeStocks
          items={currentMarketSymbols}
          setActiveRange={setActiveRange}
        />
      </div>
    </div>
  );
}
