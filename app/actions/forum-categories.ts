"use server";

import { prisma } from "@/lib/prisma";

export async function getPostsByAsset(symbol: string) {
  return prisma.post.findMany({
    where: {
      assetSymbol: symbol,
    },

    orderBy: {
      createdAt: "desc",
    },

    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },

      asset: {
        select: {
          symbol: true,
          displaySymbol: true,
          name: true,
          assetType: true,
          category: true,
        },
      },

      _count: {
        select: {
          comments: true,
          likes: true,
        },
      },
    },
  });
}
