import MarketOverview from "../components/market-overview";

export default async function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center font-sans">
      <main className="relative flex flex-col flex-1 w-full items-start">
        <MarketOverview />
      </main>
    </div>
  );
}
