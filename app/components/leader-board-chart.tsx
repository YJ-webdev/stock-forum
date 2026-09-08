"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getTopBetters, LeaderboardUser } from "@/app/actions/leaderboard";

export function LeaderboardChart() {
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      const data = await getTopBetters(5);
      setLeaders(data);
      setIsLoading(false);
    }
    loadLeaderboard();
  }, []);

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground p-4">
        Loading leaderboard...
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">Top Traders</h3>
        <span className="text-xs text-muted-foreground">Ranked by Profit</span>
      </div>

      <div className="flex flex-col gap-3">
        {leaders.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs w-4 text-muted-foreground">
                #{user.rank}
              </span>
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.image || ""} />
                <AvatarFallback>{user.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium text-xs">{user.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {user.winRate}% Win Rate
                </span>
              </div>
            </div>
            <span className="font-mono text-xs font-semibold text-emerald-500">
              +${user.totalProfit.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
