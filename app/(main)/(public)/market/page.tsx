// app/market/page.tsx
"use client";

import React, { useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ChartRange, useFinnhubQuote } from "@/app/hooks/useFinnhubQuote";
import { DetailChart } from "@/app/components/detail-chart";
import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";
import { MarketDetailHeader } from "@/app/components/market-detail-header";
import { RelativeStocks } from "@/app/components/relative-stocks";

const RANGES = ["1D", "5D", "1M", "3M", "1Y", "5Y", "MAX"];

export default function MarketDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read single source of truth directly from searchParams (no useState needed)
  const selectedSymbol = searchParams.get("symbol") ?? "^GSPC";
  const selectedName = searchParams.get("name") ?? "S&P 500";
  const selectedCategory = searchParams.get("category") ?? "us";

  const [activeRange, setActiveRange] = useState("1D");

  // Filter symbols based on current category
  const relativeStocks = ALL_MARKET_SYMBOLS.filter(
    (item) => item.category.toLowerCase() === selectedCategory.toLowerCase(),
  );

  // Fetch chart data directly with searchParam values
  const { data } = useFinnhubQuote(
    selectedSymbol,
    selectedName,
    activeRange as ChartRange,
  );

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Detailed Chart & Range Controls */}
      {data && (
        <>
          <MarketDetailHeader
            key={data.id}
            symbol={data.id}
            name={data.name}
            rawPrice={data.rawPrice}
            isPositive={data.isPositive}
            onBack={() => router.back()}
            categoryTitle={selectedCategory}
          />
          <DetailChart
            history={data.history}
            isPositive={data.isPositive}
            isClosed={data.isClosed}
            range={activeRange}
            previousClose={data.previousClose}
          />
          <div className="flex gap-2">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setActiveRange(r)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                  activeRange === r
                    ? "bg-zinc-300 text-zinc-600 dark:bg-zinc-600/50 dark:text-zinc-400"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600/50"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <RelativeStocks />
        </>
      )}
    </div>
  );
}
