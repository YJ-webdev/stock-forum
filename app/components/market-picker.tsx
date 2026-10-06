"use client";

import { Check } from "lucide-react";

import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";
import { MAX_WATCHLIST_MARKETS } from "@/lib/constants/watchlist";

interface MarketPickerProps {
  selectedSymbols: string[];
  onToggle: (symbol: string) => void;
  existingSymbols?: string[];
  disabled?: boolean;
}

const MARKET_GROUPS = Object.entries(
  ALL_MARKET_SYMBOLS.reduce<
    Record<string, Record<string, typeof ALL_MARKET_SYMBOLS>>
  >((groups, asset) => {
    const group =
      asset.region.toLowerCase() === "global" ? asset.assetType : asset.region;

    if (!groups[group]) {
      groups[group] = {};
    }

    if (!groups[group][asset.assetType]) {
      groups[group][asset.assetType] = [];
    }

    groups[group][asset.assetType].push(asset);

    return groups;
  }, {}),
);

export function MarketPicker({
  selectedSymbols,
  onToggle,
  existingSymbols = [],
  disabled = false,
}: MarketPickerProps) {
  const existingSet = new Set(existingSymbols);
  const selectedSet = new Set(selectedSymbols);
  const totalCount = new Set([...existingSymbols, ...selectedSymbols]).size;

  const limitReached = selectedSet.size >= MAX_WATCHLIST_MARKETS;

  return (
    <div className="space-y-8">
      {MARKET_GROUPS.map(([region, assetTypes]) => (
        <section key={region}>
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {region.replace(/_/g, " ")}
          </h3>

          <div className="space-y-5">
            {Object.entries(assetTypes).map(([assetType, assets]) => (
              <div key={assetType} className="grid grid-cols-2 gap-2">
                {assets.map((asset) => {
                  const existing = existingSymbols.includes(asset.symbol);
                  const selected = selectedSet.has(asset.symbol);

                  const itemDisabled = disabled || (limitReached && !selected);

                  return (
                    <button
                      key={asset.symbol}
                      type="button"
                      aria-pressed={selected}
                      disabled={itemDisabled}
                      onClick={() => {
                        if (!itemDisabled) {
                          onToggle(asset.symbol);
                        }
                      }}
                      className={`flex min-h-10 min-w-0 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 ${
                        selected
                          ? "border-zinc-400 bg-zinc-100 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                          : "border-zinc-200 bg-transparent text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
                      }`}
                    >
                      <span className="min-w-0 truncate" title={asset.name}>
                        {asset.name}
                      </span>

                      {selected && (
                        <span className="flex shrink-0 items-center gap-1">
                          {existing && (
                            <span className="text-[10px]">Added</span>
                          )}

                          <Check
                            className="size-3.5"
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
