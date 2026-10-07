"use client";

import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import type { LeaderboardUser } from "@/app/actions/leaderboard";
import { useCurrentUser } from "../context/user-context";

type User = {
  id: string;
};

interface LeaderBoardProps {
  traders: LeaderboardUser[];
  user: User | null;
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 1)
    .toUpperCase();
}

export function LeaderBoard({ traders, user }: LeaderBoardProps) {
  return (
    <div className="flex w-full flex-col">
      <p className="mb-2 px-4 pt-4 text-xs font-normal tracking-wider text-muted-foreground/50 truncate">
        Leaderboard
      </p>

      <div className="flex w-full flex-col px-2">
        {traders.map((trader) => (
          <div
            key={trader.id}
            // href={`/user/${trader.id}`}
            className="
             group
              flex
              items-center
              gap-3
              rounded-lg
              py-1.5
              transition-colors
              hover:bg-zinc-100
              dark:hover:bg-zinc-800
            "
          >
            <div className="jakarta ml-2 flex w-2 shrink-0 justify-center">
              <span className="text-[13px] font-medium text-zinc-500">
                {trader.rank}
              </span>
            </div>

            <Avatar className="size-9 shrink-0 lg:grayscale lg:opacity-50 lg:group-hover:grayscale-0 lg:group-hover:opacity-100">
              <AvatarImage src={trader.image ?? undefined} alt={trader.name} />

              <AvatarFallback className="text-[11px] font-semibold">
                {getInitials(trader.name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-normal text-zinc-800 dark:font-light dark:text-zinc-200">
                {trader.name}
                {trader.id === user?.id && (
                  <span className="text-[11px] ml-2 text-zinc-100 px-1.5 py-0.5 rounded-full bg-olive-700">
                    Me
                  </span>
                )}
              </p>

              <div className="mt-0.5 flex items-center gap-1 text-[12px] text-zinc-500">
                <span className="truncate">
                  {trader.winRate.toFixed(1)}% accuracy
                </span>
              </div>
            </div>

            <div className="mr-4 shrink-0 text-right">
              <p className="jakarta text-[14px] font-normal text-zinc-800 dark:text-zinc-300">
                {trader.points.toLocaleString()}
              </p>

              <p className="text-[11px] text-zinc-500 dark:text-zinc-600">
                pts
              </p>
            </div>
          </div>
        ))}

        {traders.length === 0 && (
          <div className="flex h-32 items-center justify-center text-sm text-zinc-400 dark:text-zinc-600">
            No ranked traders yet.
          </div>
        )}

        {/* {traders.length > 0 && (
          <button
            type="button"
            aria-label="View more traders"
            className="
              mx-auto
              mt-3
              cursor-pointer
              text-zinc-400
              hover:text-zinc-900
              dark:text-zinc-600
              dark:hover:text-zinc-200
            "
          >
            <Ellipsis className="mx-auto size-4" />
          </button>
        )} */}
      </div>
    </div>
  );
}
