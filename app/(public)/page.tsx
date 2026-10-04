import { getHomeMarkets } from "../actions/watchlist";
import { HomeMarketCarousel } from "../components/home-market-carousel";
import { VoteSentiment } from "../components/vote-sentiment";

export default async function Home() {
  const markets = await getHomeMarkets();

  return (
    <div className="flex min-w-0 flex-col items-center font-sans">
      <main className="relative flex w-full min-w-0 flex-1 flex-col items-start">
        <div className="w-full min-w-0 space-y-4 pt-4">
          <p className="mb-3 px-4 text-xs font-normal tracking-wider text-muted-foreground/50">
            Watchlist
          </p>

          <HomeMarketCarousel markets={markets} />

          <p className="mb-3 px-4 text-xs font-normal tracking-wider text-muted-foreground/50">
            AI brief
          </p>
          <VoteSentiment />
        </div>
      </main>
    </div>
  );
}
