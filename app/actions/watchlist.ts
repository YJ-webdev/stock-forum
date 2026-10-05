"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";

const DEFAULT_HOME_MARKETS = [
  "^GSPC", // S&P 500
  "^NDX", // Nasdaq 100
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

export async function getHomeMarkets() {
  const session = await auth();

  const watchlist = session?.user?.id
    ? await prisma.watchlist.findMany({
        where: {
          userId: session.user.id,
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

  const result: {
    market: (typeof ALL_MARKET_SYMBOLS)[number];
    initialIsWatchlist: boolean;
  }[] = [];

  for (const symbol of candidateSymbols) {
    if (selectedSymbols.has(symbol)) continue;

    const market = ALL_MARKET_SYMBOLS.find((item) => item.symbol === symbol);

    if (!market) continue;

    selectedSymbols.add(symbol);

    result.push({
      market,
      initialIsWatchlist: watchlistSymbols.has(symbol),
    });

    if (result.length === 20) break;
  }

  return result;
}
