// app/(public)/page.tsx

import { auth } from "@/auth";
import { resolveLanguage } from "@/lib/data/languages";
import { HOME_LABELS } from "@/lib/data/translations";

import { getHomeMarkets } from "../actions/watchlist";
import { getHomeComments, getHomeCommunityMarkets } from "../actions/post";

import { HomeMarketCarousel } from "../components/home-market-carousel";
import { HomeCommunity } from "../components/home-community";
import { Footer } from "../components/footer";

export default async function Home() {
  const [session, markets, community, communityMarkets] = await Promise.all([
    auth(),
    getHomeMarkets(),
    getHomeComments({ sort: "latest" }),
    getHomeCommunityMarkets(),
  ]);

  const language = resolveLanguage(session?.user?.language);
  const labels = HOME_LABELS[language];

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col font-sans">
      <main className="relative flex w-full min-w-0 flex-1 flex-col">
        <h1 className="sr-only">{labels.dashboard}</h1>

        <section aria-labelledby="home-watchlist-heading" className="">
          <h2 id="home-watchlist-heading" className="sr-only">
            {labels.watchlist}
          </h2>

          <p
            aria-hidden="true"
            className="
              truncate px-4 pt-3.5 mb-1 text-xs font-normal
              tracking-wider text-muted-foreground/50
            "
          >
            {labels.predict}
          </p>

          <HomeMarketCarousel markets={markets} />
        </section>

        <section
          aria-labelledby="home-community-heading"
          className="mt-6 px-3 pb-8 sm:px-4"
        >
          <h2 id="home-community-heading" className="sr-only">
            {labels.community}
          </h2>

          <p
            aria-hidden="true"
            className="
              truncate text-xs font-normal
              tracking-wider text-muted-foreground/50 -mb-1
            "
          >
            {labels.share_view}
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
