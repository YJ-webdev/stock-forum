"use client";

import { User, Cat, Smile, Zap, Crown } from "lucide-react";

export function LeaderboardChart() {
  const players = [
    {
      rank: "01",
      name: "ApexPredictor",
      profit: "+$342,900",
      rate: "+78.4%",
      icon: Crown,
      iconBg: "bg-zinc-900 text-amber-400 dark:bg-zinc-100 dark:text-amber-500",
    },
    {
      rank: "02",
      name: "HighRoller99",
      profit: "+$289,150",
      rate: "+72.1%",
      icon: Zap,
      iconBg: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    },
    {
      rank: "03",
      name: "LuckyStrike_X",
      profit: "+$210,400",
      rate: "+68.9%",
      icon: Cat,
      iconBg: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    },
    {
      rank: "04",
      name: "VegasWhale",
      profit: "+$184,000",
      rate: "+65.3%",
      icon: Smile,
      iconBg: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    },
    {
      rank: "05",
      name: "OddsMaster",
      profit: "+$145,220",
      rate: "+61.7%",
      icon: User,
      iconBg: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    },
  ];

  return (
    <div className="w-2xs py-2">
      {/* Header */}
      <div className="flex justify-between items-center px-3">
        <p className="text-muted-foreground text-xs text-light tracking-wider uppercase">
          top bettors
        </p>
        {/* <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Real-time
          </span>
        </div> */}
      </div>

      {/* List */}
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
        {players.map((p) => {
          const IconComponent = p.icon;

          return (
            <div
              key={p.rank}
              className="py-2.5 px-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
            >
              {/* Rank, Icon Avatar, Name */}
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="text-xs font-semibold tabular-nums text-zinc-400 dark:text-zinc-500 w-5">
                  {p.rank}
                </span>

                {/* 이모티콘/아이콘 아바타 */}
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border border-zinc-200/60 dark:border-zinc-700/50 ${p.iconBg}`}
                >
                  <IconComponent className="h-4 w-4" />
                </div>

                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {p.name}
                </span>
              </div>

              {/* Profit & Rate Numbers */}
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {p.profit}
                </div>
                <div className="text-[11px] font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                  {p.rate}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
