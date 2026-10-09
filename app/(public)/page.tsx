// app/(public)/page.tsx

import { getHomeMarkets } from "../actions/watchlist";
import { getHomeComments, getHomeCommunityMarkets } from "../actions/post";

import { HomeMarketCarousel } from "../components/home-market-carousel";
import { HomeCommunity } from "../components/home-community";
import { Footer } from "../components/footer";

export default async function Home() {
  const [markets, community, communityMarkets] = await Promise.all([
    getHomeMarkets(),
    getHomeComments({ sort: "latest" }),
    getHomeCommunityMarkets(),
  ]);

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col font-sans">
      <main className="relative flex w-full min-w-0 flex-1 flex-col">
        <h1 className="sr-only">Global market dashboard</h1>

        <section aria-labelledby="home-watchlist-heading" className="mb-1">
          <h2 id="home-watchlist-heading" className="sr-only">
            Watchlist
          </h2>

          <p
            aria-hidden="true"
            className="truncate text-xs font-normal tracking-wider text-muted-foreground/50 px-4 pt-3.5"
          >
            Predict the market trends
          </p>
          <HomeMarketCarousel markets={markets} />
        </section>

        <section
          aria-labelledby="home-community-heading"
          className="mt-4 px-3 pb-8 sm:px-4 "
        >
          <h2 id="home-community-heading" className="sr-only">
            Community
          </h2>

          <p
            aria-hidden="true"
            className="truncate text-xs font-normal tracking-wider text-muted-foreground/50  pt-2"
          >
            Share your view and start the conversation
          </p>
          <HomeCommunity
            initialComments={community.comments}
            initialNextCursor={community.nextCursor}
            initialTotalCount={community.totalCount}
            markets={communityMarkets}
          />
        </section>
      </main>

      <Footer />
    </div>
  );
}
