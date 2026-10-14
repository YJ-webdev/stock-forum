// app/(public)/page.tsx

import type { Metadata } from "next";

import { auth } from "@/auth";
import { resolveLanguage } from "@/lib/data/languages";
import { HOME_LABELS } from "@/lib/data/translations";

import { getHomeComments, getHomeCommunityMarkets } from "../actions/post";
import { getHomeMarkets } from "../actions/watchlist";

import { HomeCommunity } from "../components/home-community";
import { HomeMarketCarousel } from "../components/home-market-carousel";

const HOME_TITLE = "BullBearVote | Market Predictions & Community";

const HOME_DESCRIPTION =
  "Bull or Bear? Predict the next session for global stock indices, track your watchlist, and discuss markets with the community.";

export const metadata: Metadata = {
  title: {
    absolute: HOME_TITLE,
  },

  description: HOME_DESCRIPTION,

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    siteName: "BullBearVote",
    url: "/",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },

  twitter: {
    card: "summary",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
};

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
    <main className="relative flex w-full min-w-0 flex-1 flex-col">
      <h1 className="sr-only">{labels.dashboard}</h1>

      <section aria-labelledby="home-watchlist-heading">
        <h2 id="home-watchlist-heading" className="sr-only">
          {labels.watchlist}
        </h2>

        <p
          aria-hidden="true"
          className="
            mb-6 truncate px-4 pt-2
            text-xs font-normal tracking-wider
            text-muted-foreground/50 sm:pt-3.5
          "
        >
          {labels.predict}
        </p>

        <HomeMarketCarousel markets={markets} />
      </section>

      <section aria-labelledby="home-community-heading" className="mt-9 px-4">
        <h2 id="home-community-heading" className="sr-only">
          {labels.community}
        </h2>

        <p
          aria-hidden="true"
          className="
            truncate text-xs font-normal
            tracking-wider text-muted-foreground/50
          "
        >
          {labels.latest_comments}
        </p>

        <HomeCommunity
          initialComments={community.comments}
          initialNextCursor={community.nextCursor}
          initialTotalCount={community.totalCount}
          markets={communityMarkets}
        />
      </section>
    </main>
  );
}
