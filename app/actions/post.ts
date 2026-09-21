"use server";

import type { JSONContent } from "@tiptap/react";
import type { Prisma } from "@/generated/prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import {
  ALL_MARKET_SYMBOLS,
  type MarketSymbolItem,
} from "@/lib/data/market-symbols";

type PredictionInput = {
  direction: "BULL" | "BEAR";
  pointsBet: number;
  predictionPrice: number;
  sessionDate: Date;
};

type CreateCommentInput = {
  content?: JSONContent | null;
  assetSymbols: string[];
  prediction?: PredictionInput | null;
};

export async function createComment({
  content = null,
  assetSymbols,
  prediction = null,
}: CreateCommentInput) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  // ---------------------------------------------------------------------------
  // USER
  // ---------------------------------------------------------------------------

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      nationality: true,
    },
  });

  if (!user) {
    throw new Error("Please log in to comment.");
  }

  // Nationality is required only for predictions.
  if (prediction && !user.nationality) {
    throw new Error("Please set your nationality before voting.");
  }

  // ---------------------------------------------------------------------------
  // MARKETS
  // ---------------------------------------------------------------------------

  const uniqueSymbols = [...new Set(assetSymbols)];

  if (uniqueSymbols.length === 0) {
    throw new Error("Please select at least one board.");
  }

  const selectedMarkets = uniqueSymbols
    .map((symbol) =>
      ALL_MARKET_SYMBOLS.find((market) => market.symbol === symbol),
    )
    .filter((market): market is MarketSymbolItem => Boolean(market));

  if (selectedMarkets.length === 0) {
    throw new Error("No valid boards selected.");
  }

  // A prediction belongs to exactly one market.
  if (prediction && selectedMarkets.length !== 1) {
    throw new Error("A prediction must belong to exactly one market.");
  }

  // ---------------------------------------------------------------------------
  // VALIDATE PREDICTION
  // ---------------------------------------------------------------------------

  if (prediction) {
    if (prediction.pointsBet < 50 || prediction.pointsBet > 500) {
      throw new Error("Prediction must be between 50 and 500 points.");
    }

    if (
      !Number.isFinite(prediction.predictionPrice) ||
      prediction.predictionPrice <= 0
    ) {
      throw new Error("Invalid prediction price.");
    }

    if (
      !(prediction.sessionDate instanceof Date) ||
      Number.isNaN(prediction.sessionDate.getTime())
    ) {
      throw new Error("Invalid prediction session.");
    }
  }

  // ---------------------------------------------------------------------------
  // DETECT COMMENT CONTENT
  // ---------------------------------------------------------------------------

  const hasContent =
    content && Array.isArray(content.content) && content.content.length > 0;

  if (!hasContent && !prediction) {
    throw new Error("Please write a comment or select a GIF.");
  }

  // ---------------------------------------------------------------------------
  // UPSERT MARKET ASSETS
  // ---------------------------------------------------------------------------

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

  const plainContent = hasContent
    ? (JSON.parse(JSON.stringify(content)) as Prisma.InputJsonValue)
    : null;

  // ---------------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------------

  return prisma.$transaction(async (tx) => {
    let createdPrediction: { id: string } | null = null;

    // -------------------------------------------------------------------------
    // PREDICTION
    // -------------------------------------------------------------------------

    if (prediction) {
      const market = selectedMarkets[0];

      createdPrediction = await tx.prediction.create({
        data: {
          userId: session.user.id,
          symbol: market.symbol,

          direction: prediction.direction,
          pointsBet: prediction.pointsBet,

          predictionPrice: prediction.predictionPrice,
          sessionDate: prediction.sessionDate,

          nationality: user.nationality!,
        },

        select: {
          id: true,
        },
      });
    }

    // -------------------------------------------------------------------------
    // COMMENT
    // -------------------------------------------------------------------------

    if (hasContent || createdPrediction) {
      const commentContent: Prisma.InputJsonValue = plainContent ?? {
        type: "doc",
        content: [],
      };

      await tx.comment.create({
        data: {
          content: commentContent,
          authorId: session.user.id,

          predictionId: createdPrediction?.id ?? null,

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
      });
    }

    return {
      success: true,
    };
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

function hasTextContent(content: JSONContent | null): boolean {
  if (!content) return false;

  if (content.type === "text" && content.text?.trim()) {
    return true;
  }

  return content.content?.some(hasTextContent) ?? false;
}

export async function getMostLikedComments(
  limit = 5,
): Promise<MostLikedComment[]> {
  const comments = await prisma.comment.findMany({
    orderBy: {
      likes: {
        _count: "desc",
      },
    },

    take: limit * 5,

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

  return comments
    .filter((comment) => hasTextContent(comment.content as JSONContent | null))
    .slice(0, limit) as MostLikedComment[];
}

export async function getMarketComments(assetSymbol: string) {
  const comments = await prisma.comment.findMany({
    where: {
      assets: {
        some: {
          assetSymbol,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },

    select: {
      id: true,
      content: true,
      createdAt: true,

      author: {
        select: {
          id: true,
          name: true,
          image: true,
          nationality: true,
        },
      },

      prediction: {
        select: {
          direction: true,
          pointsBet: true,
          status: true,
        },
      },

      replies: {
        orderBy: {
          createdAt: "asc",
        },

        select: {
          id: true,
          content: true,
          createdAt: true,

          author: {
            select: {
              id: true,
              name: true,
              image: true,
              nationality: true,
            },
          },

          _count: {
            select: {
              likes: true,
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

export async function deleteComment(commentId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  const comment = await prisma.comment.findUnique({
    where: {
      id: commentId,
    },
    select: {
      id: true,
      authorId: true,
    },
  });

  if (!comment) {
    throw new Error("Comment not found.");
  }

  const isAuthor = comment.authorId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  if (!isAuthor && !isAdmin) {
    throw new Error("You don't have permission to delete this comment.");
  }

  await prisma.comment.delete({
    where: {
      id: commentId,
    },
  });

  return {
    success: true,
  };
}
