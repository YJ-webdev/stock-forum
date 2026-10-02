"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { setAiBriefEnabled } from "@/app/actions/ai-market-brief";

interface AiBriefMarket {
  id: string;
  symbol: string;
  displaySymbol: string | null;
  name: string;
  category: string;
  assetType: string;
  aiBriefEnabled: boolean;

  aiBrief: {
    lastCheckedAt: Date | null;
    publishedAt: Date;
  } | null;
}

interface AiBriefMarketManagerProps {
  markets: AiBriefMarket[];
}

const NAV_ITEMS = [
  {
    key: "America",
    label: "America",
  },
  {
    key: "Asia",
    label: "Asia",
  },
  {
    key: "Europe",
    label: "Europe",
  },
  {
    key: "Middle_East",
    label: "Middle East",
  },
  {
    key: "Africa",
    label: "Africa",
  },
  {
    key: "crypto",
    label: "Crypto",
  },
  {
    key: "currency",
    label: "Currency",
  },
  {
    key: "commodity",
    label: "commodity",
  },
] as const;

type NavKey = (typeof NAV_ITEMS)[number]["key"];

export function AiBriefMarketManager({ markets }: AiBriefMarketManagerProps) {
  const [items, setItems] = useState(markets);
  const [activeTab, setActiveTab] = useState<NavKey>("America");

  const filteredMarkets = useMemo(() => {
    return items.filter((market) => {
      // Regional markets
      if (
        activeTab === "America" ||
        activeTab === "Asia" ||
        activeTab === "Europe" ||
        activeTab === "Middle_East" ||
        activeTab === "Africa"
      ) {
        return market.category === activeTab;
      }

      // Global assets are grouped by asset type instead of "Global".
      return market.category === "Global" && market.assetType === activeTab;
    });
  }, [items, activeTab]);

  const totalEnabledCount = useMemo(() => {
    return items.filter((market) => market.aiBriefEnabled).length;
  }, [items]);

  const activeEnabledCount = useMemo(() => {
    return filteredMarkets.filter((market) => market.aiBriefEnabled).length;
  }, [filteredMarkets]);

  const getTabCount = (key: NavKey) => {
    return items.filter((market) => {
      if (
        key === "America" ||
        key === "Asia" ||
        key === "Europe" ||
        key === "Middle_East" ||
        key === "Africa"
      ) {
        return market.category === key && market.aiBriefEnabled;
      }

      return (
        market.category === "Global" &&
        market.assetType === key &&
        market.aiBriefEnabled
      );
    }).length;
  };

  const activeLabel =
    NAV_ITEMS.find((item) => item.key === activeTab)?.label ?? activeTab;

  return (
    <div className="space-y-5">
      {/* Navigation */}
      <div className="overflow-x-auto">
        <div className="flex min-w-max items-center gap-1 border-b">
          {NAV_ITEMS.map((nav) => {
            const isActive = activeTab === nav.key;
            const enabledCount = getTabCount(nav.key);

            return (
              <button
                key={nav.key}
                type="button"
                onClick={() => setActiveTab(nav.key)}
                className={`
                  relative
                  flex h-10
                  cursor-pointer
                  items-center gap-1.5
                  px-3
                  text-sm
                  transition-colors

                  ${
                    isActive
                      ? "font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }
                `}
              >
                <span>{nav.label}</span>

                {enabledCount > 0 && (
                  <span
                    className={`
                      flex min-w-5
                      items-center justify-center
                      rounded-full
                      px-1.5 py-0.5
                      text-[10px]
                      leading-none

                      ${
                        isActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }
                    `}
                  >
                    {enabledCount}
                  </span>
                )}

                {isActive && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Market list */}
      <div className="overflow-hidden rounded-xl border bg-background">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-sm font-medium">{activeLabel}</h2>

            <p className="mt-0.5 text-xs text-muted-foreground">
              Enabled markets will be checked every 3 hours.
            </p>
          </div>

          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {activeEnabledCount}
            </span>{" "}
            enabled
          </div>
        </div>

        {filteredMarkets.length > 0 ? (
          <div className="divide-y">
            {filteredMarkets.map((market) => (
              <MarketRow
                key={market.id}
                market={market}
                onChange={(enabled) => {
                  setItems((current) =>
                    current.map((item) =>
                      item.id === market.id
                        ? {
                            ...item,
                            aiBriefEnabled: enabled,
                          }
                        : item,
                    ),
                  );
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-32 items-center justify-center px-5 py-8">
            <p className="text-sm text-muted-foreground">
              No markets in this category.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end text-xs text-muted-foreground">
        <span>
          <strong className="font-medium text-foreground">
            {totalEnabledCount}
          </strong>{" "}
          markets enabled
        </span>
      </div>
    </div>
  );
}

interface MarketRowProps {
  market: AiBriefMarket;
  onChange: (enabled: boolean) => void;
}

function MarketRow({ market, onChange }: MarketRowProps) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    if (isPending) {
      return;
    }

    const nextEnabled = !market.aiBriefEnabled;

    // Optimistic update
    onChange(nextEnabled);

    startTransition(async () => {
      try {
        await setAiBriefEnabled(market.symbol, nextEnabled);
      } catch (error) {
        // Rollback
        onChange(!nextEnabled);

        console.error(error);

        toast.error("Failed to update AI Brief setting.");
      }
    });
  };

  return (
    <div
      className="
        flex min-h-16
        items-center justify-between
        gap-4 px-5 py-3
        transition-colors
        hover:bg-zinc-50
        dark:hover:bg-zinc-900/50
      "
    >
      {/* Market */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{market.name}</span>

          <span className="shrink-0 text-xs text-muted-foreground">
            {market.displaySymbol ?? market.symbol}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {market.aiBrief ? (
            <>
              <span>Brief available</span>

              {market.aiBrief.lastCheckedAt && (
                <>
                  <span>·</span>
                  <span>Previously checked</span>
                </>
              )}
            </>
          ) : (
            <span>No brief yet</span>
          )}
        </div>
      </div>

      {/* Toggle */}
      <button
        type="button"
        role="switch"
        aria-checked={market.aiBriefEnabled}
        aria-label={`AI Market Brief for ${market.name}`}
        disabled={isPending}
        onClick={handleToggle}
        className={`
          relative
          h-6 w-11
          shrink-0
          cursor-pointer
          rounded-full
          transition-colors
          disabled:cursor-default
          disabled:opacity-60

          ${
            market.aiBriefEnabled
              ? "bg-emerald-500"
              : "bg-zinc-200 dark:bg-zinc-700"
          }
        `}
      >
        <span
          className={`
            absolute top-0.5
            flex h-5 w-5
            items-center justify-center
            rounded-full
            bg-white
            shadow-sm
            transition-transform

            ${market.aiBriefEnabled ? "translate-x-5" : "translate-x-0.5"}
          `}
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />
          ) : (
            market.aiBriefEnabled && (
              <Check className="h-3 w-3 text-emerald-600" />
            )
          )}
        </span>
      </button>
    </div>
  );
}
