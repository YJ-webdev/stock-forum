"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { ArrowUp, ArrowDown, Radio } from "lucide-react";
import { useFinnhubQuote } from "../hooks/useFinnhubQuote";
import { MARKET_SYMBOLS } from "@/lib/data/market-symbols";
import { Sparkline } from "./sparkline";

function MarketCard({
  symbol,
  name,
  category,
}: {
  symbol: string;
  name: string;
  category: string;
}) {
  const { data, loading } = useFinnhubQuote(symbol, name);

  if (loading) {
    return (
      <div className="bg-gray-100/80 border-none dark:bg-muted-foreground/5 rounded-lg h-50 p-4 flex flex-col justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-28 bg-zinc-200/50 dark:bg-zinc-800" />
          <Skeleton className="h-3 w-20 bg-zinc-200/50 dark:bg-zinc-800" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-6 w-16 bg-zinc-200/50 dark:bg-zinc-800" />
          <Skeleton className="h-6 w-full bg-zinc-200/50 dark:bg-zinc-800" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="border-none bg-gray-100/80 dark:bg-muted-foreground/5 rounded-2xl h-50 p-4 flex flex-col justify-center items-center">
        <p className="text-xs text-slate-400 dark:text-white font-medium">
          Failed to load {name}
        </p>
      </Card>
    );
  }

  // Fallback status check: Use data.isClosed or data.status if available
  const isClosed = data.isClosed;

  return (
    <div className="bg-gray-100/80 dark:bg-zinc-800 h-50 overflow-hidden m-0 p-0 rounded-lg cursor-pointer transition-colors hover:bg-gray-200/80 dark:hover:bg-zinc-700/50">
      <div className="flex flex-col justify-between h-48 m-0 p-0">
        {/* Header */}

        <div className="flex flex-col">
          <div className="flex items-center justify-between w-full ">
            <span className="m-2 border w-fit ml-auto rounded-full shrink-0 text-[10px] uppercase text-zinc-500 dark:text-zinc-200 bg-white dark:font-thin dark:bg-zinc-700 px-1.5 py-0.5 whitespace-nowrap">
              15min delay
            </span>
          </div>
          <div className="flex items-start justify-between mx-3.5">
            <h3 className="roboto-mono font-semibold line-clamp-2 text-zinc-800 dark:text-zinc-200 text-lg tracking-tight text-wrap leading-tight">
              {data.name}
            </h3>
          </div>
          <p className="text-zinc-500 text-sm mx-4 font-semibold">
            {data.value} <span className="text-zinc-400">({data.change})</span>
          </p>{" "}
        </div>

        {/* Performance & Graph */}
        <div>
          <div className="flex items-center justify-end gap-1.5 font-semibold text-xl mx-2">
            <span
              className={`${data.isPositive ? "text-emerald-700" : "text-[#cf0000]"}`}
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
          </div>

          {/* Curved Dynamic Sparkline */}
          <Sparkline
            points={data.history}
            isPositive={data.isPositive}
            isClosed={data.isClosed}
          />
        </div>
      </div>
    </div>
  );
}

export default function MarketOverview() {
  const categories = Object.keys(
    MARKET_SYMBOLS,
  ) as (keyof typeof MARKET_SYMBOLS)[];

  const [activeTab, setActiveTab] = useState<keyof typeof MARKET_SYMBOLS>("US");

  return (
    <div className="w-full max-w-6xl pt-7 px-4">
      {/* Tab Navigation Menu */}
      <div className="flex gap-2 flex-wrap mb-4 justify-start">
        {categories.slice(0, 4).map((category, idx) => {
          const isActive = activeTab === category;

          return (
            <button
              key={category}
              onClick={() => setActiveTab(category)}
              className={`px-4 py-1.5 rounded-full uppercase text-sm font-semibold transition-all cursor-pointer border dark:text-zinc-300 ${
                isActive
                  ? "bg-zinc-100 text-zinc-900 border-zinc-300 dark:bg-zinc-800/50 dark:text-white dark:border-zinc-700/50"
                  : "bg-transparent font-medium text-zinc-500 border-transparent hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* Grid Content for Active Tab */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {MARKET_SYMBOLS[activeTab]?.slice(0, 20).map((item) => (
          <MarketCard
            key={item.symbol}
            symbol={item.symbol}
            name={item.name}
            category={activeTab}
          />
        ))}
      </div>
    </div>
  );
}
