"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

  const asset = await prisma.marketAsset.findUnique({
    where: {
      symbol,
    },
    select: {
      symbol: true,
    },
  });

  if (!asset) {
    throw new Error("Market not found.");
  }

  const existing = await prisma.watchlist.findUnique({
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

  // Remove
  if (existing) {
    await prisma.watchlist.delete({
      where: {
        id: existing.id,
      },
    });

    return {
      isFavorite: false,
    };
  }

  // Add
  await prisma.watchlist.create({
    data: {
      userId: session.user.id,
      symbol,
    },
  });

  return {
    isFavorite: true,
  };
}
