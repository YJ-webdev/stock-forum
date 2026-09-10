"use client";

import React from "react";
import {
  ArrowLeft,
  Plus,
  ChevronDown,
  Clock,
  Bookmark,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSimulatedLivePrice } from "@/app/hooks/useSimulatedLivePrice";
import { BookmarkIcon } from "./bookmark-icon";
import { useRouter } from "next/navigation";

export interface MarketDetailHeaderProps {
  symbol: string;
  name: string;
  rawPrice: number;
  isPositive?: boolean;
  onBack?: () => void;
  onAddToList?: () => void;
  categoryTitle?: string; // 👈 Added category prop
}

export function MarketDetailHeader({
  symbol,
  name,
  rawPrice,
  categoryTitle,
  onBack,
  onAddToList,
}: MarketDetailHeaderProps) {
  const { price } = useSimulatedLivePrice(rawPrice);
  const router = useRouter();

  const formattedPrice = price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handleHomeClick = () => {
    router.push("/");
  };

  return (
    <div className="w-full mb-3">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-300 font-medium ">
          <button
            onClick={handleHomeClick}
            className="flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors cursor-pointer"
          >
            <span>Home</span>
          </button>

          <ChevronRight className="w-4 h-4" />
          <button
            onClick={() => {}}
            className="flex capitalize items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
          >
            <span>{categoryTitle}</span>
          </button>
          <ChevronRight className="w-4 h-4" />
          <span className=" uppercase cursor-default">{symbol}</span>
        </div>{" "}
        {/* <button
          onClick={onAddToList}
          className="flex items-center hover:translate-y-[1px] transition-all dark:hover:bg-blue-900/50 cursor-pointer -translate-y-2.5"
        >
          <BookmarkIcon className="size-10" />
        </button> */}
      </div>

      {/* Header Title & Watchlist Action */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl md:text-[40px] font-bold text-gray-500/50 dark:text-zinc-700 tracking-tight">
          {name}
        </h1>
      </div>

      {/* Live Price Display */}
      <div className="flex items-center gap-3 -mt-1">
        <span
          className={`text-[30px] font-semibold text-zinc-800 dark:text-zinc-200 `}
        >
          {formattedPrice}
        </span>

        <div className="flex items-center gap-1.5 px-1 py-0.5  bg-zinc-100 dark:bg-zinc-800/80 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/50">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          <span>15MIN DELAY</span>
        </div>
      </div>
    </div>
  );
}
