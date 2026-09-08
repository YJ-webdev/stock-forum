"use client";

import { useState } from "react";
import { Header } from "./header";
import PanelLeft from "./panel-left";
import { MarketIndexTable } from "./market-index-table";
import { LeaderboardChart } from "./leader-board-chart";
// import { CountryLeaderboard } from "./country-leader-chart";

import { CategoryWithCount } from "./forum-card";
import { MarketAssetClient, NewsItem } from "../data/type";

interface User {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface LayoutShellProps {
  user: User | null;
  marketData: MarketAssetClient[];
  news: NewsItem[];
  categories: CategoryWithCount[];
  children: React.ReactNode;
}

export default function LayoutShell({
  user,
  news,
  categories,
  marketData,
  children,
}: LayoutShellProps) {
  const [isOpen, setIsOpen] = useState(false);

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
        className={`pt-14 min-h-screen w-full flex flex-col md:flex-row max-w-full transition-[padding] duration-500 ease-out ${
          isOpen ? "md:pl-60" : "pl-0"
        }`}
      >
        {/* Section A (Dynamic Page Content) */}
        <section className="w-full md:ml-20 flex-1">
          <div className="p-4">{children}</div>
        </section>

        {/* Section B (Persistent Right Panel) */}
        <section className="w-full md:w-[25%] p-4 border-l border-zinc-100 dark:border-zinc-900 flex flex-col gap-4">
          <div className="flex flex-col w-2xs gap-4">
            <div>
              <p className="text-muted-foreground text-xs text-light tracking-wider uppercase">
                market indices
              </p>

              <MarketIndexTable marketData={marketData} />
            </div>
            <div>
              <p className="text-muted-foreground text-xs text-light tracking-wider uppercase">
                top traders
              </p>
              <LeaderboardChart />
            </div>
            {/* <CountryLeaderboard /> */}
          </div>
        </section>
      </div>
    </>
  );
}
