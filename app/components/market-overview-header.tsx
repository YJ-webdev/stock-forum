// components/MarketOverviewHeader.tsx
"use client";

import React, { useRef, useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";

export interface StockTab {
  symbol: string;
  name: string;
  price?: string;
  percent?: string;
  isPositive?: boolean;
  logoUrl?: string; // 👈 Pass real image URL here
  logoBg?: string;
  logoText?: string;
}

interface MarketOverviewHeaderProps {
  categoryTitle?: string;
  flagIcon?: string;
  stocks: StockTab[]; // 👈 Use the passed-in array
  activeSymbol: string;
  onSelectStock: (symbol: string) => void;
  name?: string;
}

function StockLogo({ stock }: { stock: StockTab }) {
  const [hasError, setHasError] = useState(false);
  const cleanSymbol = stock.symbol.replace(/[\^=]/g, "").split(".")[0];

  // Fallback to FMP or Clearbit if logoUrl is not explicitly passed
  const imageUrl =
    stock.logoUrl ||
    `https://financialmodelingprep.com/image-stock/${cleanSymbol}.png`;

  if (hasError || !imageUrl) {
    return (
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0"
        style={{ backgroundColor: stock.logoBg || "#1e293b" }}
      >
        {stock.logoText || stock.name.charAt(0)}
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={stock.name}
      onError={() => setHasError(true)}
      className="w-7 h-7 rounded-full object-cover shrink-0 bg-zinc-100 dark:bg-zinc-800 p-0.5"
    />
  );
}

export function MarketOverviewHeader({
  categoryTitle,
  stocks = [], // 👈 Default to empty array to prevent map errors
  activeSymbol,
  onSelectStock,
}: MarketOverviewHeaderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -240 : 240;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="w-full space-y-3 mb-4">
      {/* Category Header */}
      {categoryTitle && (
        <div className="flex items-center gap-1.5 cursor-pointer group w-fit">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-600 transition-colors uppercase">
            {categoryTitle}
          </h2>
          <ChevronRight className="w-6 h-6 text-zinc-900 dark:text-zinc-100 group-hover:translate-x-0.5 transition-transform" />
        </div>
      )}

      {/* Horizontal Stock Selection Carousel */}
      <div className="relative flex items-center group/carousel">
        {/* Scroll Left Button */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 z-10 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-md flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:scale-105 transition-transform"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          ref={scrollRef}
          className="flex items-center gap-2 overflow-x-auto scrollbar-none scroll-smooth py-1 px-8 w-full"
        >
          {stocks.map((stock) => {
            const isSelected = stock.symbol === activeSymbol;

            return (
              <button
                key={stock.symbol}
                onClick={() => onSelectStock(stock.symbol)}
                className={`shrink-0 flex items-center gap-2.5 px-3.5 py-2 rounded-full transition-all cursor-pointer ${
                  isSelected
                    ? "bg-zinc-100 dark:bg-zinc-800 shadow-xs ring-1 ring-zinc-200 dark:ring-zinc-700"
                    : "bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                }`}
              >
                {/* Real Logo Image with Fallback */}
                <StockLogo stock={stock} />

                {/* Stock Details */}
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <span className="text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                    {stock.name}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Scroll Right Button */}
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 z-10 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-md flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:scale-105 transition-transform"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
