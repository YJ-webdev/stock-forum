import MarketOverview from "../components/market-overview";

export default async function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] items-center font-sans">
      <main className="flex-1 relative  flex flex-col w-full items-start">
        <MarketOverview />
      </main>
    </div>
  );
}
