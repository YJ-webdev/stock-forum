"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { ArrowUp, ArrowDown, ChevronRight, ChevronLeft } from "lucide-react";

import {
  AssetType,
  SelectedRange,
  useMarketQuote,
} from "../hooks/useMarketQuote";
import {
  MARKET_SYMBOLS,
  CRYPTO_SYMBOLS,
  CURRENCY_SYMBOLS,
  COMMODITIES_SYMBOLS,
  MarketSymbolItem,
} from "@/lib/data/market-symbols";

// import { Sparkline } from "./sparkline";
import Link from "next/link";
import { Numeric } from "./numeric";
import { RelativeStocks } from "./relative-stocks";

function MarketCard({
  symbol,
  displaySymbol,
  name,
  category,
  assetType,
}: {
  symbol: string;
  name: string;
  category: string;
  displaySymbol: string;
  assetType: AssetType;
}) {
  const { data, loading } = useMarketQuote(
    symbol,
    name,
    "1D",
    displaySymbol,
    assetType,
  );

  if (loading) {
    return (
      <div className="bg-gray-100/80 border-none dark:bg-muted-foreground/5 rounded-lg h-44 p-4 flex flex-col justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 full bg-zinc-200/50 dark:bg-zinc-800" />
          <Skeleton className="h-3 w-4/5 bg-zinc-200/50 dark:bg-zinc-800" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-6 w-2/5 bg-zinc-200/50 dark:bg-zinc-800" />
          <Skeleton className="h-6 w-full bg-zinc-200/50 dark:bg-zinc-800" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="border-none bg-gray-100/80 dark:bg-muted-foreground/5 rounded-2xl h-44 p-4 flex flex-col justify-center items-center">
        <p className="text-xs text-slate-400 dark:text-white font-medium">
          Failed to load {name}
        </p>
      </Card>
    );
  }

  return (
    <Link
      href={`/market?symbol=${encodeURIComponent(
        symbol,
      )}&name=${encodeURIComponent(name)}&category=${encodeURIComponent(
        category,
      )}&assetType=${encodeURIComponent(assetType)}`}
    >
      <div className="bg-zinc-100/70 dark:bg-zinc-800/50 h-44 overflow-hidden m-0 p-0 rounded-lg cursor-pointer transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
        <div className="flex flex-col justify-between h-48 m-0 p-0">
          {/* Header */}
          <div className="flex flex-col">
            <div className="flex flex-col items-start mx-3.5 mt-5 mb-0.5">
              <h2 className="line-clamp-2 text-zinc-800 text-[18px] font-medium dark:text-zinc-300 tracking-tight text-wrap leading-tight">
                {data.name}
              </h2>
            </div>

            <Numeric className="text-zinc-700 dark:text-zinc-400 text-sm mx-3.5">
              {data.value}{" "}
              <span className="text-zinc-500 dark:text-zinc-400 dark:font-thin tracking-tight">
                ({data.change})
              </span>
            </Numeric>
          </div>

          {/* Performance & Graph */}
          <div className="-translate-y-1">
            <Numeric className="flex items-center justify-end gap-1.5 font-semibold text-xl mx-2">
              <span
                className={
                  data.isPositive ? "text-emerald-700" : "text-[#cf0000]"
                }
              >
                {data.percent}
              </span>

              <div
                className={`flex items-center justify-center w-5 h-5 rounded-full text-white text-xs ${
                  data.isPositive ? "bg-emerald-700" : "bg-[#cf0000]"
                }`}
              >
                {data.isPositive ? (
                  <ArrowUp
                    className="w-3 h-3 dark:text-zinc-800"
                    strokeWidth={3.5}
                  />
                ) : (
                  <ArrowDown
                    className="w-3 h-3 dark:text-zinc-800"
                    strokeWidth={3.5}
                  />
                )}
              </div>
            </Numeric>

            {/* Curved Dynamic Sparkline */}
            <div className="-translate-y-4">
              {/* <Sparkline
                points={data.history.map((p) => p.price)}
                isPositive={data.isPositive}
                isClosed={data.isClosed}
                lunchStartMs={data.lunchStartMs || undefined}
                lunchEndMs={data.lunchEndMs || undefined}
              /> */}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function MarketOverview() {
  const MARKET_CATEGORIES: Record<string, MarketSymbolItem[]> = {
    ...MARKET_SYMBOLS,
    // Crypto: CRYPTO_SYMBOLS,
  };

  const categories = Object.keys(MARKET_CATEGORIES);

  const [activeTab, setActiveTab] = useState("America");
  const currentMarketSymbols = MARKET_CATEGORIES[activeTab] || [];
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canSlideLeft, setCanSlideLeft] = useState(false);
  const [canSlideRight, setCanSlideRight] = useState(true);
  const [activeRange, setActiveRange] = useState<SelectedRange>("1D");

  const checkScrollPosition = () => {
    const el = scrollContainerRef.current;
    if (!el) return;

    // Small 2px buffer to handle pixel rounding discrepancies
    const isAtStart = el.scrollLeft <= 2;

    const isAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;

    setCanSlideLeft(!isAtStart);
    setCanSlideRight(!isAtEnd);
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    el.scrollTo({
      left: 0,
      behavior: "auto",
    });

    checkScrollPosition();
    el.addEventListener("scroll", checkScrollPosition, { passive: true });
    window.addEventListener("resize", checkScrollPosition);

    return () => {
      el.removeEventListener("scroll", checkScrollPosition);
      window.removeEventListener("resize", checkScrollPosition);
    };
  }, [activeTab]);

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;

    // Scroll by one visible container width
    const scrollAmount = el.clientWidth;

    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="w-full max-w-6xl pt-4">
      {/* Navigation & Controls */}
      <div className="flex items-center justify-between mb-4">
        {/* Tab Navigation */}
        {/* <div className="flex gap-1 md:gap-2 space-x-2.5 md:space-x-0 flex-wrap justify-start">
          {categories.map((category) => {
            const isActive = activeTab === category;

            return (
              <button
                key={category}
                onClick={() => setActiveTab(category)}
                className={`px-2 md:px-4 py-1.5 rounded-full uppercase text-sm font-medium dark:font-normal transition-all cursor-pointer border ${
                  isActive
                    ? "bg-zinc-100 text-zinc-900 border-zinc-300 dark:bg-zinc-800 dark:text-white dark:border-zinc-700"
                    : "bg-transparent text-zinc-500 dark:text-zinc-300 border-transparent hover:text-zinc-500 hover:border-zinc-200 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 hover:bg-zinc-100 dark:hover:text-zinc-300"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div> */}

        {/* Carousel Arrow Buttons */}
        {/* <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => handleScroll("left")}
            disabled={!canSlideLeft}
            aria-label="Previous items"
            className="p-2 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleScroll("right")}
            disabled={!canSlideRight}
            aria-label="Next items"
            className="p-2 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div> */}
      </div>

      {/* Market Cards */}
      {/* <div
        ref={scrollContainerRef}
        className="overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-smooth"
      >
        <div className="grid grid-flow-col auto-cols-[calc((100%-2*1.5rem)/2)] min-[560px]:auto-cols-[calc((100%-4*1.5rem)/3)] xl:auto-cols-[calc((100%-4*1.5rem)/5)] gap-4 sm:gap-6">
          {currentMarketSymbols.map((item) => (
            <div key={item.symbol} className="snap-start">
              <MarketCard
                symbol={item.symbol}
                name={item.name}
                category={activeTab}
                displaySymbol={item.displaySymbol}
                assetType={item.assetType}
              />
            </div>
          ))}
        </div>
      </div> */}
      <div className="flex flex-col gap-3 md:mx-4 mb-24">
        <div className="flex gap-1 md:gap-2 space-x-2.5 md:space-x-0 flex-wrap justify-start px-2 md:px-0">
          {categories.map((category) => {
            const isActive = activeTab === category;

            return (
              <button
                key={category}
                onClick={() => setActiveTab(category)}
                className={`px-2 md:px-4 py-1.5 rounded-full uppercase text-sm font-medium dark:font-normal transition-all cursor-pointer border ${
                  isActive
                    ? "bg-zinc-100 text-zinc-900 border-zinc-300 dark:bg-zinc-800 dark:text-white dark:border-zinc-700"
                    : "bg-transparent text-zinc-500 dark:text-zinc-300 border-transparent hover:text-zinc-500 hover:border-zinc-200 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 hover:bg-zinc-100 dark:hover:text-zinc-300"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
        <RelativeStocks
          items={currentMarketSymbols}
          setActiveRange={setActiveRange}
        />
      </div>
    </div>
  );
}
