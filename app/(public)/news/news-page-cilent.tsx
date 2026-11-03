"use client";

import type { GlobalMarketNewsItem } from "@/app/actions/news";

import { NewsFeed } from "@/app/components/news/news-feed";
import type { NewsRegion } from "@/app/components/news/news-region-filters";

interface NewsPageClientProps {
  initialNews: GlobalMarketNewsItem[];
  initialRegion?: NewsRegion;
}

export default function NewsPageClient({
  initialNews,
  initialRegion = "All",
}: NewsPageClientProps) {
  return (
    <main className="mx-auto mt-10 w-full max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="sr-only">Global Market News</h1>

      <NewsFeed initialNews={initialNews} initialRegion={initialRegion} />
    </main>
  );
}
