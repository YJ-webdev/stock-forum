"use client";

import { useId } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { LeaderboardUser } from "@/app/actions/leaderboard";

import { resolveLanguage } from "@/lib/data/languages";
import { LEADERBOARD_LABELS } from "@/lib/data/translations";

interface LeaderBoardProps {
  traders: LeaderboardUser[];
  user: {
    id: string;
    language?: string | null;
  } | null;
}

function getInitials(name: string) {
  return name.trim().slice(0, 1).toUpperCase();
}

export function LeaderBoard({ traders, user }: LeaderBoardProps) {
  const headingId = useId();
  const language = resolveLanguage(user?.language);
  const labels = LEADERBOARD_LABELS[language];

  return (
    <section aria-labelledby={headingId} className="flex w-full flex-col">
      <h2 id={headingId} className="sr-only">
        {labels.title}
      </h2>

      <p
        aria-hidden="true"
        className="truncate px-4 pt-4 text-xs font-normal tracking-wider text-muted-foreground/50"
      >
        {labels.title}
      </p>

      <div className="flex w-full flex-col px-2">
        {traders.map((trader) => {
          const isMe = trader.id === user?.id;

          return (
            <div
              key={trader.id}
              className={`
                group flex items-center gap-3 rounded-lg py-1.75
                transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800
                ${isMe ? "bg-zinc-100 dark:bg-zinc-800" : ""}
              `}
            >
              <div className="jakarta ml-2 flex w-2 shrink-0 justify-center">
                <span className="text-[13px] font-medium text-zinc-500">
                  {trader.rank}
                </span>
              </div>

              <Avatar
                aria-hidden="true"
                className={`
                  size-9 shrink-0
                  ${
                    isMe
                      ? "opacity-100 grayscale-0"
                      : "lg:opacity-50 lg:grayscale lg:group-hover:opacity-100 lg:group-hover:grayscale-0"
                  }
                `}
              >
                <AvatarImage src={trader.image ?? undefined} alt="" />

                <AvatarFallback className="text-[11px] font-semibold">
                  {getInitials(trader.name)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-normal text-zinc-800 dark:font-light dark:text-zinc-200">
                  {trader.name}

                  {isMe && (
                    <span className="ml-2 rounded-full bg-olive-700 px-1.5 py-0.5 text-[11px] text-zinc-100">
                      {labels.me}
                    </span>
                  )}
                </p>

                <div className="mt-0.5 flex items-center gap-1 text-[12px] text-zinc-500">
                  <span className="truncate">
                    {labels.accuracy} {trader.winRate.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="mr-4 shrink-0 text-right">
                <p className="jakarta text-[14px] font-normal text-zinc-800 dark:text-zinc-300">
                  {trader.points.toLocaleString(language)}
                </p>

                <p className="text-[11px] text-zinc-500 dark:text-zinc-600">
                  {labels.points}
                </p>
              </div>
            </div>
          );
        })}

        {traders.length === 0 && (
          <div className="flex h-32 items-center justify-center text-sm text-zinc-400 dark:text-zinc-600">
            {labels.empty}
          </div>
        )}
      </div>
    </section>
  );
}
