"use client";

import { useState } from "react";
import { Header } from "./header";
import PanelLeft from "./panel-left";
// import { MarketIndexTable } from "./market-index-table";
import { LeaderboardChart } from "./leader-board-chart";

import { CategoryWithCount } from "./forum-card";

import EditorDrawer from "./editor-drawer";
import { MarketAssetClient, NewsItem } from "@/types";

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
  const [isOpen, setIsOpen] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  return (
    <>
      <Header
        user={user}
        onTogglePanel={() => setIsOpen((prev) => !prev)}
        onOpenEditor={() => setIsEditorOpen(true)}
      />

      <PanelLeft
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        news={news}
        categories={categories}
      />

      <div
        className={`pt-14 min-h-screen flex flex-col md:flex-row transition-all duration-300 ease-in-out ${
          isOpen
            ? "xl:ml-80 xl:w-[calc(100%-320px)] w-full ml-0"
            : "ml-0 w-full"
        }`}
      >
        {/* Section A (Dynamic Page Content) */}
        <section className="w-full flex-1 min-w-0 bg-white dark:bg-zinc-900">
          <div className="">{children}</div>
        </section>

        {/* Section B (Right Panel): Expands when PanelLeft is closed, shrinks when opened */}
        <section
          className={`transition-all duration-300 ease-in-out delay-75 z-5 p-4 border-l border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col gap-4 ${
            isOpen ? "xl:w-78" : "xl:w-90"
          }`}
        >
          <div className="flex flex-col w-full max-w-2xs gap-4">
            <div>
              {/* <p className="text-muted-foreground text-xs text-light tracking-wider uppercase">
                market indices
              </p> */}

              {/* <MarketIndexTable marketData={marketData} /> */}
            </div>
            <div>
              <p className="text-muted-foreground text-xs text-light tracking-wider uppercase">
                top traders
              </p>
              <LeaderboardChart />
            </div>
          </div>
        </section>
      </div>

      <EditorDrawer
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
      />
    </>
  );
}
