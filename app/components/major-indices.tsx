"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import Link from "next/link";

const POPULAR_BOARDS = [
  { symbol: "^GSPC", name: "S&P 500", newPosts: 12 },
  { symbol: "^NDX", name: "Nasdaq 100", newPosts: 8 },
  { symbol: "^DJI", name: "Dow Jones", newPosts: 5 },
  { symbol: "^N225", name: "Nikkei 225", newPosts: 4 },
  { symbol: "BTC-USD", name: "Bitcoin", newPosts: 3 },
  { symbol: "GC=F", name: "Gold", newPosts: 2 },
  { symbol: "^KS11", name: "KOSPI", newPosts: 2 },
  { symbol: "^HSI", name: "Hang Seng", newPosts: 1 },
];

export function PopularBoards() {
  return (
    <div className="flex flex-col gap-0.5">
      {POPULAR_BOARDS.map((item) => (
        <Link
          key={item.symbol}
          href={`/market?symbol=${encodeURIComponent(item.symbol)}`}
          className="
                    group flex min-w-0 items-center
                    rounded-none
                    px-4 py-1.5
                    text-zinc-700
                    transition-colors
                     hover:text-zinc-900
                    dark:text-zinc-300
                    
                    dark:hover:text-zinc-200
                  "
        >
          <Globe
            className="
                      mr-2 h-4.75 w-4.75 shrink-0
                      text-zinc-400
                      group-hover:text-zinc-500
                      dark:text-zinc-600
                      dark:group-hover:text-zinc-400
                    "
            strokeWidth={1}
          />

          <span className="min-w-0 flex-1 truncate text-[16px] font-medium dark:font-normal">
            {item.name}
          </span>

          {item.newPosts > 0 && (
            <p className="jakarta ml-auto text-[12px] font-light text-zinc-600 dark:text-zinc-500">
              {item.newPosts} New
            </p>
          )}
        </Link>
      ))}
    </div>
  );
}
