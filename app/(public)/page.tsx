// app/(public)/page.tsx

import { getHomeMarkets } from "../actions/watchlist";
import { getHomeMarketHeadlines } from "../actions/news";
import { HomeMarketCarousel } from "../components/home-market-carousel";
import { HomeNews } from "@/components/home-news";

export default async function Home() {
  const [markets, briefs] = await Promise.all([
    getHomeMarkets(),
    getHomeMarketHeadlines(),
  ]);

  return (
    <div className="flex min-w-0 flex-col items-center font-sans">
      <main className="relative flex w-full min-w-0 flex-1 flex-col items-start">
        <h1 className="sr-only">Global market dashboard</h1>

        <div className="w-full min-w-0">
          <section
            aria-labelledby="home-watchlist-heading"
            className="mt-4 mb-4"
          >
            <h2 id="home-watchlist-heading" className="sr-only">
              Watchlist
            </h2>

            <HomeMarketCarousel markets={markets} />
          </section>

          {briefs.length > 0 && (
            <section aria-labelledby="home-news-heading">
              <h2 id="home-news-heading" className="sr-only">
                Market news
              </h2>

              <HomeNews briefs={briefs} />
            </section>
          )}

          <section aria-labelledby="home-community-heading" className="mt-4">
            <h2 id="home-community-heading" className="sr-only">
              Community
            </h2>
          </section>
        </div>
      </main>
    </div>
  );
}
