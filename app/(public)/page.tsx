// app/(public)/page.tsx

import { getHomeMarkets } from "../actions/watchlist";
import { getHomeMarketHeadlines } from "../actions/news";
import { HomeMarketCarousel } from "../components/home-market-carousel";
import { HomeNews } from "@/components/home-news";
import { Footer } from "../components/footer";

export default async function Home() {
  const [markets, briefs] = await Promise.all([
    getHomeMarkets(),
    getHomeMarketHeadlines(),
  ]);

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col font-sans">
      <main className="relative flex w-full min-w-0 flex-1 flex-col">
        <h1 className="sr-only">Global market dashboard</h1>

        <section aria-labelledby="home-watchlist-heading" className="mt-4 mb-4">
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
      </main>

      <Footer />
    </div>
  );
}
