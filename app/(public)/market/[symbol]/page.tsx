// app/(public)/market/[symbol]/page.tsx

import type { Metadata } from "next";

import { getMarketVoteStats } from "@/app/actions/market-vote";
import { isMarketInWatchlist } from "@/app/actions/watchlist";

import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";
import { getVotingWindow } from "@/lib/utils/get-voting-window";

import MarketPageClient from "./market-page-client";
import { ScrollToTopButton } from "@/app/components/scroll-to-top-button";

interface PageProps {
  params: Promise<{
    symbol: string;
  }>;
}

async function resolveMarket(params: PageProps["params"]) {
  const { symbol } = await params;
  const decodedSymbol = decodeURIComponent(symbol);

  const market = ALL_MARKET_SYMBOLS.find(
    (item) => item.symbol === decodedSymbol,
  );

  return {
    symbol: decodedSymbol,
    market,
    canPredict: market?.assetType === "index",
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { symbol, market, canPredict } = await resolveMarket(params);

  const name = market?.name ?? symbol;

  const title = canPredict
    ? `${name} Predictions & Discussion`
    : `${name} Market Discussion`;

  const description = canPredict
    ? `Bull or Bear on ${name}? Predict the next market session, explore community sentiment, and join the discussion on BullBearVote.`
    : `Follow ${name}, add it to your watchlist, and share your market views with the BullBearVote community.`;

  const url = `/market/${encodeURIComponent(symbol)}`;
  const shareTitle = `${title} | BullBearVote`;

  return {
    title,
    description,

    alternates: {
      canonical: url,
    },

    openGraph: {
      type: "website",
      siteName: "BullBearVote",
      url,
      title: shareTitle,
      description,
    },

    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { symbol, canPredict } = await resolveMarket(params);

  const sessionDate = canPredict
    ? getVotingWindow(symbol, Date.now()).predictionFor
    : null;

  const [initialIsWatchlist, initialVoteStats] = await Promise.all([
    isMarketInWatchlist(symbol),

    sessionDate
      ? getMarketVoteStats({ symbol, sessionDate })
      : Promise.resolve(null),
  ]);

  return (
    <>
      <MarketPageClient
        key={symbol}
        symbol={symbol}
        initialVoteStats={initialVoteStats}
        initialVoteStatsSessionKey={sessionDate?.toISOString() ?? null}
        initialIsWatchlist={initialIsWatchlist}
      />
      <ScrollToTopButton threshold={600} />
    </>
  );
}
