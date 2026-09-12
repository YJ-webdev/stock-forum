// app/market/page.tsx
"use client";

import React, { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChartRange, useMarketQuote } from "@/app/hooks/useMarketQuote";
import { DetailChart } from "@/app/components/detail-chart";
import { ALL_MARKET_SYMBOLS, AssetType } from "@/lib/data/market-symbols";
import { MarketDetailHeader } from "@/app/components/market-detail-header";
import { RelativeStocks } from "@/app/components/relative-stocks";
import { MarketSymbolItem } from "@/lib/data/market-symbols";

const RANGES = ["1D", "5D", "1M", "3M", "1Y", "5Y", "MAX"];

function getMarketSymbolMeta(symbol: string): MarketSymbolItem | undefined {
  // Simple, direct lookup against ALL_MARKET_SYMBOLS
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

  const [activeRange, setActiveRange] = useState("1D");

  const matchedItem = ALL_MARKET_SYMBOLS.find(
    (item) => item.symbol === selectedSymbol,
  );

  const selectedDisplaySymbol =
    searchParams.get("displaySymbol") ??
    matchedItem?.displaySymbol ??
    selectedSymbol;

  const relativeStocks = ALL_MARKET_SYMBOLS.filter(
    (item) =>
      item.region.toLowerCase() === selectedCategory.toLowerCase() &&
      item.symbol !== selectedSymbol,
  );

  // Fetch chart data directly with searchParam values
  const { data } = useMarketQuote(
    selectedSymbol,
    selectedName,
    activeRange as ChartRange,
    selectedDisplaySymbol,
    selectedAssetType as AssetType,
  );

  // Fallback metadata lookup for timezone
  const symbolMeta = getMarketSymbolMeta(selectedSymbol);

  console.log({
    selectedSymbol,
    hookTimezone: data?.exchangeTimezone,
    staticMeta: symbolMeta,
    resolvedTimezone:
      data?.exchangeTimezone ||
      symbolMeta?.timezone ||
      symbolMeta?.exchangeTimezone,
  });
  console.log("PRICE DEBUG:", {
    data,
    rawPrice: data?.rawPrice,
    value: data?.value,
  });
  return (
    <div className="max-w-4xl mx-auto mt-4 ">
      {/* Detailed Chart & Range Controls */}
      {data && (
        <>
          <MarketDetailHeader
            key={data.id}
            symbol={data.id}
            name={data.name}
            rawPrice={data.rawPrice}
            displaySymbol={selectedDisplaySymbol}
            // value={data?.value}
            change={data.change}
            percent={data.percent}
            isPositive={data.isPositive}
            selectedRange={activeRange}
            onBack={() => router.back()}
            categoryTitle={selectedCategory}
            updatedAt={data.updatedAt}
            exchangeTimezone={
              data?.exchangeTimezone ||
              symbolMeta?.timezone ||
              symbolMeta?.exchangeTimezone ||
              "UTC"
            }
          />
          {/* chart */}
          <div className="md:mx-4">
            <DetailChart
              history={data.history}
              isPositive={data.isPositive}
              isClosed={data.isClosed}
              range={activeRange}
              previousClose={data.previousClose}
            />
          </div>
          <div className="flex gap-2 flex-wrap m-4">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setActiveRange(r)}
                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer ${
                  activeRange === r
                    ? "bg-zinc-300/50 text-zinc-600 dark:bg-zinc-600/50 dark:text-zinc-400"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600/50"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 md:mx-4 mb-20">
            <div className="flex justify-between items-baseline mx-3 md:mx-0 font-thin">
              <h3 className="mt-10">
                Related assets{" "}
                <span className="text-sm font-normal text-zinc-500">
                  ({relativeStocks.length})
                </span>
              </h3>
            </div>
            <RelativeStocks items={relativeStocks} />
          </div>
        </>
      )}
    </div>
  );
}
