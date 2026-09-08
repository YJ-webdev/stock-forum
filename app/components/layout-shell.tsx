"use client";

import { useState, useEffect } from "react";
import { Header } from "./header";
import PanelLeft from "./panel-left";
import { LeaderboardChart } from "./leader-board-chart";
import { CountryLeaderboard } from "./country-leader-chart";
import { MarketIndexTable } from "./market-index-table";
// import { MarketCardList } from "./market-card-lists";
import { MarketDataTable } from "./market-data-table";
import { MarketAssetClient, NewsItem } from "../data/type";
import { PostWithRelations } from "./post-card";
import { CategoryWithCount } from "./forum-card";

interface User {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

// Interface matching the SSE payload from /api/prices
export interface MarketPriceUpdate {
  symbol: string;
  lastPrice: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: string;
  updatedAt: string;
}

interface LayoutShellProps {
  user: User | null;
  marketData: MarketAssetClient[];
  news: NewsItem[];
  categories: CategoryWithCount[];
  children: React.ReactNode; // Accept children instead of posts
}

export default function LayoutShell({
  user,
  news,
  marketData: initialMarketData,
  categories,
  children, // 1. Unpack children
}: LayoutShellProps) {
  // ... state & SSE logic stay identical
  const [isOpen, setIsOpen] = useState(false);

  // 1. Initialize state with server-provided initial marketData
  const [marketData, setMarketData] =
    useState<MarketAssetClient[]>(initialMarketData);

  // 2. Connect to the SSE live price endpoint
  useEffect(() => {
    const eventSource = new EventSource("/api/prices");

    eventSource.onmessage = (event) => {
      try {
        const liveUpdates: MarketPriceUpdate[] = JSON.parse(event.data);

        // Merge incoming SSE updates with local state
        setMarketData((prevData) =>
          prevData.map((item) => {
            // Replace this line inside setMarketData:
            const update = liveUpdates.find(
              (u) =>
                u.symbol.replace(/[^a-zA-Z0-9]/g, "") ===
                item.symbol.replace(/[^a-zA-Z0-9]/g, ""),
            );
            if (!update) return item;

            return {
              ...item,
              price: update.lastPrice,
              change: update.change,
              changePercent: update.changePercent,
              high: update.high,
              low: update.low,
              volume: update.volume,
              updatedAt: update.updatedAt,
            };
          }),
        );
      } catch (error) {
        console.error("Failed to parse SSE market data:", error);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE Connection Error:", err);
      eventSource.close();
    };

    // Clean up connection when leaving the page
    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <>
      <Header user={user} onTogglePanel={() => setIsOpen((prev) => !prev)} />
      <PanelLeft
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        news={news}
        categories={categories}
      />

      <div
        className={`pt-14 min-h-screen w-full flex flex-col md:flex-row max-w-full transition-[padding] duration-700 ease-out ${
          isOpen ? "md:pl-60" : "pl-0"
        }`}
      >
        {/* Section A (2/3 of available inner space) */}
        <section className="w-full md:ml-20">
          {/* <MarketCardList /> */}
          <MarketDataTable marketData={marketData} />
          {/* 2. Render children (the posts list passed from page.tsx) */}
          <div className="p-4">{children}</div>
        </section>

        {/* Section B (1/3 of available inner space) */}
        <section className="w-[35%] p-4 border-l border-zinc-100 dark:border-zinc-900 flex flex-col gap-4">
          <MarketIndexTable marketData={marketData} />
          <LeaderboardChart />
          <CountryLeaderboard />
        </section>
      </div>
    </>
  );
}
