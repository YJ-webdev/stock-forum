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
import { moderateContent } from "@/lib/moderation/moderate-content";
import { getContentText } from "@/lib/moderation/get-content-text";

type PredictionInput = {
  direction: "BULL" | "BEAR";
  pointsBet: number;
  sessionDate: Date;
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
  // AUTH
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  const userId = session.user.id;

  // SELECTED MARKETS
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

  // PREDICTION VALIDATION
  if (prediction && selectedMarkets.length !== 1) {
    throw new Error("A prediction must belong to exactly one market.");
  }

  if (prediction) {
    if (
      !Number.isInteger(prediction.pointsBet) ||
      prediction.pointsBet < 0 ||
      prediction.pointsBet > 500
    ) {
      throw new Error("Prediction must be between 0 and 500 points.");
    }

    if (
      !(prediction.sessionDate instanceof Date) ||
      Number.isNaN(prediction.sessionDate.getTime())
    ) {
      throw new Error("Invalid prediction session.");
    }
  }

  // CONTENT
  const hasContent = content !== null && hasEditorContent(content);

  if (!hasContent && !prediction) {
    throw new Error("Please write a comment or select a GIF.");
  }

  const plainContent = hasContent
    ? (JSON.parse(JSON.stringify(content)) as Prisma.InputJsonValue)
    : null;

  // AUTO MODERATION
  const moderationText =
    hasContent && content !== null ? getContentText(content) : "";

  const moderationResult = moderateContent(moderationText);

  const commentVisibility = moderationResult.shouldBePrivate
    ? "PRIVATE"
    : "PUBLIC";

  // PREDICTION NATIONALITY
  let predictionNationality: string | null = null;

  if (prediction) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { nationality: true },
    });

    if (!user) {
      throw new Error("User not found.");
    }

    if (!user.nationality) {
      throw new Error("Please set your nationality before voting.");
    }

    predictionNationality = user.nationality;
  }

  // REFERENCE CLOSE
  // Fetch external market data before opening the transaction.
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

  // ENSURE MARKET ASSETS EXIST
  await Promise.all(
    selectedMarkets.map((market) =>
      prisma.marketAsset.upsert({
        where: { symbol: market.symbol },

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

  // TRANSACTION
  const result = await prisma.$transaction(async (tx) => {
    let createdPrediction: { id: string } | null = null;

    if (prediction) {
      const market = selectedMarkets[0];

      if (referenceClose === null) {
        throw new Error("Could not determine the previous market close.");
      }

      if (!predictionNationality) {
        throw new Error("Please set your nationality before voting.");
      }

      // CREATE PREDICTION
      createdPrediction = await tx.prediction.create({
        data: {
          userId,
          symbol: market.symbol,
          direction: prediction.direction,
          pointsBet: prediction.pointsBet,
          referenceClose,
          sessionDate: prediction.sessionDate,
          nationality: predictionNationality,
        },
        select: { id: true },
      });

      // OPTIONAL POINT BET
      if (prediction.pointsBet > 0) {
        await tx.pointBalance.upsert({
          where: { userId },
          update: {},
          create: {
            userId,
            points: 10000,
          },
        });

        // Conditional deduction prevents concurrent bets
        // from taking the balance below zero.
        const deducted = await tx.pointBalance.updateMany({
          where: {
            userId,
            points: { gte: prediction.pointsBet },
          },
          data: {
            points: { decrement: prediction.pointsBet },
          },
        });

        if (deducted.count !== 1) {
          throw new Error("You do not have enough points.");
        }

        await tx.pointTransaction.create({
          data: {
            userId,
            predictionId: createdPrediction.id,
            type: "BET",
            amount: -prediction.pointsBet,
          },
        });
      }
    }

    // COMMENT
    let createdComment: { id: string } | null = null;

    if (hasContent || createdPrediction) {
      const commentContent: Prisma.InputJsonValue = plainContent ?? {
        type: "doc",
        content: [],
      };

      createdComment = await tx.comment.create({
        data: {
          content: commentContent,
          hasContent,
          authorId: userId,
          predictionId: createdPrediction?.id ?? null,
          visibility: commentVisibility,

          assets: {
            create: selectedMarkets.map((market) => ({
              asset: {
                connect: { symbol: market.symbol },
              },
            })),
          },
        },
        select: { id: true },
      });
    }

    // Return an existing balance for any prediction.
    // A zero-point vote does not create a balance.
    const pointBalance = prediction
      ? await tx.pointBalance.findUnique({
          where: { userId },
          select: { points: true },
        })
      : null;

    return {
      success: true,
      commentId: createdComment?.id ?? null,
      predictionId: createdPrediction?.id ?? null,
      points: pointBalance?.points ?? null,
    };
  });

  // Private comments are also returned to their author.
  const createdComment = result.commentId
    ? await getCommentById(result.commentId, userId)
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
    priority: "CONTENT" | "VOTE_ONLY" | "PREVIOUS";
  } | null,
  currentSessionStartMs: number | null = null,
) {
  const session = await auth();

  const userId = session?.user?.id ?? null;
  const isAdmin = session?.user?.role === "ADMIN";

  const visibilityWhere = isAdmin
    ? {}
    : userId
      ? {
          OR: [
            { visibility: "PUBLIC" as const },
            {
              visibility: "PRIVATE" as const,
              authorId: userId,
            },
          ],
        }
      : { visibility: "PUBLIC" as const };

  const baseWhere: Prisma.CommentWhereInput = {
    assets: {
      some: { assetSymbol },
    },
    ...visibilityWhere,
  };

  const select = {
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
      where: userId ? { userId } : { userId: { in: [] as string[] } },
      select: { id: true },
    },

    _count: {
      select: {
        likes: true,
        replies: {
          where: visibilityWhere,
        },
      },
    },
  } satisfies Prisma.CommentSelect;

  type SelectedComment = Prisma.CommentGetPayload<{
    select: typeof select;
  }>;

  type Priority = "CONTENT" | "VOTE_ONLY" | "PREVIOUS";

  const orderBy: Prisma.CommentOrderByWithRelationInput[] = [
    { createdAt: "desc" },
    { id: "desc" },
  ];

  const sessionStart =
    currentSessionStartMs === null ? null : new Date(currentSessionStartMs);

  if (sessionStart && !Number.isFinite(sessionStart.getTime())) {
    throw new Error("Invalid session start.");
  }

  const cursorDate = cursor ? new Date(cursor.createdAt) : null;

  if (cursorDate && !Number.isFinite(cursorDate.getTime())) {
    throw new Error("Invalid comment cursor.");
  }

  const olderThanCursorWhere: Prisma.CommentWhereInput =
    cursor && cursorDate
      ? {
          OR: [
            { createdAt: { lt: cursorDate } },
            {
              createdAt: cursorDate,
              id: { lt: cursor.id },
            },
          ],
        }
      : {};

  const groups: {
    priority: Priority;
    where: Prisma.CommentWhereInput;
  }[] = sessionStart
    ? [
        {
          priority: "CONTENT",
          where: {
            createdAt: { gte: sessionStart },
            OR: [
              { hasContent: true },
              { predictionId: null },
              ...(userId ? [{ authorId: userId }] : []),
            ],
          },
        },
        {
          priority: "VOTE_ONLY",
          where: {
            createdAt: { gte: sessionStart },
            hasContent: false,
            predictionId: { not: null },
            ...(userId ? { authorId: { not: userId } } : {}),
          },
        },
        {
          priority: "PREVIOUS",
          where: {
            createdAt: { lt: sessionStart },
          },
        },
      ]
    : [
        {
          priority: "PREVIOUS",
          where: {},
        },
      ];

  const fetchComments = async () => {
    const take = MARKET_COMMENTS_PAGE_SIZE + 1;

    const startIndex = cursor
      ? groups.findIndex((group) => group.priority === cursor.priority)
      : 0;

    if (startIndex < 0) {
      throw new Error("Invalid comment cursor. Reload comments.");
    }

    const items: {
      comment: SelectedComment;
      priority: Priority;
    }[] = [];

    for (let index = startIndex; index < groups.length; index++) {
      const group = groups[index];

      const comments = await prisma.comment.findMany({
        where: {
          AND: [
            baseWhere,
            group.where,

            ...(cursor && index === startIndex ? [olderThanCursorWhere] : []),
          ],
        },
        orderBy,
        take: take - items.length,
        select,
      });

      items.push(
        ...comments.map((comment) => ({
          comment,
          priority: group.priority,
        })),
      );

      if (items.length >= take) {
        break;
      }
    }

    return items;
  };

  const [items, totalCount] = await Promise.all([
    fetchComments(),
    prisma.comment.count({
      where: baseWhere,
    }),
  ]);

  const hasMore = items.length > MARKET_COMMENTS_PAGE_SIZE;

  const page = hasMore ? items.slice(0, MARKET_COMMENTS_PAGE_SIZE) : items;

  const lastItem = page.at(-1);

  const nextCursor =
    hasMore && lastItem
      ? {
          createdAt: lastItem.comment.createdAt,
          id: lastItem.comment.id,
          priority: lastItem.priority,
        }
      : null;

  const normalizedComments = page.map(({ comment }) => {
    const { _count, likes, ...rest } = comment;

    return {
      ...rest,
      content: comment.content as JSONContent,
      likeCount: _count.likes,
      replyCount: _count.replies,
      likedByMe: likes.length > 0,
    };
  });

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
    where: { id: commentId },
    select: {
      authorId: true,
      predictionId: true,
      content: true,
    },
  });

  if (!comment) {
    throw new Error("Comment not found.");
  }

  if (comment.authorId !== session.user.id) {
    throw new Error("You don't have permission to delete this comment.");
  }

  // Keep the prediction and remove only the comment content.
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

    const alreadyRemoved = currentText === "Comment deleted by user";

    // Also correct hasContent on previously deleted comments.
    await prisma.comment.update({
      where: { id: commentId },
      data: {
        content: deletedContent as Prisma.InputJsonValue,
        hasContent: false,
        editedAt: null,
      },
    });

    return {
      success: true,
      action: alreadyRemoved
        ? ("ALREADY_CONTENT_REMOVED" as const)
        : ("CONTENT_REMOVED" as const),
      content: deletedContent,
    };
  }

  await prisma.comment.delete({
    where: { id: commentId },
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

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      authorId: true,
      predictionId: true,
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

  // hasEditorContent must recognize both text and GIF/image nodes.
  const hasContent = hasEditorContent(content);

  if (!hasContent && !comment.predictionId) {
    throw new Error("Comment cannot be empty.");
  }

  const updatedContent: JSONContent = hasContent
    ? content
    : { type: "doc", content: [] };

  const editedAt = new Date();

  await prisma.comment.update({
    where: { id: commentId },
    data: {
      content: updatedContent as Prisma.InputJsonValue,
      hasContent,
      editedAt,
    },
  });

  return {
    success: true,
    content: updatedContent,
    editedAt,
  };
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
  // AUTO MODERATION
  //
  // Nothing is automatically deleted.
  //
  // PUBLIC:
  // - visible to everyone
  //
  // PRIVATE:
  // - visible to the author
  // - visible to admins
  // - hidden from everyone else
  //
  // The author receives the created reply normally regardless of visibility.
  // ---------------------------------------------------------------------------

  const moderationResult = moderateContent(trimmedContent);

  const replyVisibility = moderationResult.shouldBePrivate
    ? "PRIVATE"
    : "PUBLIC";

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

      // -----------------------------------------------------------------------
      // AUTO MODERATION VISIBILITY
      // -----------------------------------------------------------------------

      visibility: replyVisibility,
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
  //
  // IMPORTANT:
  //
  // A PRIVATE reply must NOT send a normal social notification.
  //
  // Otherwise another user could receive:
  //
  //   "Someone replied to your comment."
  //
  // even though that reply is PRIVATE and should not be visible to them.
  //
  // The author still receives the created reply normally above.
  // ---------------------------------------------------------------------------

  if (replyVisibility === "PUBLIC") {
    if (parentReply) {
      // -----------------------------------------------------------------------
      // REPLIED TO ANOTHER REPLY
      // -----------------------------------------------------------------------

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
      // -----------------------------------------------------------------------
      // REPLIED DIRECTLY TO COMMENT
      // -----------------------------------------------------------------------

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
  }

  // ---------------------------------------------------------------------------
  // RESULT
  //
  // PUBLIC and PRIVATE replies are returned identically.
  //
  // Therefore the author does not get a different posting experience when
  // automatic moderation makes the reply PRIVATE.
  // ---------------------------------------------------------------------------

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

export async function getCommentReplies(commentId: string) {
  const session = await auth();

  const userId = session?.user?.id ?? null;
  const isAdmin = session?.user?.role === "ADMIN";

  // ---------------------------------------------------------------------------
  // VISIBILITY
  //
  // ADMIN
  // - PUBLIC
  // - PRIVATE
  //
  // LOGGED-IN USER
  // - all PUBLIC replies
  // - their own PRIVATE replies
  //
  // GUEST
  // - PUBLIC replies only
  // ---------------------------------------------------------------------------

  const visibilityWhere = isAdmin
    ? {}
    : userId
      ? {
          OR: [
            {
              visibility: "PUBLIC" as const,
            },
            {
              visibility: "PRIVATE" as const,
              authorId: userId,
            },
          ],
        }
      : {
          visibility: "PUBLIC" as const,
        };

  // ---------------------------------------------------------------------------
  // REPLIES
  // ---------------------------------------------------------------------------

  const replies = await prisma.reply.findMany({
    where: {
      commentId,

      ...visibilityWhere,
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

          replies: {
            where: isAdmin
              ? {}
              : userId
                ? {
                    OR: [
                      {
                        visibility: "PUBLIC",
                      },
                      {
                        visibility: "PRIVATE",
                        authorId: userId,
                      },
                    ],
                  }
                : {
                    visibility: "PUBLIC",
                  },
          },
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

export async function reportComment(commentId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Log in to report.");
  }

  const comment = await prisma.comment.findUnique({
    where: {
      id: commentId,
    },
    select: {
      id: true,
    },
  });

  if (!comment) {
    throw new Error("Comment not found.");
  }

  const eventKeyPrefix = `comment-report:${commentId}:`;

  const existingReport = await prisma.notification.findFirst({
    where: {
      eventKey: {
        startsWith: eventKeyPrefix,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingReport) {
    throw new Error("This comment has already been reported. Thank you.");
  }

  const admins = await prisma.user.findMany({
    where: {
      role: "ADMIN",
    },
    select: {
      id: true,
    },
  });

  if (admins.length === 0) {
    throw new Error("No administrator is available.");
  }

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,

      actorId: null,

      type: "COMMENT_REPORTED",

      title: "Comment reported",
      message: "A comment has been reported for review.",

      commentId,

      eventKey: `${eventKeyPrefix}${admin.id}`,
    })),
  });

  return {
    success: true,
  };
}

export async function reportReply(replyId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Log in to report.");
  }

  const reply = await prisma.reply.findUnique({
    where: {
      id: replyId,
    },
    select: {
      id: true,
      commentId: true,
    },
  });

  if (!reply) {
    throw new Error("Reply not found.");
  }

  const eventKeyPrefix = `reply-report:${replyId}:`;

  const existingReport = await prisma.notification.findFirst({
    where: {
      eventKey: {
        startsWith: eventKeyPrefix,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingReport) {
    throw new Error("This reply has already been reported.");
  }

  const admins = await prisma.user.findMany({
    where: {
      role: "ADMIN",
    },
    select: {
      id: true,
    },
  });

  if (admins.length === 0) {
    throw new Error("No administrator is available.");
  }

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,

      // Guest reports have no actor.
      actorId: null,

      type: "REPLY_REPORTED",

      title: "Reply reported",
      message: "A reply has been reported for review.",

      // Useful for navigating directly to the thread.
      commentId: reply.commentId,
      replyId,

      eventKey: `${eventKeyPrefix}${admin.id}`,
    })),
  });

  return {
    success: true,
  };
}

export type HomeCommentSort = "latest" | "most-liked";

export interface HomeCommentCursor {
  id: string;
  createdAt: Date;
  likeCount: number;

  // Prevent using a cursor from a different filter or sort.
  sort: HomeCommentSort;
  assetSymbol: string | null;
}

interface GetHomeCommentsOptions {
  assetSymbol?: string | null;
  sort?: HomeCommentSort;
  cursor?: HomeCommentCursor | null;
}

const HOME_COMMENTS_PAGE_SIZE = 10;

export async function getHomeComments({
  assetSymbol = null,
  sort = "latest",
  cursor = null,
}: GetHomeCommentsOptions = {}) {
  const session = await auth();

  const userId = session?.user?.id ?? null;
  const isAdmin = session?.user?.role === "ADMIN";
  const marketSymbol = assetSymbol?.trim() || null;

  if (sort !== "latest" && sort !== "most-liked") {
    throw new Error("Invalid comment sort.");
  }

  const visibilityWhere = isAdmin
    ? {}
    : userId
      ? {
          OR: [
            { visibility: "PUBLIC" as const },
            {
              visibility: "PRIVATE" as const,
              authorId: userId,
            },
          ],
        }
      : {
          visibility: "PUBLIC" as const,
        };

  const baseWhere: Prisma.CommentWhereInput = {
    AND: [
      visibilityWhere,
      {
        hasContent: true,
        withdrawnAt: null,
        moderatedAt: null,
      },
      ...(marketSymbol
        ? [
            {
              assets: {
                some: {
                  assetSymbol: marketSymbol,
                },
              },
            },
          ]
        : []),
    ],
  };

  const select = {
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

    assets: {
      select: {
        assetSymbol: true,
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
      where: userId ? { userId } : { userId: { in: [] as string[] } },
      select: {
        id: true,
      },
    },

    _count: {
      select: {
        likes: true,
        replies: {
          where: visibilityWhere,
        },
      },
    },
  } satisfies Prisma.CommentSelect;

  let cursorDate: Date | null = null;

  if (cursor) {
    cursorDate = new Date(cursor.createdAt);

    if (
      !Number.isFinite(cursorDate.getTime()) ||
      !cursor.id ||
      !Number.isSafeInteger(cursor.likeCount) ||
      cursor.likeCount < 0 ||
      cursor.sort !== sort ||
      cursor.assetSymbol !== marketSymbol
    ) {
      throw new Error("Invalid comment cursor. Reload comments.");
    }
  }

  const orderBy: Prisma.CommentOrderByWithRelationInput[] =
    sort === "most-liked"
      ? [{ likes: { _count: "desc" } }, { createdAt: "desc" }, { id: "desc" }]
      : [{ createdAt: "desc" }, { id: "desc" }];

  const olderThanCursorWhere: Prisma.CommentWhereInput =
    cursor && cursorDate
      ? {
          OR: [
            {
              createdAt: {
                lt: cursorDate,
              },
            },
            {
              createdAt: cursorDate,
              id: {
                lt: cursor.id,
              },
            },
          ],
        }
      : {};

  /*
   * Prisma supports ordering by relation count, but its standard
   * where input cannot express "likes count < cursor.likeCount".
   * Use Prisma's record cursor for Most liked.
   */
  if (cursor && sort === "most-liked") {
    const cursorExists = await prisma.comment.findFirst({
      where: {
        AND: [baseWhere, { id: cursor.id }],
      },
      select: {
        id: true,
      },
    });

    if (!cursorExists) {
      throw new Error("The discussion list changed. Reload comments.");
    }
  }

  const [items, totalCount] = await Promise.all([
    prisma.comment.findMany({
      where:
        sort === "latest" && cursor
          ? {
              AND: [baseWhere, olderThanCursorWhere],
            }
          : baseWhere,

      orderBy,

      ...(sort === "most-liked" && cursor
        ? {
            cursor: {
              id: cursor.id,
            },
            skip: 1,
          }
        : {}),

      take: HOME_COMMENTS_PAGE_SIZE + 1,
      select,
    }),

    prisma.comment.count({
      where: baseWhere,
    }),
  ]);

  const hasMore = items.length > HOME_COMMENTS_PAGE_SIZE;

  const page = hasMore ? items.slice(0, HOME_COMMENTS_PAGE_SIZE) : items;

  const lastItem = page.at(-1);

  const nextCursor: HomeCommentCursor | null =
    hasMore && lastItem
      ? {
          id: lastItem.id,
          createdAt: lastItem.createdAt,
          likeCount: lastItem._count.likes,
          sort,
          assetSymbol: marketSymbol,
        }
      : null;

  const comments = page.map((comment) => {
    const { _count, likes, ...rest } = comment;

    return {
      ...rest,
      content: comment.content as JSONContent,
      likeCount: _count.likes,
      replyCount: _count.replies,
      likedByMe: likes.length > 0,
    };
  });

  return {
    comments,
    nextCursor,
    totalCount,
  };
}

export type HomeComments = Awaited<
  ReturnType<typeof getHomeComments>
>["comments"];

export async function getHomeCommunityMarkets() {
  const session = await auth();

  const userId = session?.user?.id ?? null;
  const isAdmin = session?.user?.role === "ADMIN";

  const visibilityWhere: Prisma.CommentWhereInput = isAdmin
    ? {}
    : userId
      ? {
          OR: [
            { visibility: "PUBLIC" },
            {
              visibility: "PRIVATE",
              authorId: userId,
            },
          ],
        }
      : {
          visibility: "PUBLIC",
        };

  const comments = await prisma.comment.findMany({
    where: {
      AND: [
        visibilityWhere,
        {
          hasContent: true,
          withdrawnAt: null,
          moderatedAt: null,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      ],
    },
    select: {
      assets: {
        select: {
          assetSymbol: true,
        },
      },
    },
  });

  const counts = new Map<string, number>();

  for (const comment of comments) {
    for (const { assetSymbol } of comment.assets) {
      counts.set(assetSymbol, (counts.get(assetSymbol) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([symbol, commentCount]) => {
      const market = ALL_MARKET_SYMBOLS.find((item) => item.symbol === symbol);

      return {
        symbol,
        displaySymbol: market?.displaySymbol ?? symbol,
        name: market?.name ?? symbol,
        commentCount,
      };
    })
    .sort(
      (a, b) =>
        b.commentCount - a.commentCount ||
        a.displaySymbol.localeCompare(b.displaySymbol),
    );
}
