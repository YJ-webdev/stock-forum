"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";
import { getVotingWindow } from "@/lib/utils/get-voting-window";
import { HomeMarketEntry } from "@/types/home-market";
import type { VoteDirection } from "@/app/actions/market-vote";
import { revalidatePath } from "next/cache";
import { MAX_WATCHLIST_MARKETS } from "@/lib/constants/watchlist";

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
    throw new Error("Log in to manage your watchlist.");
  }

  if (typeof symbol !== "string" || !symbol.trim()) {
    throw new Error("Invalid market symbol.");
  }

  const userId = session.user.id;
  const marketSymbol = symbol.trim();

  const result = await prisma.$transaction(async (tx) => {
    // PostgreSQL: serialize watchlist additions for this user.
    await tx.$queryRaw`
      SELECT 1 AS locked
      FROM pg_advisory_xact_lock(hashtext(${userId})::bigint)
    `;

    const removed = await tx.watchlist.deleteMany({
      where: {
        userId,
        symbol: marketSymbol,
      },
    });

    if (removed.count > 0) {
      return { isWatchlist: false };
    }

    const asset = await tx.marketAsset.findUnique({
      where: {
        symbol: marketSymbol,
      },
      select: {
        symbol: true,
      },
    });

    if (!asset) {
      throw new Error("Market not found.");
    }

    const currentCount = await tx.watchlist.count({
      where: { userId },
    });

    if (currentCount >= MAX_WATCHLIST_MARKETS) {
      throw new Error(`You can follow up to ${MAX_WATCHLIST_MARKETS} markets.`);
    }

    await tx.watchlist.create({
      data: {
        userId,
        symbol: marketSymbol,
      },
    });

    return { isWatchlist: true };
  });

  revalidatePath("/");

  return result;
}

export async function addMarketsToWatchlist(symbols: string[]) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Log in to manage your watchlist.");
  }

  if (
    !Array.isArray(symbols) ||
    symbols.some((symbol) => typeof symbol !== "string")
  ) {
    throw new Error("Invalid market symbols.");
  }

  const userId = session.user.id;

  const uniqueSymbols = [
    ...new Set(symbols.map((symbol) => symbol.trim()).filter(Boolean)),
  ];

  if (uniqueSymbols.length === 0) {
    return { addedCount: 0 };
  }

  const result = await prisma.$transaction(async (tx) => {
    // Use the same lock as toggleMarketWatchlist.
    await tx.$queryRaw`
      SELECT 1 AS locked
      FROM pg_advisory_xact_lock(hashtext(${userId})::bigint)
    `;

    const assets = await tx.marketAsset.findMany({
      where: {
        symbol: {
          in: uniqueSymbols,
        },
      },
      select: {
        symbol: true,
      },
    });

    const existing = await tx.watchlist.findMany({
      where: { userId },
      select: {
        symbol: true,
      },
    });

    const existingSymbols = new Set(existing.map((item) => item.symbol));

    const symbolsToAdd = assets
      .map((asset) => asset.symbol)
      .filter((symbol) => !existingSymbols.has(symbol));

    if (symbolsToAdd.length === 0) {
      return { addedCount: 0 };
    }

    if (existing.length + symbolsToAdd.length > MAX_WATCHLIST_MARKETS) {
      throw new Error(`You can follow up to ${MAX_WATCHLIST_MARKETS} markets.`);
    }

    const created = await tx.watchlist.createMany({
      data: symbolsToAdd.map((symbol) => ({
        userId,
        symbol,
      })),
      skipDuplicates: true,
    });

    return { addedCount: created.count };
  });

  revalidatePath("/");

  return result;
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

  if (userId && watchlist.length === 0) {
    return [];
  }

  console.log(
    "[WATCHLIST HIDDEN]",
    watchlist
      .filter(
        ({ symbol }) =>
          !ALL_MARKET_SYMBOLS.some((market) => market.symbol === symbol),
      )
      .map(({ symbol }) => symbol),
  );

  const watchlistSymbols = new Set(watchlist.map((item) => item.symbol));

  const candidateSymbols = userId
    ? watchlist.map((item) => item.symbol)
    : DEFAULT_HOME_MARKETS;

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

  if (candidates.length === 0) {
    return [];
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

  function getVoteKey(symbol: string, sessionDate: Date) {
    return JSON.stringify([symbol, sessionDate.toISOString()]);
  }

  const voteDirections = new Map<string, VoteDirection>();
  const sessionsWithVotes = new Set<string>();

  if (voteTargets.length > 0) {
    if (userId) {
      const predictions = await prisma.prediction.findMany({
        where: {
          userId,
          OR: voteTargets,
        },
        select: {
          symbol: true,
          sessionDate: true,
          direction: true,
        },
      });

      for (const prediction of predictions) {
        voteDirections.set(
          getVoteKey(prediction.symbol, prediction.sessionDate),
          prediction.direction,
        );
      }
    } else {
      const publicVoteCounts = await prisma.prediction.groupBy({
        by: ["symbol", "sessionDate"],
        where: {
          OR: voteTargets,
        },
        _count: {
          _all: true,
        },
      });

      for (const item of publicVoteCounts) {
        sessionsWithVotes.add(getVoteKey(item.symbol, item.sessionDate));
      }
    }
  }

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

    const voteKey = getVoteKey(market.symbol, votingWindow.predictionFor);

    if (!userId) {
      return sessionsWithVotes.has(voteKey) ? 0 : 1;
    }

    return voteDirections.has(voteKey) ? 1 : 0;
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
    .map(({ market, initialIsWatchlist, votingWindow }) => {
      const checkedSessionDate =
        userId &&
        market.assetType === "index" &&
        !votingWindow.isMarketOpen &&
        votingWindow.canVote
          ? votingWindow.predictionFor
          : null;

      return {
        market: {
          symbol: market.symbol,
          providerSymbol: market.providerSymbol,
          name: market.name,
          displaySymbol: market.displaySymbol,
          assetType: market.assetType,
        },
        initialIsWatchlist,
        initialVote: checkedSessionDate
          ? (voteDirections.get(
              getVoteKey(market.symbol, checkedSessionDate),
            ) ?? null)
          : null,
        initialVoteSessionKey: checkedSessionDate?.toISOString() ?? null,
      };
    });
}

export async function removeMarketsFromWatchlist(symbols: string[]) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Log in to manage your watchlist.");
  }

  if (
    !Array.isArray(symbols) ||
    symbols.some((symbol) => typeof symbol !== "string")
  ) {
    throw new Error("Invalid market symbols.");
  }

  const uniqueSymbols = [
    ...new Set(symbols.map((symbol) => symbol.trim()).filter(Boolean)),
  ];

  if (uniqueSymbols.length === 0) {
    return { removedCount: 0 };
  }

  const result = await prisma.watchlist.deleteMany({
    where: {
      userId: session.user.id,
      symbol: {
        in: uniqueSymbols,
      },
    },
  });

  revalidatePath("/");

  return {
    removedCount: result.count,
  };
}
