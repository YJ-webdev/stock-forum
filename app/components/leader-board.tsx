"use client";

import { useId, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import type { LeaderboardUser } from "@/app/actions/leaderboard";

import { ProfileCard } from "./profile-card";

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
  return Array.from(name.trim())[0]?.toUpperCase() ?? "?";
}

export function LeaderBoard({ traders, user }: LeaderBoardProps) {
  const headingId = useId();

  const [openProfile, setOpenProfile] = useState<string | null>(null);

  const language = resolveLanguage(user?.language);
  const labels = LEADERBOARD_LABELS[language];

  function handleOpenChange(key: string, open: boolean) {
    setOpenProfile((current) =>
      open ? key : current === key ? null : current,
    );
  }

  return (
    <section
      aria-labelledby={headingId}
      className="flex h-full min-h-0 w-full flex-col overflow-hidden pt-3.5"
    >
      <h2 id={headingId} className="sr-only">
        {labels.title}
      </h2>

      <p
        aria-hidden="true"
        className="
          shrink-0 truncate px-4 pb-1
          text-xs font-normal tracking-wider
          text-muted-foreground/50
        "
      >
        {labels.title}
      </p>

      <div
        className={`
    flex min-h-0 w-full flex-1 flex-col
    overflow-x-hidden px-2.25
    scrollbar-gutter-stable
    ${openProfile ? "overflow-y-hidden" : "overflow-y-auto"}
  `}
      >
        {traders.map((trader) => {
          const isMe = trader.id === user?.id;

          const avatarKey = `${trader.id}:avatar`;
          const nameKey = `${trader.id}:name`;

          return (
            <div
              key={trader.id}
              className={`
                group flex items-center gap-3 rounded-lg py-1.75
                transition-colors
                hover:bg-zinc-100 dark:hover:bg-zinc-800
                ${isMe ? "bg-zinc-100 dark:bg-zinc-800" : ""}
              `}
            >
              {/* Rank */}
              <div className="jakarta ml-1.5 flex w-2 shrink-0 justify-center">
                <span className="text-[13px] font-medium text-zinc-500">
                  {trader.rank}
                </span>
              </div>

              {/* Avatar */}
              <Popover
                modal={false}
                open={openProfile === avatarKey}
                onOpenChange={(open) => handleOpenChange(avatarKey, open)}
              >
                <PopoverTrigger
                  aria-label={trader.name}
                  className="
                    size-9 shrink-0 cursor-pointer rounded-full
                    focus-visible:outline-none
                    focus-visible:ring-2 focus-visible:ring-zinc-400
                    focus-visible:ring-offset-2
                  "
                >
                  <Avatar
                    className={`
                      size-9
                      ${
                        isMe
                          ? "opacity-100 grayscale-0"
                          : `
                            lg:opacity-50 lg:grayscale
                            lg:group-hover:opacity-100
                            lg:group-hover:grayscale-0
                            lg:group-focus-within:opacity-100
                            lg:group-focus-within:grayscale-0
                          `
                      }
                    `}
                  >
                    <AvatarImage
                      src={trader.image ?? undefined}
                      alt=""
                      className="object-cover"
                    />

                    <AvatarFallback className="bg-olive-500 text-[22px] font-normal text-white">
                      {getInitials(trader.name)}
                    </AvatarFallback>
                  </Avatar>
                </PopoverTrigger>

                <PopoverContent
                  align="start"
                  side="bottom"
                  sideOffset={8}
                  className="w-80 max-w-[calc(100vw-2rem)] rounded-xl p-0"
                >
                  <ProfileCard
                    userId={trader.id}
                    name={trader.name}
                    image={trader.image}
                    currentUserId={user?.id}
                    language={user?.language}
                  />
                </PopoverContent>
              </Popover>

              {/* Name / accuracy */}
              <div className="min-w-0 flex-1">
                <Popover
                  modal={false}
                  open={openProfile === nameKey}
                  onOpenChange={(open) => handleOpenChange(nameKey, open)}
                >
                  <PopoverTrigger
                    className="
                      flex w-full min-w-0 cursor-pointer
                      items-center gap-2 rounded-sm text-start
                      focus-visible:outline-none
                      focus-visible:ring-2 focus-visible:ring-zinc-400
                    "
                  >
                    <span
                      className="
                        min-w-0 truncate text-[15px] font-normal
                        text-zinc-800 hover:underline
                        dark:font-light dark:text-zinc-200
                      "
                    >
                      {trader.name}
                    </span>

                    {isMe && (
                      <span
                        className="
                          shrink-0 rounded-full bg-olive-700
                          px-1.5 py-0.5 text-[11px] text-zinc-100
                        "
                      >
                        {labels.me}
                      </span>
                    )}
                  </PopoverTrigger>

                  <PopoverContent
                    align="start"
                    side="bottom"
                    sideOffset={8}
                    className="w-80 max-w-[calc(100vw-2rem)] rounded-xl p-0"
                  >
                    <ProfileCard
                      userId={trader.id}
                      name={trader.name}
                      image={trader.image}
                      currentUserId={user?.id}
                      language={user?.language}
                    />
                  </PopoverContent>
                </Popover>

                <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[12px] text-zinc-500">
                  <span className="truncate">
                    {labels.accuracy} {trader.winRate.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Points */}
              <div className="mr-3 shrink-0 text-right">
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
