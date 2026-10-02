import MarketOverview from "../components/market-overview";
import { UserPreferenceMarket } from "../components/user-preference-market";

export default async function Home() {
  return (
    <div className="flex flex-col items-center font-sans">
      <main className="relative flex w-full flex-1 flex-col items-start ">
        <div className="w-full pt-4"></div>
        <UserPreferenceMarket />
        {/* <MarketOverview /> */}
      </main>
    </div>
  );
}
