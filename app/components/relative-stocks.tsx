// app/components/relative-stocks.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useFinnhubQuote } from "@/app/hooks/useFinnhubQuote";
import { MARKET_SYMBOLS } from "@/lib/data/market-symbols";

export interface MarketSymbolItem {
  name: string;
  symbol: string;
  category: string;
  logoUrl?: string;
}

export const ALL_MARKET_SYMBOLS: MarketSymbolItem[] =
  Object.values(MARKET_SYMBOLS).flat();

interface RelativeStocksProps {
  initialCategory?: keyof typeof MARKET_SYMBOLS;
}

export function RelativeStocks({
  initialCategory = "US",
}: RelativeStocksProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<keyof typeof MARKET_SYMBOLS>(initialCategory);

  const currentSymbols = MARKET_SYMBOLS[selectedCategory] ?? [];

  return (
    <div className="w-full flex flex-col mt-10 mb-10">
      {/* Category Tabs */}
      {/* <div className="flex items-center gap-2 pl-4 pt-2 pb-5 overflow-x-auto scrollbar-none border-x border-t rounded-t-lg dark:bg-zinc-800/50 dark:border-zinc-800/50">
        {(
          Object.keys(MARKET_SYMBOLS) as Array<keyof typeof MARKET_SYMBOLS>
        ).map((category) => {
          const isActive = selectedCategory === category;
          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-2 text-[16px] font-medium whitespace-nowrap  transition-colors ${
                isActive
                  ? " text-zinc-900  dark:text-zinc-100"
                  : " text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div> */}

      {/* Stock Table */}
      <div className="w-full shadow-sm overflow-x-auto border rounded-lg border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-800/50">
        <table className="w-full text-left text-[15px] border-collapse">
          <thead className="font-thin">
            <tr className="border-b border-zinc-200 dark:border-zinc-800/60 text-zinc-400 dark:text-zinc-500 uppercase text-xs tracking-wider">
              <th className="py-3 px-1.5 pl-4">Asset</th>
              <th className="py-3 px-1.5 text-right">Price</th>
              <th className="py-3 px-1.5 text-right">24h %</th>
              <th className="py-3 px-1.5 text-right">Change</th>
              <th className="py-3 px-1.5 text-right">High</th>
              <th className="py-3 px-1.5 pr-4 text-right">Low</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
            {currentSymbols.map((item) => (
              <RelativeStockRow key={item.symbol} item={item} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RelativeStockRow({ item }: { item: MarketSymbolItem }) {
  const { data: quote, loading } = useFinnhubQuote(
    item.symbol,
    item.name,
    "1D",
  );

  const historyPrices = quote?.history?.map((p) => p.price) ?? [];
  const high = historyPrices.length > 0 ? Math.max(...historyPrices) : null;
  const low = historyPrices.length > 0 ? Math.min(...historyPrices) : null;

  const priceColor = quote?.isPositive
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-rose-600 dark:text-rose-400";

  return (
    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors group">
      {/* Symbol & Name */}
      <td className="py-3.5 px-1.5 pl-4 max-w-55">
        <Link
          href={`/market?symbol=${encodeURIComponent(
            item.symbol,
          )}&name=${encodeURIComponent(item.name)}&category=${encodeURIComponent(
            item.category,
          )}`}
          className="flex items-center gap-2 min-w-0"
        >
          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
            {item.symbol}
          </span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate text-[15px]">
            {item.name}
          </span>
        </Link>
      </td>

      {/* Price */}
      <td className="py-3.5 px-1.5 text-right font-medium text-zinc-900 dark:text-zinc-100 text-[15px] whitespace-nowrap">
        {loading ? "-" : (quote?.value ?? "-")}
      </td>

      {/* Change % */}
      <td
        className={`py-3.5 px-1.5 text-right font-medium text-[15px] whitespace-nowrap ${priceColor}`}
      >
        {loading ? "-" : (quote?.percent ?? "-")}
      </td>

      {/* Change */}
      <td
        className={`py-3.5 px-1.5 text-right font-medium text-[15px] whitespace-nowrap ${priceColor}`}
      >
        {loading ? "-" : (quote?.change ?? "-")}
      </td>

      {/* High */}
      <td className="py-3.5 px-1.5 text-right text-zinc-700 dark:text-zinc-300 text-[15px] whitespace-nowrap">
        {high !== null
          ? high.toLocaleString("en-US", { minimumFractionDigits: 2 })
          : "-"}
      </td>

      {/* Low */}
      <td className="py-3.5 px-1.5 pr-4 text-right text-zinc-700 dark:text-zinc-300 text-[15px] whitespace-nowrap">
        {low !== null
          ? low.toLocaleString("en-US", { minimumFractionDigits: 2 })
          : "-"}
      </td>
    </tr>
  );
}
