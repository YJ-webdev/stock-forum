// app/market/page.tsx
"use client";

import React, { useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ChartRange,
  SelectedRange,
  useMarketQuote,
} from "@/app/hooks/useMarketQuote";
import { DetailChart } from "@/app/components/detail-chart";
import {
  ALL_MARKET_SYMBOLS,
  AssetType,
  CRYPTO_SYMBOLS,
  CURRENCY_SYMBOLS,
  FUTURES_SYMBOLS,
  MARKET_SYMBOLS,
} from "@/lib/data/market-symbols";
import { MarketDetailHeader } from "@/app/components/market-detail-header";
import { RelativeStocks } from "@/app/components/relative-stocks";
import { MarketSymbolItem } from "@/lib/data/market-symbols";
import { ChevronRight } from "lucide-react";
import { refreshMarketQuote } from "@/app/hooks/market-quote-store";
import { Skeleton } from "@/components/ui/skeleton";

const RANGES = ["1D", "5D", "1M", "3M", "1Y", "5Y", "MAX"];

function getMarketSymbolMeta(symbol: string): MarketSymbolItem | undefined {
  return ALL_MARKET_SYMBOLS.find((item) => item.symbol === symbol);
}

export default function MarketDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawSymbol = searchParams.get("symbol") ?? "^GSPC";
  const selectedSymbol = decodeURIComponent(rawSymbol);

  const selectedName = searchParams.get("name") ?? "S&P 500";
  const selectedCategory = searchParams.get("category") ?? "us";
  const selectedAssetType = searchParams.get("assetType") ?? "index";

  const [unavailableRanges, setUnavailableRanges] = useState<
    Record<string, Set<ChartRange>>
  >({});

  const [activeRange, setActiveRange] = useState<SelectedRange>("1D");
  const matchedItem = ALL_MARKET_SYMBOLS.find(
    (item) => item.symbol === selectedSymbol,
  );

  const selectedDisplaySymbol =
    searchParams.get("displaySymbol") ??
    matchedItem?.displaySymbol ??
    selectedSymbol;

  const relativeStocks = ALL_MARKET_SYMBOLS.filter((item) => {
    const category = selectedCategory.toLowerCase();
    if (["america", "apec", "emea"].includes(category)) {
      return (
        item.region.toLowerCase() === category && item.symbol !== selectedSymbol
      );
    }

    if (["crypto", "currency", "futures"].includes(category)) {
      return (
        item.assetType.toLowerCase() === category &&
        item.symbol !== selectedSymbol
      );
    }

    return false;
  });

  const { data, error } = useMarketQuote(
    selectedSymbol,
    selectedName,
    activeRange as ChartRange,
    selectedDisplaySymbol,
    selectedAssetType as AssetType,
    0, // polling
    activeRange === "1D" ? "1m" : undefined,
  );

  // Fallback metadata lookup for timezone
  const symbolMeta = getMarketSymbolMeta(selectedSymbol);
  const chartRef = useRef<HTMLDivElement>(null);

  const handleRangeChange = async (range: SelectedRange) => {
    if (range === activeRange) return;

    // Don't retry a range already known to be unavailable for this symbol.
    if (unavailableRanges[selectedSymbol]?.has(range as ChartRange)) {
      return;
    }

    const chartInterval = range === "1D" ? "1m" : undefined;

    const result = await refreshMarketQuote(
      selectedSymbol,
      selectedName,
      range as ChartRange,
      selectedDisplaySymbol,
      selectedAssetType as AssetType,
      chartInterval,
    );

    if (result.error || !result.data) {
      setUnavailableRanges((prev) => ({
        ...prev,
        [selectedSymbol]: new Set([
          ...(prev[selectedSymbol] ?? []),
          range as ChartRange,
        ]),
      }));

      return;
    }

    // Only switch after the new range is ready.
    setActiveRange(range);
  };

  const MARKET_CATEGORIES: Record<string, MarketSymbolItem[]> = {
    ...MARKET_SYMBOLS,
    Crypto: CRYPTO_SYMBOLS,
    Currency: CURRENCY_SYMBOLS,
    Futures: FUTURES_SYMBOLS,
  };

  const categories = Object.keys(MARKET_CATEGORIES);

  const [activeTab, setActiveTab] = useState("America");
  const currentMarketSymbols = MARKET_CATEGORIES[activeTab] || [];

  return (
    <div className="max-w-4xl mx-auto mt-6">
      <div>
        <div className="w-full relative px-3 space-y-2">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-300 font-medium">
              <button
                onClick={() => router.push("/")}
                className="flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors cursor-pointer"
              >
                <span>Home</span>
              </button>

              <ChevronRight className="w-4 h-4" />
              <button className="flex capitalize items-center cursor-auto gap-1.5 transition-colors">
                <span>{selectedCategory}</span>
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 mt-2">
            <h1 className="text-[44px] font-bold text-gray-500/50 dark:text-zinc-700 tracking-tight leading-none">
              {selectedName}
            </h1>
          </div>
        </div>
        {/* Chart */}
        {error ? (
          <div className="md:mx-4 mt-5">
            <div className="w-full aspect-20/11 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 p-4 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
              <span className="text-xs text-zinc-400">{error}</span>
            </div>
          </div>
        ) : data ? (
          <>
            <div className="w-full relative px-3 mt-4 space-y-2">
              <MarketDetailHeader
                rawPrice={data.rawPrice}
                change={data.change}
                percent={data.percent}
                isPositive={data.isPositive}
                updatedAt={data.updatedAt}
                selectedRange={activeRange}
                onBack={() => router.back()}
                exchangeTimezone={
                  data.exchangeTimezone || symbolMeta?.timezone || "UTC"
                }
              />
            </div>
            <div ref={chartRef} className="scroll-mt-70 md:mx-4 mt-2">
              <DetailChart
                history={data.history}
                isPositive={data.isPositive}
                isClosed={data.isClosed}
                previousClose={data.previousClose}
                lunchStartMs={activeRange === "1D" ? data.lunchStartMs : null}
                lunchEndMs={activeRange === "1D" ? data.lunchEndMs : null}
                exchangeTimezone={
                  data.exchangeTimezone || symbolMeta?.timezone || "UTC"
                }
                range={activeRange}
              />
            </div>{" "}
          </>
        ) : (
          <>
            <div className="w-full relative px-3 mt-4 space-y-2">
              <div className="w-full flex flex-col gap-2 mb-2">
                <Skeleton className="h-9 w-44 rounded-xl" />
                <Skeleton className="h-5 w-36 rounded-full" />
              </div>
            </div>

            <div className="md:mx-4 mt-1">
              <Skeleton className="w-full aspect-800/372 rounded-lg" />
            </div>
          </>
        )}

        <div className="flex justify-between sm:justify-start gap-2 flex-wrap mx-2 my-4 md:mx-4">
          {RANGES.map((r) => {
            const isUnavailable =
              unavailableRanges[selectedSymbol]?.has(r as ChartRange) ||
              (r === activeRange && !!error);

            return (
              <button
                key={r}
                title={isUnavailable ? "Data unavailable" : undefined}
                disabled={isUnavailable}
                onClick={() => handleRangeChange(r as ChartRange)}
                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
                  isUnavailable
                    ? "bg-zinc-100 dark:bg-zinc-700/50 text-zinc-400 font-thin dark:text-zinc-600 cursor-default"
                    : activeRange === r
                      ? "bg-zinc-300/50 text-zinc-600 dark:bg-zinc-600/50 dark:text-zinc-400 cursor-pointer"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600/50 cursor-pointer"
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
        <div className="mx-4 my-10 rounded border">discussion</div>

        <div className="flex flex-col gap-3 md:mx-4 mb-20 mt-10">
          {/* Tab Navigation */}
          <div className="flex gap-1 md:gap-2 space-x-2.5 md:space-x-0 flex-wrap justify-start">
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
    </div>
  );
}
