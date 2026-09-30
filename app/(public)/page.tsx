import MarketOverview from "../components/market-overview";

export default async function Home() {
  return (
    <div className="flex flex-col items-center font-sans">
      <main className="relative flex w-full flex-1 flex-col items-start">
        <div className="w-full"></div>

        <MarketOverview />
      </main>
    </div>
  );
}
