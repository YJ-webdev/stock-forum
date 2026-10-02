import MarketPageClient from "./market-page-client";

import {
  getMarketVote,
  getMarketVoteStats,
  type MarketVoteStats,
  type VoteDirection,
} from "@/app/actions/market-vote";

import { isMarketInWatchlist } from "@/app/actions/watchlist";

import { getVotingWindow } from "@/lib/utils/get-voting-window";
import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";

interface PageProps {
  params: Promise<{
    symbol: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { symbol } = await params;

  const decodedSymbol = decodeURIComponent(symbol);

  const symbolMeta = ALL_MARKET_SYMBOLS.find(
    (item) => item.symbol === decodedSymbol,
  );

  const canPredict = symbolMeta?.assetType === "index";

  let initialVoteStats: MarketVoteStats | null = null;
  let initialVote: VoteDirection | null = null;

  const initialIsFavorite = await isMarketInWatchlist(decodedSymbol);

  if (canPredict) {
    const votingWindow = getVotingWindow(decodedSymbol, Date.now());
    const sessionDate = votingWindow.predictionFor;

    if (sessionDate) {
      [initialVoteStats, initialVote] = await Promise.all([
        getMarketVoteStats({
          symbol: decodedSymbol,
          sessionDate,
        }),

        getMarketVote({
          symbol: decodedSymbol,
          sessionDate,
        }),
      ]);
    }
  }

  return (
    <MarketPageClient
      symbol={decodedSymbol}
      initialVoteStats={initialVoteStats}
      initialVote={initialVote}
      initialIsFavorite={initialIsFavorite}
    />
  );
}
