"use client";

import { MarketAssetClient } from "../data/type";

// Friendly display names map based on DB symbol keys
const INDEX_NAMES: Record<string, string> = {
  US500: "S&P 500",
  US100: "Nasdaq 100",
  DJI: "Dow Jones Industrial",
};

export function MarketIndexTable({
  marketData,
}: {
  marketData: MarketAssetClient[];
}) {
  // Filter SSE market data for the target index symbols
  const indices = marketData.filter((item) =>
    ["US500", "US100", "DJI"].includes(item.symbol),
  );

  return (
    <div className="w-2xs">
      {/* Upper Bar */}
      <div className="flex justify-between items-center mb-3 px-3">
        <p className="text-muted-foreground text-xs text-light tracking-wider uppercase">
          market indices
        </p>

        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Real-time
          </span>
        </div>
      </div>

      {/* Header Row */}
      <div className="grid grid-cols-12 px-3 py-1 text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
        <span className="col-span-4">Index</span>
        <span className="col-span-3 text-right">Previous</span>
        <span className="col-span-3 text-right">Today</span>
        <span className="col-span-2 text-right"> %</span>
      </div>

      {/* List Rows */}
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
        {indices.map((item) => {
          const currentPrice = item.price ?? item.lastPrice ?? 0;
          const change = item.change ?? 0;
          const previousPrice = currentPrice - change;
          const changePercent = item.changePercent ?? 0;
          const isNegative = change < 0;

          return (
            <div
              key={item.symbol}
              className="grid grid-cols-12 px-3 py-2.5 items-center hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
            >
              {/* Index Symbol & Name */}
              <div className="col-span-4 min-w-0">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {item.symbol}
                </div>
                <div className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                  {INDEX_NAMES[item.symbol] || item.symbol}
                </div>
              </div>

              {/* Previous Price */}
              <div className="col-span-3 text-right text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
                {previousPrice
                  ? previousPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : "0.00"}
              </div>

              {/* Today Price */}
              <div className="col-span-3 text-right text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                {currentPrice
                  ? currentPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : "0.00"}
              </div>

              {/* Change % */}
              <div
                className={`col-span-2 text-right text-xs font-semibold tabular-nums ${
                  isNegative
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {isNegative ? "" : "+"}
                {changePercent.toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
