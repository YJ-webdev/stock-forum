"use client";

import { useState } from "react";

import type { SelectedRange } from "../hooks/useMarketQuote";

import {
  MARKET_SYMBOLS,
  CRYPTO_SYMBOLS,
  CURRENCY_SYMBOLS,
  commodity_SYMBOLS,
  type MarketSymbolItem,
} from "@/lib/data/market-symbols";

import { RelativeStocks } from "./relative-stocks";

export default function MarketOverview() {
  const MARKET_CATEGORIES: Record<string, MarketSymbolItem[]> = {
    ...MARKET_SYMBOLS,
    Crypto: CRYPTO_SYMBOLS,
    Currency: CURRENCY_SYMBOLS,
    commodity: commodity_SYMBOLS,
  };

  const categories = Object.keys(MARKET_CATEGORIES);

  const [activeTab, setActiveTab] = useState("America");
  const [, setActiveRange] = useState<SelectedRange>("1D");

  const currentMarketSymbols = MARKET_CATEGORIES[activeTab] ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-col gap-3 md:mx-4">
        {/* Categories */}
        <div className="flex flex-wrap gap-1.5 justify-start space-x-2.5 px-2 md:space-x-0 md:px-0">
          {categories.map((category) => {
            const isActive = activeTab === category;

            return (
              <button
                key={category}
                type="button"
                onMouseEnter={() => setActiveTab(category)}
                className={`
                  cursor-pointer rounded-full
                  px-2 py-2
                  text-sm font-medium uppercase
                  transition-all
                  md:px-4
                  dark:font-normal
                  border
                  border-white
                  dark:border-zinc-900
                  ${
                    isActive
                      ? `
                        bg-zinc-100
                        text-zinc-900
                        dark:bg-zinc-800
                        dark:text-white
                        border-zinc-200
                        dark:border-zinc-700!
                        
                      `
                      : `
                        bg-transparent
                        text-zinc-500
                        hover:bg-zinc-100
                        hover:text-zinc-500
                        dark:text-zinc-300
                        dark:hover:bg-zinc-800
                        dark:hover:text-zinc-300
                        hover:border-zinc-200
                        dark:hover:border-zinc-700!
                        hover:dark:border-zinc-300
                        
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
