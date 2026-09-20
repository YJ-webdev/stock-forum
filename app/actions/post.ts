"use server";

import type { JSONContent } from "@tiptap/react";
import type { Prisma } from "@/generated/prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import {
  ALL_MARKET_SYMBOLS,
  type MarketSymbolItem,
} from "@/lib/data/market-symbols";

export interface CreateCommentInput {
  content: JSONContent;
  assetSymbols: string[];
}

export async function createComment({
  content,
  assetSymbols,
}: CreateCommentInput) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in to comment.");
  }

  // Remove duplicate symbols.
  const uniqueSymbols = [...new Set(assetSymbols)];

  if (uniqueSymbols.length === 0) {
    throw new Error("Please select at least one board.");
  }

  // Only allow assets that exist in our market metadata.
  const selectedMarkets = uniqueSymbols
    .map((symbol) =>
      ALL_MARKET_SYMBOLS.find((market) => market.symbol === symbol),
    )
    .filter((market): market is MarketSymbolItem => Boolean(market));

  if (selectedMarkets.length === 0) {
    throw new Error("No valid boards selected.");
  }

  // Make sure every selected market exists in MarketAsset.
  await Promise.all(
    selectedMarkets.map((market) =>
      prisma.marketAsset.upsert({
        where: {
          symbol: market.symbol,
        },

        update: {
          name: market.name,
          displaySymbol: market.displaySymbol,
          category: market.region,
          assetType: market.assetType,
          timezone: market.timezone ?? "UTC",
        },

        create: {
          symbol: market.symbol,
          name: market.name,
          displaySymbol: market.displaySymbol,
          category: market.region,
          assetType: market.assetType,
          timezone: market.timezone ?? "UTC",
        },
      }),
    ),
  );

  // Convert TipTap JSONContent into a plain Prisma-compatible JSON value.
  const plainContent = JSON.parse(
    JSON.stringify(content),
  ) as Prisma.InputJsonValue;

  return prisma.comment.create({
    data: {
      content: plainContent,
      authorId: session.user.id,

      assets: {
        create: selectedMarkets.map((market) => ({
          asset: {
            connect: {
              symbol: market.symbol,
            },
          },
        })),
      },
    },

    select: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,

      author: {
        select: {
          id: true,
          name: true,
          image: true,
          nationality: true,
        },
      },

      assets: {
        select: {
          asset: {
            select: {
              name: true,
              symbol: true,
              displaySymbol: true,
            },
          },
        },
      },

      _count: {
        select: {
          likes: true,
          replies: true,
        },
      },
    },
  });
}

export interface MostLikedComment {
  id: string;
  content: JSONContent;
  createdAt: Date;
  updatedAt: Date;

  author: {
    id: string;
    name: string | null;
    image: string | null;
    nationality: string | null;
  };

  assets: {
    asset: {
      name: string;
      symbol: string;
      displaySymbol: string | null;
    };
  }[];

  _count: {
    likes: number;
    replies: number;
  };
}

export async function getMostLikedComments(): Promise<MostLikedComment[]> {
  const comments = await prisma.comment.findMany({
    take: 5,

    orderBy: [
      {
        likes: {
          _count: "desc",
        },
      },
      {
        createdAt: "desc",
      },
    ],

    select: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,

      author: {
        select: {
          id: true,
          name: true,
          image: true,
          nationality: true,
        },
      },

      assets: {
        select: {
          asset: {
            select: {
              name: true,
              symbol: true,
              displaySymbol: true,
            },
          },
        },
      },

      _count: {
        select: {
          likes: true,
          replies: true,
        },
      },
    },
  });

  return comments.map((comment) => ({
    ...comment,
    content: comment.content as JSONContent,
  }));
}
