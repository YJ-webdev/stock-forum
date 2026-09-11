"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useFinnhubQuote } from "@/app/hooks/useFinnhubQuote";
import { MARKET_SYMBOLS } from "@/lib/data/market-symbols";
import { TrendSparkline } from "./trend-sparkline";
import { MdHowToVote } from "react-icons/md";

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
            <tr className="border-b border-zinc-200 dark:border-zinc-700/50 text-zinc-400 dark:text-zinc-500 uppercase text-xs tracking-wider">
              <th className="w-[38%] md:w-auto py-3 pl-3 pr-1 md:pl-4">
                Asset
              </th>
              <th className="w-[24%] md:w-auto py-3 px-2 text-center">Trend</th>
              <th className="w-[22%] md:w-auto py-3 px-2 text-right">Price</th>
              <th className="hidden lg:table-cell py-3 text-right">24h %</th>
              <th className="hidden lg:table-cell py-3  text-right">Change</th>
              <th className="w-[16%] md:w-auto py-3 pl-1 pr-3 md:pr-4 text-right">
                VOTE
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
    <tr className="border-b last:border-b-0 border-zinc-200/80 dark:border-zinc-700/50 hover:bg-zinc-200/60 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-100 transition-colors text-[14px] md:text-[15px]">
      {/* Symbol & Name */}
      <td className="pl-3 md:pl-4 overflow-hidden text-ellipsis">
        <Link
          href={`/market?symbol=${encodeURIComponent(
            item.symbol,
          )}&name=${encodeURIComponent(
            item.name,
          )}&category=${encodeURIComponent(item.category)}`}
          className="flex flex-col items-start gap-0.5 justify-center min-w-0"
        >
          <div className="shrink-0">{item.symbol}</div>
          <p className="truncate block w-full text-sm font-thin text-zinc-900/50 dark:text-zinc-300/70 dark:font-light">
            {item.name}
          </p>
        </Link>
      </td>

      {/* Trend */}
      <td className="py-3  align-middle overflow-hidden">
        <div className="w-full overflow-hidden flex justify-center">
          <TrendSparkline
            data={quote?.history}
            isPositive={quote?.isPositive}
          />
        </div>
      </td>

      {/* Price */}
      <td className="py-3 pr-2 min-w-fit text-right whitespace-nowrap overflow-hidden text-ellipsis">
        {quote?.value ?? "-"}
      </td>

      {/* Change % */}
      <td
        className={`hidden lg:table-cell py-3.5 text-right whitespace-nowrap ${priceColor}`}
      >
        {quote?.percent ?? "-"}
      </td>

      {/* Change */}
      <td
        className={`hidden lg:table-cell py-3.5 text-right self-end whitespace-nowrap ${priceColor}`}
      >
        {quote?.change ?? "-"}
      </td>

      {/* Users Prediction */}
      <td className="py-3 pr-3 md:pr-4 text-right">
        <VoteButton />
        {/* <MobileVoteButton /> */}
      </td>
    </tr>
  );
}

const VoteButton = () => {
  return (
    <div className="flex flex-col md:flex-row items-end md:items-center justify-end ml-auto text-white ">
      <button className="bg-emerald-600 border-black w-12 h-6">Bull</button>
      <button className="bg-rose-600 border-black w-12 h-6">Bear</button>
    </div>
  );
};

// const MobileVoteButton = () => {
//   return (
//     <div className="flex items-center justify-end">
//       <button className="flex items-center justify-center transition-colors cursor-pointer">
//         <MdHowToVote className="w-5 h-5 text-muted-foreground hover:text-foreground" />
//       </button>
//     </div>
//   );
// };
