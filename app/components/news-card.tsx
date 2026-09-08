"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Newspaper } from "lucide-react";
import { NewsItem } from "../data/type";
// import { getTimeAgo } from "@/lib/utils/time-ago";

function NewsRow({ item }: { item: NewsItem }) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      href={`/news/${item.id}`}
      className="flex items-center py-2 justify-between  group w-full h-20"
    >
      <div className="flex items-center gap-4 min-w-0 pr-2">
        {/* Publisher Brand Icon */}
        <div className="relative h-7 w-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700/50 overflow-hidden">
          {!imgError && item.sourceIcon ? (
            <Image
              src={item.sourceIcon}
              alt={item.source}
              fill
              className="object-cover rounded-full"
              onError={() => setImgError(true)}
              unoptimized
            />
          ) : (
            <Newspaper className="h-3.5 w-3.5 text-zinc-400" />
          )}
        </div>

        {/* Details & Title */}
        <div className="flex flex-col min-w-0 gap-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {/* <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {item.source}
            </span> */}
            {/* <span>•</span> */}
            {/* <span>{item.category}</span> */}
          </div>
          <p className="text-sm text-wrap text-foreground group-hover:text-primary transition-colors line-clamp-3">
            {item.title}
          </p>
        </div>
      </div>

      {/* Time Stamp */}
      {/* <span className="text-xs text-muted-foreground shrink-0 pl-2">
        {getTimeAgo(item.timeAgo)}
      </span> */}
    </Link>
  );
}

export function NewsCarousel({ news }: { news: NewsItem[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!news || news.length === 0) return null;

  return (
    <div className="flex flex-col w-full max-w-md bg-muted-foreground/5 rounded-xl p-2 mt-3">
      {/* Active Card Container */}
      <p className="text-muted-foreground text-xs text-light tracking-wider ">
        NEWS
      </p>
      <div className="flex items-center gap-1 py-1">
        <div className="flex-1 overflow-hidden">
          <NewsRow item={news[currentIndex]} />
        </div>
      </div>

      {/* Navigation Dots */}
      <div className="flex items-center justify-center gap-1.5 mt-2">
        {news.slice(0, 3).map((item, index) => (
          <button
            key={item.id}
            onClick={() => setCurrentIndex(index)}
            className={`h-1.5 rounded-full transition-all duration-200 ${
              currentIndex === index
                ? "w-1.5 bg-zinc-500 dark:bg-zinc-200"
                : "w-1.5 bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 hover:cursor-pointer"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
