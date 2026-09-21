"use server";

import type { JSONContent } from "@tiptap/react";
import type { Prisma } from "@/generated/prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import {
  ALL_MARKET_SYMBOLS,
  type MarketSymbolItem,
} from "@/lib/data/market-symbols";
import { revalidatePath } from "next/cache";
import { hasEditorContent } from "@/lib/utils/tiptap-utils";

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

  if (!hasEditorContent(content)) {
    throw new Error("Comment cannot be empty.");
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
      updatedAt: true,

      editedAt: true,
      deletedAt: true,
      withdrawnAt: true,
      moderatedAt: true,

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
      predictionId: true,
      content: true,

      deletedAt: true,
      withdrawnAt: true,
      moderatedAt: true,

      _count: {
        select: {
          replies: true,
        },
      },
    },
  });

  if (!comment) {
    throw new Error("Comment not found.");
  }

  if (comment.authorId !== session.user.id) {
    throw new Error("You don't have permission to delete this comment.");
  }

  if (comment.moderatedAt) {
    throw new Error("This comment has been hidden by moderation.");
  }

  if (comment.deletedAt) {
    throw new Error(
      "This comment has already been deleted. The vote will remain.",
    );
  }

  const hasContent = hasCommentContent(comment.content as JSONContent);

  // ---------------------------------------------------------------------------
  // PREDICTION ONLY
  // Nothing to delete. Prediction remains untouched.
  // ---------------------------------------------------------------------------

  if (comment.predictionId && !hasContent && comment._count.replies === 0) {
    return {
      success: true,
      action: "NOTHING_TO_DELETE" as const,
    };
  }

  // ---------------------------------------------------------------------------
  // NORMAL COMMENT
  // No prediction + no replies = physical delete.
  // ---------------------------------------------------------------------------

  if (!comment.predictionId && comment._count.replies === 0) {
    await prisma.comment.delete({
      where: {
        id: commentId,
      },
    });

    return {
      success: true,
      action: "DELETED" as const,
    };
  }

  // ---------------------------------------------------------------------------
  // ALREADY WITHDRAWN
  // ---------------------------------------------------------------------------

  if (comment.withdrawnAt) {
    throw new Error("This comment has already been withdrawn.");
  }

  // ---------------------------------------------------------------------------
  // HAS REPLIES
  // Keep content because replies depend on it.
  // ---------------------------------------------------------------------------

  if (comment._count.replies > 0) {
    await prisma.comment.update({
      where: {
        id: commentId,
      },
      data: {
        withdrawnAt: new Date(),
      },
    });

    return {
      success: true,
      action: "WITHDRAWN" as const,
    };
  }

  // ---------------------------------------------------------------------------
  // PREDICTION + COMMENT
  // Keep prediction, remove accompanying comment.
  // ---------------------------------------------------------------------------

  if (comment.predictionId) {
    await prisma.comment.update({
      where: {
        id: commentId,
      },
      data: {
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
            },
          ],
        },

        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      action: "DELETED" as const,
    };
  }

  throw new Error("Unable to delete comment.");
}

export async function editComment({
  commentId,
  content,
}: {
  commentId: string;
  content: JSONContent;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  const comment = await prisma.comment.findUnique({
    where: {
      id: commentId,
    },
    select: {
      authorId: true,
      deletedAt: true,
      withdrawnAt: true,
      moderatedAt: true,

      _count: {
        select: {
          replies: true,
        },
      },
    },
  });

  if (!comment) {
    throw new Error("Comment not found.");
  }

  if (comment.authorId !== session.user.id) {
    throw new Error("You cannot edit this comment.");
  }

  if (comment.withdrawnAt || comment.moderatedAt) {
    throw new Error("This comment can no longer be edited.");
  }

  if (comment._count.replies > 0) {
    throw new Error(
      "This comment can no longer be edited because it has replies.",
    );
  }

  await prisma.comment.update({
    where: {
      id: commentId,
    },
    data: {
      content: content as Prisma.InputJsonValue,
      editedAt: new Date(),
    },
  });

  return {
    success: true,
  };
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

function hasTextContent(content: JSONContent): boolean {
  if (content.type === "text") {
    return Boolean(content.text?.trim());
  }

  if (!content.content) {
    return false;
  }

  return content.content.some(hasTextContent);
}

export async function getMostLikedComments(): Promise<MostLikedComment[]> {
  const comments = await prisma.comment.findMany({
    where: {
      deletedAt: null,
      withdrawnAt: null,
      moderatedAt: null,

      author: {
        status: "ACTIVE",
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

    // Fetch some extra rows because prediction-only / GIF-only
    // comments may be removed below.
    take: 30,
  });

  return comments
    .filter((comment) => hasTextContent(comment.content as JSONContent))
    .slice(0, 5)
    .map((comment) => ({
      ...comment,
      content: comment.content as JSONContent,
    }));
}

export async function hideComment(commentId: string, reason?: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  if (session.user.role !== "ADMIN") {
    throw new Error("You don't have permission to moderate comments.");
  }

  const comment = await prisma.comment.findUnique({
    where: {
      id: commentId,
    },
    select: {
      id: true,
      authorId: true,
      predictionId: true,
      content: true,

      deletedAt: true,
      withdrawnAt: true,
      moderatedAt: true,
    },
  });

  if (!comment) {
    throw new Error("Comment not found.");
  }

  if (comment.deletedAt) {
    throw new Error("This comment has already been deleted by the author.");
  }

  if (comment.withdrawnAt) {
    throw new Error("This comment has already been withdrawn by the author.");
  }

  if (comment.moderatedAt) {
    throw new Error("This comment is already hidden.");
  }

  const hasContent = hasCommentContent(comment.content as JSONContent);

  if (comment.predictionId && !hasContent) {
    return {
      success: true,
      action: "NOTHING_TO_DELETE" as const,
    };
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.comment.update({
      where: {
        id: commentId,
      },
      data: {
        moderatedAt: now,
      },
    }),

    prisma.moderationAction.create({
      data: {
        type: "HIDE_COMMENT",
        reason: reason?.trim() || null,
        moderatorId: session.user.id,
        targetUserId: comment.authorId,
        commentId,
      },
    }),
  ]);

  return {
    success: true,
    action: "HIDDEN" as const,
  };
}

export async function restoreComment(commentId: string, reason?: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  if (session.user.role !== "ADMIN") {
    throw new Error("You don't have permission to moderate comments.");
  }

  const comment = await prisma.comment.findUnique({
    where: {
      id: commentId,
    },
    select: {
      id: true,
      authorId: true,

      deletedAt: true,
      withdrawnAt: true,
      moderatedAt: true,
    },
  });

  if (!comment) {
    throw new Error("Comment not found.");
  }

  if (comment.deletedAt) {
    throw new Error("A comment deleted by its author cannot be restored.");
  }

  if (comment.withdrawnAt) {
    throw new Error("A comment withdrawn by its author cannot be restored.");
  }

  if (!comment.moderatedAt) {
    throw new Error("This comment is not hidden.");
  }

  await prisma.$transaction([
    prisma.comment.update({
      where: {
        id: commentId,
      },
      data: {
        moderatedAt: null,
      },
    }),

    prisma.moderationAction.create({
      data: {
        type: "RESTORE_COMMENT",
        reason: reason?.trim() || null,
        moderatorId: session.user.id,
        targetUserId: comment.authorId,
        commentId,
      },
    }),
  ]);

  return {
    success: true,
    action: "RESTORED" as const,
  };
}

function hasCommentContent(content: JSONContent): boolean {
  if (content.type === "text") {
    return Boolean(content.text?.trim());
  }

  if (content.type === "image" && content.attrs?.src) {
    return true;
  }

  if (!content.content) {
    return false;
  }

  return content.content.some(hasCommentContent);
}
