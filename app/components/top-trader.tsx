import { Crown, Ellipsis, TrendingUp } from "lucide-react";
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
    <div className="w-full px-2 flex flex-col">
      {/* Traders */}

      {TOP_TRADERS.map((trader, index) => (
        <Link
          key={trader.id}
          href={`/user/${trader.username}`}
          className="
              group flex items-center gap-3
              rounded-lg py-2
              transition-colors
              hover:bg-zinc-200 hover:dark:bg-zinc-800
            "
        >
          {/* Rank */}
          <div className="ml-2 flex w-2 jakarta shrink-0 justify-center">
            <span className="text-[13px] font-medium text-zinc-500">
              {index + 1}
            </span>
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
            <p className="truncate text-[15px] font-medium text-zinc-800 dark:text-zinc-200">
              {trader.username}
            </p>

            <div className="mt-0.5 flex items-center gap-1 text-[12px] text-zinc-500">
              {/* <TrendingUp className="h-3 w-3" /> */}

              <span>{trader.accuracy}% accuracy</span>
            </div>
          </div>

          {/* Points */}
          <div className="shrink-0 text-right mr-4">
            <p className="text-[14px] font-normal jakarta text-zinc-800 dark:text-zinc-300">
              {trader.points.toLocaleString()}
            </p>

            <p className="text-[11px] text-zinc-600">pts</p>
          </div>
        </Link>
      ))}
      <button className="cursor-pointer mx-auto text-zinc-400 dark:text-zinc-600 mt-3 hover:text-zinc-900 dark:hover:text-zinc-200">
        <Ellipsis className="mx-auto h-4 w-4" />
      </button>
      {/* My rank */}
      <div className=" text-zinc-800 dark:text-zinc-300 pt-3">
        <Link
          href="/account"
          className="
      group flex items-center gap-3
      rounded-lg px-2 py-3
      transition-colors
      hover:bg-zinc-200 dark:hover:bg-zinc-800
    "
        >
          <div className="flex w-2 shrink-0 justify-center">
            <span className="text-[13px] jakarta">127</span>
          </div>

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

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-[14px] ">YJ-webdev</p>

              <span className="text-[11px] text-zinc-500">You</span>
            </div>

            <div className="mt-0.5 flex items-center gap-1 text-[12px] text-zinc-500">
              <span>58.6% accuracy</span>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[14px] ">640</p>

            <p className="text-[11px] text-zinc-600">pts</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
