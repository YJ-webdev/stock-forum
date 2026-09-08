"use client";

import { useEffect, useState } from "react";
import {
  getCountryLeaderboard,
  CountryLeaderboardItem,
} from "@/app/actions/country-leaderboard";
import { getCountryFlagEmoji } from "@/lib/utils/flag";

export function CountryLeaderboard() {
  const [countries, setCountries] = useState<CountryLeaderboardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const data = await getCountryLeaderboard(5);
      setCountries(data);
      setIsLoading(false);
    }
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="text-xs text-muted-foreground p-4">
        Loading country rankings...
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">Country Rankings</h3>
        <span className="text-xs text-muted-foreground">By Total Earnings</span>
      </div>

      <div className="flex flex-col gap-3">
        {countries.map((item) => (
          <div
            key={item.countryCode}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs w-4 text-muted-foreground">
                #{item.rank}
              </span>
              <span className="text-lg leading-none">
                {getCountryFlagEmoji(item.countryCode)}
              </span>
              <div className="flex flex-col">
                <span className="font-medium text-xs">{item.countryName}</span>
                <span className="text-[10px] text-muted-foreground">
                  {item.traderCount} Traders
                </span>
              </div>
            </div>
            <span className="font-mono text-xs font-semibold text-emerald-500">
              +${item.totalProfit.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
