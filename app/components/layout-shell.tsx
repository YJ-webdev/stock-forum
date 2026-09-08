"use client";

import { useState } from "react";
import { Header } from "./header";
import PanelLeft from "./panel-left";
import { LeaderboardChart } from "./leader-board-chart";
import { CountryLeaderboard } from "./country-leader-chart";
import { MarketIndexTable } from "./market-index-table";
// import { MarketCardList } from "./market-card-lists";
import { MarketDataTable } from "./market-data-table";
import { MarketAssetClient } from "../data/type";

interface User {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export default function LayoutShell({
  user,
  marketData,
}: {
  user: User | null;
  marketData: MarketAssetClient[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Header user={user} onTogglePanel={() => setIsOpen((prev) => !prev)} />
      <PanelLeft isOpen={isOpen} setIsOpen={setIsOpen} />

      <div
        className={`pt-14 min-h-screen w-full flex flex-col md:flex-row max-w-full transition-[padding] duration-700 ease-out ${
          isOpen ? "md:pl-60" : "pl-0"
        }`}
      >
        {/* Section A (2/3 of available inner space) */}
        <section className="w-full md:ml-20">
          {/* <MarketCardList /> */}
          <MarketDataTable marketData={marketData} />
        </section>

        {/* Section B (1/3 of available inner space) */}
        <section className="w-[35%] p-4 border-l border-zinc-100 dark:border-zinc-900 flex flex-col gap-4">
          <MarketIndexTable />
          <LeaderboardChart />
          <CountryLeaderboard />
        </section>
      </div>
    </>
  );
}
