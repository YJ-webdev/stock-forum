import MarketOverview from "../components/market-overview";
import { WorldMarketMapClient } from "../components/world-market-map-client";

export default async function Home() {
  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col items-center font-sans">
      <main className="relative flex w-full flex-1 flex-col items-start">
        <div className="w-full">
          <WorldMarketMapClient />
        </div>

        <MarketOverview />
      </main>
    </div>
  );
}
