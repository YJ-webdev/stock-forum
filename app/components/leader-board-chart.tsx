"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getTopBetters, LeaderboardUser } from "@/app/actions/leaderboard";
import { Numeric } from "./numeric";

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
    <div className="">
      <div className="flex flex-col gap-3 py-4">
        {leaders.map((user) => (
          <div key={user.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* <span className="font-mono text-xs w-4 text-muted-foreground">
                #{user.rank}
              </span> */}
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.image || ""} />
                <AvatarFallback>{user.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="">{user.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {user.winRate}% Win Rate
                </span>
              </div>
            </div>
            <Numeric className=" font-medium  text-emerald-700 dark:text-emerald-600">
              +{user.totalProfit.toLocaleString()}
            </Numeric>
          </div>
        ))}
      </div>
    </div>
  );
}
