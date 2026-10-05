"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";
import { getVotingWindow } from "@/lib/utils/get-voting-window";
import { HomeMarketEntry } from "@/types/home-market";

const DEFAULT_HOME_MARKETS = [
  "^GSPC", // S&P 500
  "^IXIC", // Nasdaq 100
  "^GDAXI", // DAX
  "^FTSE", // FTSE 100
  "^N225", // Nikkei 225
  "^KS11", // KOSPI
  "^HSI", // Hang Seng
  "^NSEI", // NIFTY 50
];

export async function addMarketsToWatchlist(symbols: string[]) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized.");
  }

  const uniqueSymbols = [...new Set(symbols)];

  if (uniqueSymbols.length === 0) {
    return {
      addedCount: 0,
    };
  }

  // Only allow symbols that actually exist in MarketAsset.
  const assets = await prisma.marketAsset.findMany({
    where: {
      symbol: {
        in: uniqueSymbols,
      },
    },
    select: {
      symbol: true,
    },
  });

  const validSymbols = assets.map((asset) => asset.symbol);

  if (validSymbols.length === 0) {
    return {
      addedCount: 0,
    };
  }

  const result = await prisma.watchlist.createMany({
    data: validSymbols.map((symbol) => ({
      userId: session.user.id,
      symbol,
    })),
    skipDuplicates: true,
  });

  return {
    addedCount: result.count,
  };
}

export async function isMarketInWatchlist(symbol: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return false;
  }

  const item = await prisma.watchlist.findUnique({
    where: {
      userId_symbol: {
        userId: session.user.id,
        symbol,
      },
    },
    select: {
      id: true,
    },
  });

  return !!item;
}

export async function toggleMarketWatchlist(symbol: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized.");
  }

  const userId = session.user.id;

  const removed = await prisma.watchlist.deleteMany({
    where: {
      userId,
      symbol,
    },
  });

  if (removed.count > 0) {
    return {
      isWatchlist: false,
    };
  }

  await prisma.watchlist.create({
    data: {
      userId,
      symbol,
    },
  });

  return {
    isWatchlist: true,
  };
}

export async function getHomeMarkets(): Promise<HomeMarketEntry[]> {
  const session = await auth();
  const userId = session?.user?.id;

  const watchlist = userId
    ? await prisma.watchlist.findMany({
        where: {
          userId,
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          symbol: true,
        },
      })
    : [];

  const watchlistSymbols = new Set(watchlist.map((item) => item.symbol));

  const candidateSymbols = [
    ...watchlist.map((item) => item.symbol),
    ...DEFAULT_HOME_MARKETS,
  ];

  const selectedSymbols = new Set<string>();

  const candidates: {
    market: (typeof ALL_MARKET_SYMBOLS)[number];
    initialIsWatchlist: boolean;
  }[] = [];

  for (const symbol of candidateSymbols) {
    if (selectedSymbols.has(symbol)) continue;

    const market = ALL_MARKET_SYMBOLS.find((item) => item.symbol === symbol);

    if (!market) continue;

    selectedSymbols.add(symbol);

    candidates.push({
      market,
      initialIsWatchlist: watchlistSymbols.has(symbol),
    });
  }

  const nowMs = Date.now();

  const marketsWithVoting = candidates.map((item) => ({
    ...item,
    votingWindow: getVotingWindow(item.market.symbol, nowMs),
  }));

  const voteTargets = marketsWithVoting.flatMap(({ market, votingWindow }) => {
    if (
      market.assetType !== "index" ||
      votingWindow.isMarketOpen ||
      !votingWindow.canVote ||
      !votingWindow.predictionFor
    ) {
      return [];
    }

    return [
      {
        symbol: market.symbol,
        sessionDate: votingWindow.predictionFor,
      },
    ];
  });

  const predictions =
    userId && voteTargets.length > 0
      ? await prisma.prediction.findMany({
          where: {
            userId,
            OR: voteTargets,
          },
          select: {
            symbol: true,
            sessionDate: true,
          },
        })
      : [];

  function getVoteKey(symbol: string, sessionDate: Date) {
    return JSON.stringify([symbol, sessionDate.toISOString()]);
  }

  const votedSessions = new Set(
    predictions.map((prediction) =>
      getVoteKey(prediction.symbol, prediction.sessionDate),
    ),
  );

  function getPriority(item: (typeof marketsWithVoting)[number]) {
    const { market, votingWindow } = item;

    if (market.assetType !== "index") return 3;

    if (
      votingWindow.isMarketOpen ||
      !votingWindow.canVote ||
      !votingWindow.predictionFor
    ) {
      return 2;
    }

    const hasVoted = votedSessions.has(
      getVoteKey(market.symbol, votingWindow.predictionFor),
    );

    return hasVoted ? 1 : 0;
  }

  return marketsWithVoting
    .map((item, originalIndex) => ({
      ...item,
      originalIndex,
      priority: getPriority(item),
    }))
    .sort(
      (a, b) => a.priority - b.priority || a.originalIndex - b.originalIndex,
    )
    .slice(0, 20)
    .map(({ market, initialIsWatchlist }) => ({
      market: {
        symbol: market.symbol,
        providerSymbol: market.providerSymbol,
        name: market.name,
        displaySymbol: market.displaySymbol,
        assetType: market.assetType,
      },
      initialIsWatchlist,
    }));
}
