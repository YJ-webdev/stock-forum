"use client";

import Link from "next/link";
import {
  MessageCircle,
  TrendingUp,
  Globe,
  Coins,
  Rocket,
  LineChart,
  BookOpen,
  HelpCircle,
  Zap,
  LifeBuoy,
  ChevronRight,
  Flame,
} from "lucide-react";
import { DUMMY_FORUMS, ForumItem } from "../data/dummy";

// Icon mapping helper
const ICON_MAP: Record<string, React.ElementType> = {
  MessageCircle,
  TrendingUp,
  Globe,
  Coins,
  Rocket,
  LineChart,
  BookOpen,
  HelpCircle,
  Zap,
  LifeBuoy,
};

function ForumCard({ forum }: { forum: ForumItem }) {
  const IconComponent = ICON_MAP[forum.iconName] || MessageCircle;

  return (
    <Link
      href={forum.href}
      className="group flex items-center justify-between p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-card hover:bg-zinc-50 dark:hover:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200"
    >
      <div className="flex items-start gap-3 min-w-0 pr-2">
        {/* Category Icon Badge */}
        <div className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center shrink-0 border border-zinc-200/50 dark:border-zinc-700/50 text-zinc-700 dark:text-zinc-300 group-hover:text-primary group-hover:border-primary/30 transition-colors">
          <IconComponent className="h-4 w-4" />
        </div>

        {/* Name, Description & Status */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
              {forum.name}
            </h4>

            {/* Hot Channel Badge */}
            {forum.isHot && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full shrink-0">
                <Flame className="h-2.5 w-2.5 fill-amber-500" />
                HOT
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {forum.description}
          </p>
        </div>
      </div>

      {/* Activity Stats & Arrow */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex flex-col items-end text-xs">
          <span className="font-semibold text-foreground">
            +{forum.postCountToday}
          </span>
          <span className="text-[10px] text-muted-foreground">today</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
}

export function ForumList() {
  return (
    <div className="flex flex-col gap-2">
      {DUMMY_FORUMS.slice(0, 3).map((forum) => (
        <ForumCard key={forum.id} forum={forum} />
      ))}
    </div>
  );
}
