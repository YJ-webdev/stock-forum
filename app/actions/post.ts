"use server";

import type { JSONContent } from "@tiptap/react";
import type { Prisma } from "@/generated/prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import {
  ALL_MARKET_SYMBOLS,
  type MarketSymbolItem,
} from "@/lib/data/market-symbols";

import { resolveLanguage } from "@/lib/data/languages";
import { COMMENT_ACTION_LABELS } from "@/lib/data/translations";

import { hasEditorContent } from "@/lib/utils/tiptap-utils";
import { getReferenceClose } from "@/lib/market/yahoo";
import { moderateContent } from "@/lib/moderation/moderate-content";
import { getContentText } from "@/lib/moderation/get-content-text";

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

const MARKET_COMMENTS_PAGE_SIZE = 20;
const HOME_COMMENTS_PAGE_SIZE = 10;
const DELETED_COMMENT_TEXT = "Comment deleted by user";

const AUTHOR_SELECT = {
  id: true,
  name: true,
  image: true,
  nationality: true,
} satisfies Prisma.UserSelect;

const PREDICTION_SELECT = {
  direction: true,
  pointsBet: true,
  status: true,
} satisfies Prisma.PredictionSelect;

const REPLY_SELECT = {
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
    select: AUTHOR_SELECT,
  },
  _count: {
    select: {
      likes: true,
      replies: true,
    },
  },
} satisfies Prisma.ReplySelect;

function getVisibilityWhere(userId: string | null, isAdmin: boolean) {
  if (isAdmin) {
    return {};
  }

  if (userId) {
    return {
      OR: [
        { visibility: "PUBLIC" as const },
        {
          visibility: "PRIVATE" as const,
          authorId: userId,
        },
      ],
    };
  }

  return { visibility: "PUBLIC" as const };
}

function getCommentSelect(userId: string | null, isAdmin: boolean) {
  return {
    id: true,
    content: true,
    createdAt: true,
    updatedAt: true,
    editedAt: true,
    withdrawnAt: true,
    moderatedAt: true,

    author: {
      select: AUTHOR_SELECT,
    },

    prediction: {
      select: PREDICTION_SELECT,
    },

    likes: {
      where: userId ? { userId } : { userId: { in: [] as string[] } },
      select: { id: true },
    },

    _count: {
      select: {
        likes: true,
        replies: {
          where: getVisibilityWhere(userId, isAdmin),
        },
      },
    },
  } satisfies Prisma.CommentSelect;
}

async function getCommentById(commentId: string, userId: string) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },

    select: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      editedAt: true,
      withdrawnAt: true,
      moderatedAt: true,

      author: {
        select: AUTHOR_SELECT,
      },

      prediction: {
        select: PREDICTION_SELECT,
      },

      likes: {
        where: { userId },
        select: { id: true },
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
  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
  }

  const userId = session.user.id;
  const uniqueSymbols = [...new Set(assetSymbols)];

  if (uniqueSymbols.length === 0) {
    throw new Error(labels.select_board);
  }

  const selectedMarkets = uniqueSymbols
    .map((symbol) =>
      ALL_MARKET_SYMBOLS.find((market) => market.symbol === symbol),
    )
    .filter((market): market is MarketSymbolItem => Boolean(market));

  if (selectedMarkets.length === 0) {
    throw new Error(labels.invalid_board);
  }

  if (prediction && selectedMarkets.length !== 1) {
    throw new Error(labels.single_market);
  }

  if (prediction) {
    if (
      !Number.isInteger(prediction.pointsBet) ||
      prediction.pointsBet < 0 ||
      prediction.pointsBet > 500
    ) {
      throw new Error(labels.invalid_points);
    }

    if (
      !(prediction.sessionDate instanceof Date) ||
      Number.isNaN(prediction.sessionDate.getTime())
    ) {
      throw new Error(labels.invalid_prediction_session);
    }
  }

  const hasContent = content !== null && hasEditorContent(content);

  if (!hasContent && !prediction) {
    throw new Error(labels.write_comment);
  }

  const plainContent = hasContent
    ? (JSON.parse(JSON.stringify(content)) as Prisma.InputJsonValue)
    : null;

  const moderationText =
    hasContent && content !== null ? getContentText(content) : "";

  const moderationResult = moderateContent(moderationText);
  const commentVisibility = moderationResult.shouldBePrivate
    ? "PRIVATE"
    : "PUBLIC";

  let predictionNationality: string | null = null;

  if (prediction) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { nationality: true },
    });

    if (!user) {
      throw new Error(labels.user_not_found);
    }

    if (!user.nationality) {
      throw new Error(labels.nationality_required);
    }

    predictionNationality = user.nationality;
  }

  // Fetch external market data before opening the transaction.
  let referenceClose: number | null = null;

  if (prediction) {
    const market = selectedMarkets[0];

    referenceClose = await getReferenceClose(
      market.symbol,
      prediction.sessionDate,
    );

    if (!Number.isFinite(referenceClose) || referenceClose <= 0) {
      throw new Error(labels.previous_close_unavailable);
    }
  }

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

  const result = await prisma.$transaction(async (tx) => {
    let createdPrediction: { id: string } | null = null;

    if (prediction) {
      const market = selectedMarkets[0];

      if (referenceClose === null) {
        throw new Error(labels.previous_close_unavailable);
      }

      if (!predictionNationality) {
        throw new Error(labels.nationality_required);
      }

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

      if (prediction.pointsBet > 0) {
        await tx.pointBalance.upsert({
          where: { userId },
          update: {},
          create: {
            userId,
            points: 10000,
          },
        });

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
          throw new Error(labels.insufficient_points);
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

  const createdComment = result.commentId
    ? await getCommentById(result.commentId, userId)
    : null;

  return {
    ...result,
    comment: createdComment,
  };
}

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
  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  const userId = session?.user?.id ?? null;
  const isAdmin = session?.user?.role === "ADMIN";

  const baseWhere: Prisma.CommentWhereInput = {
    assets: {
      some: { assetSymbol },
    },
    ...getVisibilityWhere(userId, isAdmin),
  };

  const select = getCommentSelect(userId, isAdmin);

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
    throw new Error(labels.invalid_session);
  }

  const cursorDate = cursor ? new Date(cursor.createdAt) : null;

  if (cursorDate && !Number.isFinite(cursorDate.getTime())) {
    throw new Error(labels.invalid_cursor);
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
      throw new Error(labels.invalid_cursor);
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

  const comments = page.map(({ comment }) => {
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

export type MarketCommentsPage = Awaited<ReturnType<typeof getMarketComments>>;
export type MarketPageComments = MarketCommentsPage["comments"];

export async function deleteComment(commentId: string) {
  const session = await auth();
  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
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
    throw new Error(labels.comment_not_found);
  }

  if (comment.authorId !== session.user.id) {
    throw new Error(labels.permission_denied);
  }

  if (comment.predictionId) {
    const deletedContent: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: DELETED_COMMENT_TEXT,
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

    const alreadyRemoved = currentText === DELETED_COMMENT_TEXT;

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
  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
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
    throw new Error(labels.comment_not_found);
  }

  if (comment.authorId !== session.user.id) {
    throw new Error(labels.permission_denied);
  }

  if (comment.withdrawnAt || comment.moderatedAt) {
    throw new Error(labels.comment_not_editable);
  }

  const hasContent = hasEditorContent(content);

  if (!hasContent && !comment.predictionId) {
    throw new Error(labels.write_comment);
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
  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
  }

  if (session.user.role !== "ADMIN") {
    throw new Error(labels.permission_denied);
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      authorId: true,
      moderatedAt: true,
    },
  });

  if (!comment) {
    throw new Error(labels.comment_not_found);
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
      where: { id: commentId },
      data: { moderatedAt: now },
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
  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
  }

  if (session.user.role !== "ADMIN") {
    throw new Error(labels.permission_denied);
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      authorId: true,
      moderatedAt: true,
    },
  });

  if (!comment) {
    throw new Error(labels.comment_not_found);
  }

  if (!comment.moderatedAt) {
    return {
      success: true,
      action: "ALREADY_VISIBLE" as const,
    };
  }

  await prisma.$transaction([
    prisma.comment.update({
      where: { id: commentId },
      data: { moderatedAt: null },
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
  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
  }

  const userId = session.user.id;
  const trimmedContent = content.trim();

  if (!trimmedContent && !gifUrl) {
    throw new Error(labels.write_reply);
  }

  const moderationResult = moderateContent(trimmedContent);
  const replyVisibility = moderationResult.shouldBePrivate
    ? "PRIVATE"
    : "PUBLIC";

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      authorId: true,
      withdrawnAt: true,
      moderatedAt: true,
    },
  });

  if (!comment) {
    throw new Error(labels.comment_not_found);
  }

  if (comment.withdrawnAt || comment.moderatedAt) {
    throw new Error(labels.cannot_reply);
  }

  let parentReply: {
    id: string;
    commentId: string;
    authorId: string;
    moderatedAt: Date | null;
  } | null = null;

  if (parentId) {
    parentReply = await prisma.reply.findUnique({
      where: { id: parentId },
      select: {
        id: true,
        commentId: true,
        authorId: true,
        moderatedAt: true,
      },
    });

    if (!parentReply) {
      throw new Error(labels.reply_not_found);
    }

    if (parentReply.commentId !== commentId) {
      throw new Error(labels.invalid_parent);
    }

    if (parentReply.moderatedAt) {
      throw new Error(labels.cannot_reply);
    }
  }

  const reply = await prisma.reply.create({
    data: {
      content: trimmedContent,
      gifUrl,
      commentId,
      authorId: userId,
      parentId,
      visibility: replyVisibility,
    },
    select: REPLY_SELECT,
  });

  // Notification text is translated in NotificationPanel.
  if (replyVisibility === "PUBLIC") {
    if (parentReply) {
      if (parentReply.authorId !== userId) {
        await prisma.notification.create({
          data: {
            userId: parentReply.authorId,
            actorId: userId,
            type: "REPLY_REPLIED",
            title: "New reply",
            message: `${session.user.name ?? "Someone"} replied to your reply.`,
            commentId,
            replyId: reply.id,
            eventKey: `reply-replied:${reply.id}`,
          },
        });
      }
    } else if (comment.authorId !== userId) {
      await prisma.notification.create({
        data: {
          userId: comment.authorId,
          actorId: userId,
          type: "COMMENT_REPLIED",
          title: "New reply",
          message: `${session.user.name ?? "Someone"} replied to your comment.`,
          commentId,
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
  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
  }

  const trimmedContent = content.trim();

  if (!trimmedContent && !gifUrl) {
    throw new Error(labels.write_reply);
  }

  const reply = await prisma.reply.findUnique({
    where: { id: replyId },
    select: {
      id: true,
      authorId: true,
      moderatedAt: true,
    },
  });

  if (!reply) {
    throw new Error(labels.reply_not_found);
  }

  if (reply.authorId !== session.user.id) {
    throw new Error(labels.permission_denied);
  }

  if (reply.moderatedAt) {
    throw new Error(labels.reply_not_editable);
  }

  const updatedReply = await prisma.reply.update({
    where: { id: replyId },
    data: {
      content: trimmedContent,
      gifUrl,
      editedAt: new Date(),
    },
    select: REPLY_SELECT,
  });

  return {
    success: true,
    reply: updatedReply,
  };
}

export async function deleteReply(replyId: string) {
  const session = await auth();
  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
  }

  const reply = await prisma.reply.findUnique({
    where: { id: replyId },
    select: {
      id: true,
      authorId: true,
      moderatedAt: true,
    },
  });

  if (!reply) {
    throw new Error(labels.reply_not_found);
  }

  if (reply.authorId !== session.user.id) {
    throw new Error(labels.permission_denied);
  }

  await prisma.reply.delete({
    where: { id: replyId },
  });

  return {
    success: true,
  };
}

export async function hideReply(replyId: string) {
  const session = await auth();
  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
  }

  if (session.user.role !== "ADMIN") {
    throw new Error(labels.permission_denied);
  }

  const reply = await prisma.reply.findUnique({
    where: { id: replyId },
    select: {
      id: true,
      moderatedAt: true,
    },
  });

  if (!reply) {
    throw new Error(labels.reply_not_found);
  }

  if (reply.moderatedAt) {
    return {
      success: true,
      action: "ALREADY_HIDDEN" as const,
    };
  }

  await prisma.reply.update({
    where: { id: replyId },
    data: { moderatedAt: new Date() },
  });

  return {
    success: true,
    action: "HIDDEN" as const,
  };
}

export async function restoreReply(replyId: string) {
  const session = await auth();
  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
  }

  if (session.user.role !== "ADMIN") {
    throw new Error(labels.permission_denied);
  }

  const reply = await prisma.reply.findUnique({
    where: { id: replyId },
    select: {
      id: true,
      moderatedAt: true,
    },
  });

  if (!reply) {
    throw new Error(labels.reply_not_found);
  }

  if (!reply.moderatedAt) {
    return {
      success: true,
      action: "ALREADY_VISIBLE" as const,
    };
  }

  await prisma.reply.update({
    where: { id: replyId },
    data: { moderatedAt: null },
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
  const visibilityWhere = getVisibilityWhere(userId, isAdmin);

  const replies = await prisma.reply.findMany({
    where: {
      commentId,
      ...visibilityWhere,
    },
    orderBy: { createdAt: "asc" },

    select: {
      ...REPLY_SELECT,

      likes: userId
        ? {
            where: { userId },
            select: { id: true },
          }
        : false,

      _count: {
        select: {
          likes: true,
          replies: {
            where: visibilityWhere,
          },
        },
      },
    },
  });

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
  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true },
  });

  if (!comment) {
    throw new Error(labels.comment_not_found);
  }

  const eventKeyPrefix = `comment-report:${commentId}:`;

  const existingReport = await prisma.notification.findFirst({
    where: {
      eventKey: { startsWith: eventKeyPrefix },
    },
    select: { id: true },
  });

  if (existingReport) {
    throw new Error(labels.comment_reported);
  }

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  if (admins.length === 0) {
    throw new Error(labels.admin_unavailable);
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
  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
  }

  const reply = await prisma.reply.findUnique({
    where: { id: replyId },
    select: {
      id: true,
      commentId: true,
    },
  });

  if (!reply) {
    throw new Error(labels.reply_not_found);
  }

  const eventKeyPrefix = `reply-report:${replyId}:`;

  const existingReport = await prisma.notification.findFirst({
    where: {
      eventKey: { startsWith: eventKeyPrefix },
    },
    select: { id: true },
  });

  if (existingReport) {
    throw new Error(labels.reply_reported);
  }

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  if (admins.length === 0) {
    throw new Error(labels.admin_unavailable);
  }

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      actorId: null,
      type: "REPLY_REPORTED",
      title: "Reply reported",
      message: "A reply has been reported for review.",
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
  sort: HomeCommentSort;
  assetSymbol: string | null;
}

interface GetHomeCommentsOptions {
  assetSymbol?: string | null;
  sort?: HomeCommentSort;
  cursor?: HomeCommentCursor | null;
}

export async function getHomeComments({
  assetSymbol = null,
  sort = "latest",
  cursor = null,
}: GetHomeCommentsOptions = {}) {
  const session = await auth();
  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  const userId = session?.user?.id ?? null;
  const isAdmin = session?.user?.role === "ADMIN";
  const marketSymbol = assetSymbol?.trim() || null;

  if (sort !== "latest" && sort !== "most-liked") {
    throw new Error(labels.invalid_sort);
  }

  const baseWhere: Prisma.CommentWhereInput = {
    AND: [
      getVisibilityWhere(userId, isAdmin),
      {
        hasContent: true,
        withdrawnAt: null,
        moderatedAt: null,
      },
      ...(marketSymbol
        ? [
            {
              assets: {
                some: { assetSymbol: marketSymbol },
              },
            },
          ]
        : []),
    ],
  };

  const select = {
    ...getCommentSelect(userId, isAdmin),
    assets: {
      select: { assetSymbol: true },
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
      throw new Error(labels.invalid_cursor);
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
            { createdAt: { lt: cursorDate } },
            {
              createdAt: cursorDate,
              id: { lt: cursor.id },
            },
          ],
        }
      : {};

  if (cursor && sort === "most-liked") {
    const cursorExists = await prisma.comment.findFirst({
      where: {
        AND: [baseWhere, { id: cursor.id }],
      },
      select: { id: true },
    });

    if (!cursorExists) {
      throw new Error(labels.list_changed);
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
            cursor: { id: cursor.id },
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

  const comments = await prisma.comment.findMany({
    where: {
      AND: [
        getVisibilityWhere(userId, isAdmin),
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
        select: { assetSymbol: true },
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
