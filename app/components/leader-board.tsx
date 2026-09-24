"use client";

import { Ellipsis } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import type { LeaderboardUser } from "@/app/actions/leaderboard";

interface LeaderBoardProps {
  traders: LeaderboardUser[];
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function LeaderBoard({ traders }: LeaderBoardProps) {
  return (
    <div className="flex w-full flex-col px-2">
      {/* Traders */}
      {traders.map((trader) => (
        <Link
          key={trader.id}
          href={`/user/${trader.id}`}
          className="
            group flex items-center gap-3
            rounded-lg py-2
            transition-colors
            hover:bg-zinc-100
            dark:hover:bg-zinc-800
          "
        >
          {/* Rank */}
          <div className="jakarta ml-2 flex w-2 shrink-0 justify-center">
            <span className="text-[13px] font-medium text-zinc-500">
              {trader.rank}
            </span>
          </div>

          {/* Avatar */}
          <Avatar className="size-9 shrink-0">
            <AvatarImage src={trader.image ?? undefined} alt={trader.name} />

            <AvatarFallback className="text-[11px] font-semibold">
              {getInitials(trader.name)}
            </AvatarFallback>
          </Avatar>

          {/* User */}
          <div className="min-w-0 flex-1">
            <p
              className="
                truncate text-[15px] font-normal
                text-zinc-800
                dark:font-light dark:text-zinc-200
              "
            >
              {trader.name}
            </p>

            <div className="mt-0.5 flex items-center gap-1 text-[12px] text-zinc-500">
              <span className="truncate">
                {trader.winRate.toFixed(1)}% accuracy
              </span>
            </div>
          </div>

          {/* Points */}
          <div className="mr-4 shrink-0 text-right">
            <p className="jakarta text-[14px] font-normal text-zinc-800 dark:text-zinc-300">
              {trader.points.toLocaleString()}
            </p>

            <p className="text-[11px] text-zinc-500 dark:text-zinc-600">pts</p>
          </div>
        </Link>
      ))}

      {/* Empty */}
      {traders.length === 0 && (
        <div className="flex h-32 items-center justify-center text-sm text-zinc-400 dark:text-zinc-600">
          No ranked traders yet
        </div>
      )}

      {/* More */}
      {traders.length > 0 && (
        <button
          type="button"
          aria-label="View more traders"
          className="
            mx-auto mt-3 cursor-pointer
            text-zinc-400
            hover:text-zinc-900
            dark:text-zinc-600
            dark:hover:text-zinc-200
          "
        >
          <Ellipsis className="mx-auto size-4" />
        </button>
      )}
    </div>
  );
}
