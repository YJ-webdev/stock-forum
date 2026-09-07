"use client";

import Link from "next/link";
import { useState } from "react";
import { Newspaper } from "lucide-react";
import { DUMMY_NEWS, NewsItem } from "../data/dummy";

function NewsRow({ item }: { item: NewsItem }) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      href={item.href}
      className="flex items-center px-1 py-3 justify-between rounded-lg border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all duration-200 group"
    >
      <div className="flex items-center gap-4 min-w-0 pr-2">
        {/* News Company Icon Badge */}
        <div className="h-5 w-5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700/50 overflow-hidden">
          {!imgError && (
            <img
              src={item.sourceIcon}
              alt={item.source}
              className="h-6 w-6 object-cover"
              onError={() => setImgError(true)}
            />
          )}
        </div>

        {/* Details & Title */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {item.source}
            </span>
            <span>•</span>
            <span>{item.category}</span>
          </div>
          <p className="text-sm font-medium text-wrap text-foreground group-hover:text-primary transition-colors">
            {item.title}
          </p>
        </div>
      </div>

      {/* Time Stamp */}
      <span className="text-xs text-muted-foreground shrink-0 pl-2">
        {item.timeAgo}
      </span>
    </Link>
  );
}

export function NewsList() {
  return (
    <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800/50">
      {DUMMY_NEWS.slice(0, 3).map((item) => (
        <NewsRow key={item.id} item={item} />
      ))}
    </div>
  );
}
