// components/categorized-market-banner.tsx
import React from "react";
import { MARKET_ITEMS, MarketItem } from "../../lib/data/market-item";

export function MarketCardList() {
  // Group items by category and sort by priority
  const categories = Array.from(
    new Set(MARKET_ITEMS.map((item) => item.category)),
  );

  const groupedItems = categories.map((category) => ({
    category,
    items: MARKET_ITEMS.filter((item) => item.category === category).sort(
      (a, b) => a.priority - b.priority,
    ),
  }));

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      {groupedItems.map(({ category, items }) => (
        <div key={category} className="space-y-3">
          {/* Category Header */}
          <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <h3 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {category}
            </h3>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
              {items.length}
            </span>
          </div>

          {/* Items Banner Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {items.map((item: MarketItem) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
                      Priority #{item.priority}
                    </div>
                  </div>
                </div>

                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                  {item.price}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
