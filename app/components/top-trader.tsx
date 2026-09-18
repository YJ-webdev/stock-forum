import { Crown, TrendingUp } from "lucide-react";
import Link from "next/link";

const TOP_TRADERS = [
  {
    id: "1",
    username: "marketking",
    avatar: "MK",
    accuracy: 78.4,
    points: 2840,
  },
  {
    id: "2",
    username: "bullrunner",
    avatar: "BR",
    accuracy: 74.1,
    points: 2315,
  },
  {
    id: "3",
    username: "tokyotrader",
    avatar: "TT",
    accuracy: 71.8,
    points: 1980,
  },
  {
    id: "4",
    username: "macroview",
    avatar: "MV",
    accuracy: 69.2,
    points: 1725,
  },
  {
    id: "5",
    username: "chartist",
    avatar: "CH",
    accuracy: 67.9,
    points: 1540,
  },
];

export function TopTraders() {
  return (
    <div className="w-full px-5">
      {/* Header */}
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-[15px] font-semibold text-zinc-200">Top traders</p>
          <p className="mt-0.5 text-[12px] text-zinc-500">
            Best performers this week
          </p>
        </div>

        <Link
          href="/leaderboard"
          className="text-[12px] text-zinc-500 transition-colors hover:text-zinc-300"
        >
          View all
        </Link>
      </div>

      {/* Traders */}
      <div>
        {TOP_TRADERS.map((trader, index) => (
          <Link
            key={trader.id}
            href={`/user/${trader.username}`}
            className="
              group flex items-center gap-3
              rounded-lg px-2 py-3
              transition-colors
              hover:bg-zinc-800/50
            "
          >
            {/* Rank */}
            <div className="flex w-5 shrink-0 justify-center">
              {index === 0 ? (
                <Crown className="h-4 w-4 text-amber-400" />
              ) : (
                <span className="text-[13px] font-medium text-zinc-500">
                  {index + 1}
                </span>
              )}
            </div>

            {/* Avatar */}
            <div
              className="
                flex h-9 w-9 shrink-0 items-center justify-center
                rounded-full bg-zinc-800
                text-[11px] font-semibold text-zinc-300
                ring-1 ring-inset ring-zinc-700/70
              "
            >
              {trader.avatar}
            </div>

            {/* User */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-zinc-200">
                {trader.username}
              </p>

              <div className="mt-0.5 flex items-center gap-1 text-[12px] text-zinc-500">
                <TrendingUp className="h-3 w-3" />

                <span>{trader.accuracy}% accuracy</span>
              </div>
            </div>

            {/* Points */}
            <div className="shrink-0 text-right">
              <p className="text-[14px] font-medium text-zinc-300">
                {trader.points.toLocaleString()}
              </p>

              <p className="text-[11px] text-zinc-600">pts</p>
            </div>
          </Link>
        ))}
      </div>
      {/* My rank */}
      <div className="mt-3 border-t border-zinc-800 pt-3">
        <Link
          href="/account"
          className="
      group flex items-center gap-3
      rounded-lg px-2 py-3
      transition-colors
      hover:bg-zinc-800/50
    "
        >
          {/* Rank */}
          <div className="flex w-5 shrink-0 justify-center">
            <span className="text-[13px] font-semibold text-zinc-300">127</span>
          </div>

          {/* Avatar */}
          <div
            className="
        flex h-9 w-9 shrink-0 items-center justify-center
        rounded-full bg-zinc-700
        text-[11px] font-semibold text-zinc-200
        ring-1 ring-inset ring-zinc-600
      "
          >
            YJ
          </div>

          {/* User */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-[14px] font-medium text-zinc-200">
                YJ-webdev
              </p>

              <span className="text-[11px] text-zinc-500">You</span>
            </div>

            <div className="mt-0.5 flex items-center gap-1 text-[12px] text-zinc-500">
              <TrendingUp className="h-3 w-3" />
              <span>58.6% accuracy</span>
            </div>
          </div>

          {/* Points */}
          <div className="shrink-0 text-right">
            <p className="text-[14px] font-medium text-zinc-300">640</p>

            <p className="text-[11px] text-zinc-600">pts</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
