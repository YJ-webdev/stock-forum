"use server";

import type { JSONContent } from "@tiptap/react";
import type { Prisma } from "@/generated/prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import {
  ALL_MARKET_SYMBOLS,
  type MarketSymbolItem,
} from "@/lib/data/market-symbols";

import { hasEditorContent } from "@/lib/utils/tiptap-utils";
import { getReferenceClose } from "@/lib/market/yahoo";

type PredictionInput = {
  direction: "BULL" | "BEAR";
  pointsBet: number;
  sessionDate: Date;
};

type CreateCommentInput = {
  content?: JSONContent | null;
  assetSymbols: string[];
  prediction?: PredictionInput | null;
};

async function getCommentById(commentId: string, userId: string) {
  const comment = await prisma.comment.findUnique({
    where: {
      id: commentId,
    },

    select: {
      id: true,
      content: true,

      createdAt: true,
      updatedAt: true,

      editedAt: true,
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

      likes: {
        where: {
          userId,
        },
        select: {
          id: true,
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

  if (!comment) {
    return null;
  }

  const { _count, likes, ...rest } = comment;

  return {
    ...rest,

    content: comment.content as JSONContent,

    likeCount: _count.likes,
    replyCount: _count.replies,

    likedByMe: likes.length > 0,
  };
}

export async function createComment({
  content = null,
  assetSymbols,
  prediction = null,
}: CreateCommentInput) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },

    select: {
      nationality: true,
    },
  });

  if (!user) {
    throw new Error("Log in to comment.");
  }

  if (prediction && !user.nationality) {
    throw new Error("Please set your nationality before voting.");
  }

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

  if (prediction && selectedMarkets.length !== 1) {
    throw new Error("A prediction must belong to exactly one market.");
  }

  if (prediction) {
    if (
      !Number.isInteger(prediction.pointsBet) ||
      prediction.pointsBet < 50 ||
      prediction.pointsBet > 500
    ) {
      throw new Error("Prediction must be between 50 and 500 points.");
    }

    if (
      !(prediction.sessionDate instanceof Date) ||
      Number.isNaN(prediction.sessionDate.getTime())
    ) {
      throw new Error("Invalid prediction session.");
    }
  }

  const hasContent =
    content !== null &&
    Array.isArray(content.content) &&
    content.content.length > 0;

  if (!hasContent && !prediction) {
    throw new Error("Please write a comment or select a GIF.");
  }

  const plainContent = hasContent
    ? (JSON.parse(JSON.stringify(content)) as Prisma.InputJsonValue)
    : null;

  // ---------------------------------------------------------------------------
  // REFERENCE CLOSE
  //
  // IMPORTANT:
  // This is intentionally determined on the server.
  //
  // The browser must never be trusted to provide the market price used to
  // determine whether a prediction wins or loses.
  //
  // This happens BEFORE the Prisma transaction because Yahoo is an external
  // network request. We don't want to keep a DB transaction open while waiting
  // for market data.
  // ---------------------------------------------------------------------------

  let referenceClose: number | null = null;

  if (prediction) {
    const market = selectedMarkets[0];

    referenceClose = await getReferenceClose(
      market.symbol,
      prediction.sessionDate,
    );

    if (!Number.isFinite(referenceClose) || referenceClose <= 0) {
      throw new Error("Could not determine the previous market close.");
    }
  }

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

  const result = await prisma.$transaction(async (tx) => {
    let createdPrediction: { id: string } | null = null;

    if (prediction) {
      const market = selectedMarkets[0];

      if (referenceClose === null) {
        throw new Error("Could not determine the previous market close.");
      }

      await tx.pointBalance.upsert({
        where: {
          userId: session.user.id,
        },

        update: {},

        create: {
          userId: session.user.id,
          points: 10000,
        },
      });

      createdPrediction = await tx.prediction.create({
        data: {
          userId: session.user.id,
          symbol: market.symbol,

          direction: prediction.direction,
          pointsBet: prediction.pointsBet,

          referenceClose,
          sessionDate: prediction.sessionDate,

          nationality: user.nationality!,
        },

        select: {
          id: true,
        },
      });

      // -----------------------------------------------------------------------
      // DEDUCT BET
      //
      // updateMany + points >= pointsBet ensures the balance cannot go
      // negative if multiple prediction requests arrive at roughly the
      // same time.
      //
      // Because this happens in the same transaction as Prediction creation,
      // failure here rolls back the Prediction as well.
      // -----------------------------------------------------------------------

      const deducted = await tx.pointBalance.updateMany({
        where: {
          userId: session.user.id,

          points: {
            gte: prediction.pointsBet,
          },
        },

        data: {
          points: {
            decrement: prediction.pointsBet,
          },
        },
      });

      if (deducted.count !== 1) {
        throw new Error("You do not have enough points.");
      }

      await tx.pointTransaction.create({
        data: {
          userId: session.user.id,
          predictionId: createdPrediction.id,

          type: "BET",

          amount: -prediction.pointsBet,
        },
      });
    }

    let createdComment: { id: string } | null = null;

    if (hasContent || createdPrediction) {
      const commentContent: Prisma.InputJsonValue = plainContent ?? {
        type: "doc",
        content: [],
      };

      createdComment = await tx.comment.create({
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

        select: {
          id: true,
        },
      });
    }

    const pointBalance = prediction
      ? await tx.pointBalance.findUnique({
          where: {
            userId: session.user.id,
          },

          select: {
            points: true,
          },
        })
      : null;

    return {
      success: true,
      commentId: createdComment?.id ?? null,
      predictionId: createdPrediction?.id ?? null,
      points: pointBalance?.points ?? null,
    };
  });
  const createdComment = result.commentId
    ? await getCommentById(result.commentId, session.user.id)
    : null;

  return {
    ...result,
    comment: createdComment,
  };
}

const MARKET_COMMENTS_PAGE_SIZE = 20;

export async function getMarketComments(
  assetSymbol: string,
  cursor?: {
    createdAt: Date;
    id: string;
  } | null,
) {
  const session = await auth();
  const userId = session?.user?.id;

  const baseWhere = {
    assets: {
      some: {
        assetSymbol,
      },
    },
  };

  const [comments, totalCount] = await Promise.all([
    prisma.comment.findMany({
      where: {
        ...baseWhere,

        ...(cursor
          ? {
              OR: [
                {
                  createdAt: {
                    lt: cursor.createdAt,
                  },
                },
                {
                  createdAt: cursor.createdAt,
                  id: {
                    lt: cursor.id,
                  },
                },
              ],
            }
          : {}),
      },

      orderBy: [
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],

      take: MARKET_COMMENTS_PAGE_SIZE + 1,

      select: {
        id: true,
        content: true,

        createdAt: true,
        updatedAt: true,

        editedAt: true,
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

        likes: userId
          ? {
              where: {
                userId,
              },
              select: {
                id: true,
              },
            }
          : false,

        _count: {
          select: {
            likes: true,
            replies: true,
          },
        },
      },
    }),

    prisma.comment.count({
      where: baseWhere,
    }),
  ]);

  const hasMore = comments.length > MARKET_COMMENTS_PAGE_SIZE;

  const page = hasMore
    ? comments.slice(0, MARKET_COMMENTS_PAGE_SIZE)
    : comments;

  const normalizedComments = page.map((comment) => {
    const { _count, likes, ...rest } = comment;

    return {
      ...rest,

      content: comment.content as JSONContent,

      likeCount: _count.likes,
      replyCount: _count.replies,

      likedByMe: Array.isArray(likes) && likes.length > 0,
    };
  });

  const lastComment = normalizedComments.at(-1);

  const nextCursor =
    hasMore && lastComment
      ? {
          createdAt: lastComment.createdAt,
          id: lastComment.id,
        }
      : null;

  return {
    comments: normalizedComments,
    nextCursor,
    totalCount,
  };
}

export type MarketCommentsPage = Awaited<ReturnType<typeof getMarketComments>>;
export type MarketPageComments = MarketCommentsPage["comments"];

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

      withdrawnAt: true,
      moderatedAt: true,
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

  // ---------------------------------------------------------------------------
  // PREDICTION COMMENT
  // ---------------------------------------------------------------------------

  if (comment.predictionId) {
    const deletedContent: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Comment deleted by user",
            },
          ],
        },
      ],
    };

    const currentContent = comment.content as JSONContent;

    const currentText =
      currentContent.content
        ?.flatMap((node) => node.content ?? [])
        .map((node) => node.text ?? "")
        .join("")
        .trim() ?? "";

    if (currentText === "Comment deleted by user") {
      return {
        success: true,
        action: "ALREADY_CONTENT_REMOVED" as const,
        content: deletedContent,
      };
    }

    await prisma.comment.update({
      where: {
        id: commentId,
      },

      data: {
        content: deletedContent,
        editedAt: null,
      },
    });

    return {
      success: true,
      action: "CONTENT_REMOVED" as const,
      content: deletedContent,
    };
  }

  // ---------------------------------------------------------------------------
  // NORMAL COMMENT
  // ---------------------------------------------------------------------------

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

  if (!hasEditorContent(content)) {
    throw new Error("Comment cannot be empty.");
  }

  const comment = await prisma.comment.findUnique({
    where: {
      id: commentId,
    },

    select: {
      authorId: true,
      withdrawnAt: true,
      moderatedAt: true,
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

  const editedAt = new Date();

  await prisma.comment.update({
    where: {
      id: commentId,
    },

    data: {
      content: content as Prisma.InputJsonValue,
      editedAt,
    },
  });

  return {
    success: true,
    content,
    editedAt,
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

export async function getMostLikedComments(
  limit = 5,
): Promise<MostLikedComment[]> {
  const comments = await prisma.comment.findMany({
    where: {
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

    // Fetch extras because some comments may be filtered out below.
    take: Math.max(limit * 3, limit),
  });

  return comments
    .filter((comment) => {
      const content = comment.content as JSONContent;

      return hasTextContent(content) && !isDeletedCommentContent(content);
    })
    .slice(0, limit)
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
      moderatedAt: true,
    },
  });

  if (!comment) {
    throw new Error("Comment not found.");
  }

  if (comment.moderatedAt) {
    return {
      success: true,
      action: "ALREADY_HIDDEN" as const,
      moderatedAt: comment.moderatedAt,
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
    moderatedAt: now,
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
      moderatedAt: true,
    },
  });

  if (!comment) {
    throw new Error("Comment not found.");
  }

  if (!comment.moderatedAt) {
    return {
      success: true,
      action: "ALREADY_VISIBLE" as const,
    };
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

export async function createReply({
  commentId,
  parentId = null,
  content,
  gifUrl = null,
}: {
  commentId: string;
  parentId?: string | null;
  content: string;
  gifUrl?: string | null;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  const userId = session.user.id;
  const trimmedContent = content.trim();

  if (!trimmedContent && !gifUrl) {
    throw new Error("Please write a reply or select a GIF.");
  }

  // ---------------------------------------------------------------------------
  // COMMENT
  // ---------------------------------------------------------------------------

  const comment = await prisma.comment.findUnique({
    where: {
      id: commentId,
    },

    select: {
      id: true,
      authorId: true,
      withdrawnAt: true,
      moderatedAt: true,
    },
  });

  if (!comment) {
    throw new Error("Comment not found.");
  }

  if (comment.withdrawnAt || comment.moderatedAt) {
    throw new Error("You cannot reply to this comment.");
  }

  // ---------------------------------------------------------------------------
  // PARENT REPLY
  // ---------------------------------------------------------------------------

  let parentReply: {
    id: string;
    commentId: string;
    authorId: string;
    moderatedAt: Date | null;
  } | null = null;

  if (parentId) {
    parentReply = await prisma.reply.findUnique({
      where: {
        id: parentId,
      },

      select: {
        id: true,
        commentId: true,
        authorId: true,
        moderatedAt: true,
      },
    });

    if (!parentReply) {
      throw new Error("Reply not found.");
    }

    // Prevent connecting a reply from another comment thread.
    if (parentReply.commentId !== commentId) {
      throw new Error("Invalid parent reply.");
    }

    if (parentReply.moderatedAt) {
      throw new Error("You cannot reply to a hidden reply.");
    }
  }

  // ---------------------------------------------------------------------------
  // CREATE REPLY
  // ---------------------------------------------------------------------------

  const reply = await prisma.reply.create({
    data: {
      content: trimmedContent,
      gifUrl,

      commentId,
      authorId: userId,

      parentId,
    },

    select: {
      id: true,

      commentId: true,
      parentId: true,

      content: true,
      gifUrl: true,

      createdAt: true,
      updatedAt: true,

      editedAt: true,
      moderatedAt: true,

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
          replies: true,
        },
      },
    },
  });

  // ---------------------------------------------------------------------------
  // NOTIFICATION
  // ---------------------------------------------------------------------------

  if (parentReply) {
    // -------------------------------------------------------------------------
    // REPLIED TO ANOTHER REPLY
    // -------------------------------------------------------------------------

    if (parentReply.authorId !== userId) {
      await prisma.notification.create({
        data: {
          // Recipient = author of the reply being replied to.
          userId: parentReply.authorId,

          // Actor = current user who created the new reply.
          actorId: userId,

          type: "REPLY_REPLIED",

          title: "New reply",
          message: `${session.user.name ?? "Someone"} replied to your reply.`,

          // IMPORTANT:
          // Store the NEW reply, not the parent reply.
          // This lets the notification navigate directly to the response.
          replyId: reply.id,

          eventKey: `reply-replied:${reply.id}`,
        },
      });
    }
  } else {
    // -------------------------------------------------------------------------
    // REPLIED DIRECTLY TO COMMENT
    // -------------------------------------------------------------------------

    if (comment.authorId !== userId) {
      await prisma.notification.create({
        data: {
          // Recipient = author of the original comment.
          userId: comment.authorId,

          // Actor = current user who created the reply.
          actorId: userId,

          type: "COMMENT_REPLIED",

          title: "New reply",
          message: `${session.user.name ?? "Someone"} replied to your comment.`,

          // IMPORTANT:
          // Store the NEW reply here too.
          // We can get its original comment through reply.commentId.
          replyId: reply.id,

          eventKey: `comment-replied:${reply.id}`,
        },
      });
    }
  }

  return {
    success: true,
    reply,
  };
}

export async function editReply({
  replyId,
  content,
  gifUrl = null,
}: {
  replyId: string;
  content: string;
  gifUrl?: string | null;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  const trimmedContent = content.trim();

  if (!trimmedContent && !gifUrl) {
    throw new Error("Reply cannot be empty.");
  }

  const reply = await prisma.reply.findUnique({
    where: {
      id: replyId,
    },

    select: {
      id: true,
      authorId: true,
      moderatedAt: true,
    },
  });

  if (!reply) {
    throw new Error("Reply not found.");
  }

  if (reply.authorId !== session.user.id) {
    throw new Error("You cannot edit this reply.");
  }

  if (reply.moderatedAt) {
    throw new Error("A hidden reply cannot be edited.");
  }

  const updatedReply = await prisma.reply.update({
    where: {
      id: replyId,
    },

    data: {
      content: trimmedContent,
      gifUrl,
      editedAt: new Date(),
    },

    select: {
      id: true,

      commentId: true,
      parentId: true,

      content: true,
      gifUrl: true,

      createdAt: true,
      updatedAt: true,

      editedAt: true,
      moderatedAt: true,

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
          replies: true,
        },
      },
    },
  });

  return {
    success: true,
    reply: updatedReply,
  };
}

export async function deleteReply(replyId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  const reply = await prisma.reply.findUnique({
    where: {
      id: replyId,
    },

    select: {
      id: true,
      authorId: true,
      moderatedAt: true,
    },
  });

  if (!reply) {
    throw new Error("Reply not found.");
  }

  if (reply.authorId !== session.user.id) {
    throw new Error("You cannot delete this reply.");
  }

  if (reply.moderatedAt) {
    throw new Error("A hidden reply cannot be deleted.");
  }

  // Hard delete.
  //
  // Child replies are automatically deleted because:
  //
  // parent Reply
  //   ↓ onDelete: Cascade
  // child Reply
  //   ↓ onDelete: Cascade
  // descendant Reply
  //
  // ReplyLike rows are also deleted through their cascade relation.

  await prisma.reply.delete({
    where: {
      id: replyId,
    },
  });

  return {
    success: true,
  };
}

export async function hideReply(replyId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  if (session.user.role !== "ADMIN") {
    throw new Error("You don't have permission to moderate replies.");
  }

  const reply = await prisma.reply.findUnique({
    where: {
      id: replyId,
    },

    select: {
      id: true,
      moderatedAt: true,
    },
  });

  if (!reply) {
    throw new Error("Reply not found.");
  }

  if (reply.moderatedAt) {
    return {
      success: true,
      action: "ALREADY_HIDDEN" as const,
    };
  }

  await prisma.reply.update({
    where: {
      id: replyId,
    },

    data: {
      moderatedAt: new Date(),
    },
  });

  return {
    success: true,
    action: "HIDDEN" as const,
  };
}

export async function restoreReply(replyId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  if (session.user.role !== "ADMIN") {
    throw new Error("You don't have permission to moderate replies.");
  }

  const reply = await prisma.reply.findUnique({
    where: {
      id: replyId,
    },

    select: {
      id: true,
      moderatedAt: true,
    },
  });

  if (!reply) {
    throw new Error("Reply not found.");
  }

  if (!reply.moderatedAt) {
    return {
      success: true,
      action: "ALREADY_VISIBLE" as const,
    };
  }

  await prisma.reply.update({
    where: {
      id: replyId,
    },

    data: {
      moderatedAt: null,
    },
  });

  return {
    success: true,
    action: "RESTORED" as const,
  };
}

function isDeletedCommentContent(content: JSONContent): boolean {
  const text =
    content.content
      ?.flatMap((node) => node.content ?? [])
      .map((node) => node.text ?? "")
      .join("")
      .trim() ?? "";

  return text === "Comment deleted by user";
}

export async function getCommentReplies(commentId: string) {
  const session = await auth();
  const userId = session?.user?.id;

  const replies = await prisma.reply.findMany({
    where: {
      commentId,
    },

    orderBy: {
      createdAt: "asc",
    },

    select: {
      id: true,

      commentId: true,
      parentId: true,

      content: true,
      gifUrl: true,

      createdAt: true,
      updatedAt: true,

      editedAt: true,
      moderatedAt: true,

      author: {
        select: {
          id: true,
          name: true,
          image: true,
          nationality: true,
        },
      },

      // -----------------------------------------------------------------------
      // CURRENT USER'S LIKE
      // -----------------------------------------------------------------------

      likes: userId
        ? {
            where: {
              userId,
            },
            select: {
              id: true,
            },
          }
        : false,

      // -----------------------------------------------------------------------
      // COUNTS
      // -----------------------------------------------------------------------

      _count: {
        select: {
          likes: true,
          replies: true,
        },
      },
    },
  });

  // ---------------------------------------------------------------------------
  // NORMALIZE
  // ---------------------------------------------------------------------------

  return replies.map((reply) => {
    const { _count, likes, ...rest } = reply;

    return {
      ...rest,

      likeCount: _count.likes,
      replyCount: _count.replies,

      likedByMe: Array.isArray(likes) && likes.length > 0,
    };
  });
}
