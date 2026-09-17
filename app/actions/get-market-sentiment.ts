"use server";

import { prisma } from "@/lib/prisma";

export interface MarketSentiment {
  symbol: string;
  bull: number;
  bear: number;
  total: number;
  bullPercent: number;
  bearPercent: number;
}

export async function getMarketSentiment(
  symbol: string,
  predictionFor: Date,
): Promise<MarketSentiment | null> {
  const asset = await prisma.marketAsset.findUnique({
    where: {
      symbol,
    },
    select: {
      id: true,
    },
  });

  if (!asset) {
    return null;
  }

  const [bull, bear] = await Promise.all([
    prisma.marketVote.count({
      where: {
        assetId: asset.id,
        predictionFor,
        direction: "BULL",
      },
    }),

    prisma.marketVote.count({
      where: {
        assetId: asset.id,
        predictionFor,
        direction: "BEAR",
      },
    }),
  ]);

  const total = bull + bear;

  return {
    symbol,
    bull,
    bear,
    total,
    bullPercent: total > 0 ? Math.round((bull / total) * 100) : 0,
    bearPercent: total > 0 ? Math.round((bear / total) * 100) : 0,
  };
}
