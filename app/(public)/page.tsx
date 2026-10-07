// app/(public)/page.tsx

import { Sparkle } from "lucide-react";

import { getHomeCountryBriefs } from "../actions/ai-country-brief";
import { getHomeMarkets } from "../actions/watchlist";
import { HomeMarketCarousel } from "../components/home-market-carousel";
import { HomeAIBrief } from "../components/home-ai-brief";

export default async function Home() {
  const [markets, briefs] = await Promise.all([
    getHomeMarkets(),
    getHomeCountryBriefs(),
  ]);

  return (
    <div className="flex min-w-0 flex-col items-center font-sans">
      <main className="relative flex w-full min-w-0 flex-1 flex-col items-start">
        <h1 className="sr-only">Global market dashboard</h1>

        <div className="w-full min-w-0 ">
          <section aria-labelledby="home-watchlist-heading">
            <h2
              id="home-watchlist-heading"
              className="mb-4 px-4 mt-4 text-xs font-normal tracking-wider text-muted-foreground/50"
            >
              Watchlist
            </h2>

            <HomeMarketCarousel markets={markets} />
          </section>

          {briefs.length > 0 && (
            <section aria-labelledby="home-ai-brief-heading" className="pt-4">
              <h2
                id="home-ai-brief-heading"
                className="flex items-center gap-1.5 px-4 text-xs font-normal tracking-wider text-muted-foreground/50"
              >
                <span>Market brief</span>{" "}
              </h2>

              <div className="mt-2 px-4 ">
                <HomeAIBrief briefs={briefs} />
              </div>
            </section>
          )}

          <section aria-labelledby="home-community-heading">
            <h2
              id="home-community-heading"
              className="mb-4 px-4 mt-4 text-xs font-normal tracking-wider text-muted-foreground/50"
            >
              Community
            </h2>
          </section>
        </div>
      </main>
    </div>
  );
}
