"use server";

import { prisma } from "@/lib/prisma";
import { getVotingWindow } from "@/lib/utils/get-voting-window";

export interface WorldMarketSentiment {
  symbol: string;
  bull: number;
  bear: number;
  total: number;
  bullPercent: number;
  bearPercent: number;
  predictionFor: Date;
}

export async function getWorldMarketSentiment(
  symbols: string[],
): Promise<WorldMarketSentiment[]> {
  if (symbols.length === 0) {
    return [];
  }

  const assets = await prisma.marketAsset.findMany({
    where: {
      symbol: {
        in: symbols,
      },
    },
    select: {
      id: true,
      symbol: true,
    },
  });

  if (assets.length === 0) {
    return [];
  }

  const results = await Promise.all(
    assets.map(async (asset) => {
      const votingWindow = getVotingWindow(asset.symbol);

      const predictionFor = votingWindow.predictionFor;

      if (!predictionFor) {
        return null;
      }

      const votes = await prisma.marketVote.groupBy({
        by: ["direction"],
        where: {
          assetId: asset.id,
          predictionFor,
        },
        _count: {
          _all: true,
        },
      });

      const bull =
        votes.find((vote) => vote.direction === "BULL")?._count._all ?? 0;

      const bear =
        votes.find((vote) => vote.direction === "BEAR")?._count._all ?? 0;

      const total = bull + bear;

      return {
        symbol: asset.symbol,
        bull,
        bear,
        total,

        bullPercent: total > 0 ? Math.round((bull / total) * 100) : 0,

        bearPercent: total > 0 ? Math.round((bear / total) * 100) : 0,

        predictionFor,
      };
    }),
  );

  return results.filter(
    (result): result is WorldMarketSentiment => result !== null,
  );
}
