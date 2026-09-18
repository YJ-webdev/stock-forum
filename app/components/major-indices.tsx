"use client";

import { Globe, Heart, Plus, Star, UserRoundPlus } from "lucide-react";
import Link from "next/link";

const POPULAR_BOARDS = [
  { symbol: "^GSPC", name: "S&P 500", newPosts: 12 },
  { symbol: "^NDX", name: "Nasdaq 100", newPosts: 8 },
  { symbol: "^DJI", name: "Dow Jones", newPosts: 6 },
  { symbol: "^N225", name: "Nikkei 225", newPosts: 5 },
  { symbol: "^HSI", name: "Hang Seng", newPosts: 4 },
  { symbol: "^NSEI", name: "Nifty 50", newPosts: 3 },
  { symbol: "^STOXX50E", name: "EURO STOXX 50", newPosts: 3 },
];

export function PopularBoards() {
  return (
    <div className="flex flex-col gap-0.5 px-3">
      {POPULAR_BOARDS.map((item) => (
        <Link
          key={item.symbol}
          href={`/market?symbol=${encodeURIComponent(item.symbol)}`}
          className="
  group flex min-w-0 items-center
  rounded-md
  px-2 py-1.5

  text-zinc-700

  hover:bg-zinc-100
  hover:outline-[3px]
  hover:outline-zinc-100
  hover:text-zinc-900

  dark:text-zinc-300
  dark:hover:bg-zinc-800/70
  dark:hover:outline-zinc-800/70
  dark:hover:text-zinc-200
"
        >
          <Globe
            className="
              mr-2 h-4.75 w-4.75 shrink-0
              text-zinc-400
              group-hover:text-zinc-800
              dark:text-zinc-600
              dark:group-hover:text-zinc-400
            "
            strokeWidth={1}
          />

          <span className="min-w-0 flex-1 truncate text-[16px] text-zinc-800 dark:text-zinc-300 font-medium dark:font-normal">
            {item.name}
          </span>

          {/* right side */}
          <div className="ml-2 flex shrink-0 items-center justify-end">
            {/* Default: New */}
            {item.newPosts > 0 && (
              <span
                className="
                  jakarta text-[12px] font-light
                  text-zinc-600 dark:text-zinc-500
                  group-hover:hidden
                "
              >
                {item.newPosts} New
              </span>
            )}

            {/* Hover: Add */}
            <Plus
              className="
                hidden h-[18px] w-[18px]
                text-zinc-800
                group-hover:block
                dark:text-zinc-300
              "
              strokeWidth={1.5}
            />
          </div>
        </Link>
      ))}
    </div>
  );
}
