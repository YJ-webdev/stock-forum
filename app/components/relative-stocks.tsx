"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useFinnhubQuote } from "@/app/hooks/useFinnhubQuote";
import { MARKET_SYMBOLS } from "@/lib/data/market-symbols";
import { TrendSparkline } from "./trend-sparkline";

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
  const [selectedCategory] =
    useState<keyof typeof MARKET_SYMBOLS>(initialCategory);

  const currentSymbols = MARKET_SYMBOLS[selectedCategory] ?? [];

  return (
    <div className="w-full flex flex-col my-10">
      {/* Container: No margins, paddings, or extra constraints */}
      <div className="w-full bg-zinc-100 dark:bg-zinc-800/50 md:bg-white md:shadow-sm md:border md:rounded-lg border-zinc-200 dark:border-zinc-800/50">
        <table className="w-full table-fixed text-left text-[14px] md:text-[15px] border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800/60 text-zinc-400 dark:text-zinc-500 uppercase text-xs tracking-wider">
              <th className="w-[38%] md:w-auto py-3 pl-3 pr-1 md:pl-4">
                Asset
              </th>
              <th className="w-[24%] md:w-auto py-3 px-1 text-center">Trend</th>
              <th className="w-[22%] md:w-auto py-3 px-1 text-right">Price</th>
              <th className="hidden lg:table-cell py-3 px-1.5 text-right">
                24h %
              </th>
              <th className="hidden lg:table-cell py-3 px-1.5 text-right">
                Change
              </th>
              <th className="w-[16%] md:w-auto py-3 pl-1 pr-3 md:pr-4 text-right">
                Pred
              </th>
            </tr>
          </thead>
          <tbody className="font-medium">
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
  const { data: quote } = useFinnhubQuote(item.symbol, item.name, "1D");

  const priceColor = quote?.isPositive
    ? "text-emerald-700 dark:text-emerald-600"
    : "text-[#cf0000] dark:text-[#ff002f]";

  return (
    <tr className="border-b border-zinc-200/80 dark:border-zinc-800/60 hover:bg-zinc-200/60 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-100 transition-colors text-[14px] md:text-[15px]">
      {/* Symbol & Name */}
      <td className="py-3 pl-3 pr-1 md:px-1.5 md:pl-4 overflow-hidden">
        <Link
          href={`/market?symbol=${encodeURIComponent(
            item.symbol,
          )}&name=${encodeURIComponent(
            item.name,
          )}&category=${encodeURIComponent(item.category)}`}
          className="flex items-center gap-1.5 min-w-0"
        >
          <span className="hidden md:block px-1.5 py-0.5 rounded text-xs border shrink-0">
            {item.symbol}
          </span>
          <span className="truncate block w-full">{item.name}</span>
        </Link>
      </td>

      {/* Trend */}
      <td className="py-3 px-1 md:px-1.5 align-middle overflow-hidden">
        <div className="w-full overflow-hidden flex justify-center">
          <TrendSparkline
            data={quote?.history}
            isPositive={quote?.isPositive}
          />
        </div>
      </td>

      {/* Price */}
      <td className="py-3 px-1 md:px-1.5 text-right whitespace-nowrap overflow-hidden text-ellipsis">
        {quote?.value ?? "-"}
      </td>

      {/* Change % */}
      <td
        className={`hidden lg:table-cell py-3.5 px-1.5 text-right whitespace-nowrap ${priceColor}`}
      >
        {quote?.percent ?? "-"}
      </td>

      {/* Change */}
      <td
        className={`hidden lg:table-cell py-3.5 px-1.5 text-right self-end whitespace-nowrap ${priceColor}`}
      >
        {quote?.change ?? "-"}
      </td>

      {/* Users Prediction */}
      <td className="py-3 pl-1 pr-3 md:pr-4 text-right">
        <VoteButton />
        <MobileVoteButton />
      </td>
    </tr>
  );
}

const VoteButton = () => {
  return (
    <div className="hidden md:flex items-center justify-end ml-auto text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
      <button className="flex items-center justify-center border w-12 px-1 py-0.5 text-sm font-medium dark:hover:bg-white hover:text-zinc-900 hover:bg-zinc-200 dark:hover:text-black transition-colors cursor-pointer">
        Up
      </button>
      <button className="flex items-center justify-center border-y border-r w-12 px-1 py-0.5 text-sm font-medium dark:hover:bg-white hover:bg-zinc-200 hover:text-zinc-900 dark:hover:text-black transition-colors cursor-pointer">
        Down
      </button>
    </div>
  );
};

const MobileVoteButton = () => {
  return (
    <div className="flex md:hidden items-center justify-end text-zinc-700 dark:text-zinc-300">
      <button className="flex items-center justify-center border  px-2.5 py-1.5 text-sm font-medium dark:hover:bg-white hover:bg-zinc-200 hover:text-zinc-900 dark:hover:text-black transition-colors cursor-pointer">
        Poll
      </button>
    </div>
  );
};
