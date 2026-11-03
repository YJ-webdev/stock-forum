"use client";

import type { GlobalMarketNewsItem } from "@/app/actions/news";

import { NewsFeed, NewsRegion } from "@/app/components/news/news-feed";

interface NewsPageClientProps {
  initialNews: GlobalMarketNewsItem[];
  initialRegion?: NewsRegion;
}

export default function NewsPageClient({
  initialNews,
  initialRegion = "All",
}: NewsPageClientProps) {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 sm:px-6">
      <NewsFeed initialNews={initialNews} initialRegion={initialRegion} />
    </main>
  );
}
