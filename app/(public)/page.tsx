import MarketOverview from "../components/market-overview";
// import { WorldMarketMap } from "../components/world-market-map";

export default async function Home() {
  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col items-center font-sans">
      <main className="relative flex w-full flex-1 flex-col items-start">
        {/* <div className="w-full">
          <WorldMarketMap />
        </div> */}

        <MarketOverview />
      </main>
    </div>
  );
}
