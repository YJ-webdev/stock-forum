"use server";

import { prisma } from "@/lib/prisma";

export interface PopularBoard {
  symbol: string;
  name: string;
  commentCount: number;
}

export async function getPopularBoards(limit = 7) {
  const assets = await prisma.marketAsset.findMany({
    select: {
      symbol: true,
      name: true,

      _count: {
        select: {
          comments: true,
        },
      },
    },

    orderBy: {
      comments: {
        _count: "desc",
      },
    },

    take: limit,
  });

  return assets.map((asset) => ({
    symbol: asset.symbol,
    name: asset.name,
    commentCount: asset._count.comments,
  }));
}
