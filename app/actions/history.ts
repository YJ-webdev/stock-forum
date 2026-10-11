"use server";

import type { Prisma } from "@/generated/prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActivityCutoff } from "@/lib/activity/activity-retention";

export type HistoryCursor = {
  id: string;
  createdAt: string;
};

const PAGE_SIZE = 20;

export async function getUserActivities(cursor: HistoryCursor | null = null) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Log in to view your history.");
  }

  const userId = session.user.id;
  const cutoff = getActivityCutoff();
  const cursorDate = cursor ? new Date(cursor.createdAt) : null;

  if (cursorDate && !Number.isFinite(cursorDate.getTime())) {
    throw new Error("Invalid history cursor.");
  }

  const items = await prisma.userActivity.findMany({
    where: {
      userId,
      createdAt: { gte: cutoff },
      ...(cursor && cursorDate
        ? {
            OR: [
              { createdAt: { lt: cursorDate } },
              {
                createdAt: cursorDate,
                id: { lt: cursor.id },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    select: {
      id: true,
      type: true,
      targetUserId: true,
      marketSymbol: true,
      commentId: true,
      replyId: true,
      metadata: true,
      createdAt: true,
    },
  });

  const hasMore = items.length > PAGE_SIZE;
  const page = items.slice(0, PAGE_SIZE);

  const commentIds = [...new Set(page.flatMap((item) => item.commentId ?? []))];

  const replyIds = [...new Set(page.flatMap((item) => item.replyId ?? []))];

  const targetUserIds = [
    ...new Set(page.flatMap((item) => item.targetUserId ?? [])),
  ];

  // Check current database role before granting admin visibility.
  const viewer = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  const visibilityWhere =
    viewer?.role === "ADMIN"
      ? {}
      : {
          OR: [
            { visibility: "PUBLIC" as const },
            {
              visibility: "PRIVATE" as const,
              authorId: userId,
            },
          ],
        };

  const commentWhere: Prisma.CommentWhereInput = {
    withdrawnAt: null,
    moderatedAt: null,
    ...visibilityWhere,
  };

  const [comments, replies, users] = await Promise.all([
    prisma.comment.findMany({
      where: {
        id: { in: commentIds },
        ...commentWhere,
      },
      select: {
        id: true,
        assets: {
          take: 1,
          select: { assetSymbol: true },
        },
      },
    }),

    prisma.reply.findMany({
      where: {
        id: { in: replyIds },
        moderatedAt: null,
        ...visibilityWhere,
        comment: {
          is: commentWhere,
        },
      },
      select: {
        id: true,
        commentId: true,
        comment: {
          select: {
            assets: {
              take: 1,
              select: { assetSymbol: true },
            },
          },
        },
      },
    }),

    prisma.user.findMany({
      where: {
        id: { in: targetUserIds },
      },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  const commentMap = new Map(comments.map((comment) => [comment.id, comment]));

  const replyMap = new Map(replies.map((reply) => [reply.id, reply]));

  const userMap = new Map(users.map((user) => [user.id, user]));

  const activities = page.map((item) => {
    let href: string | null = null;

    const metadata =
      item.metadata &&
      typeof item.metadata === "object" &&
      !Array.isArray(item.metadata)
        ? item.metadata
        : {};

    const targetUser = item.targetUserId
      ? userMap.get(item.targetUserId)
      : undefined;

    const savedName =
      typeof metadata.targetUserName === "string"
        ? metadata.targetUserName
        : null;

    if (item.type === "USER_FOLLOWED" || item.type === "USER_UNFOLLOWED") {
      href = targetUser ? `/user/${encodeURIComponent(targetUser.id)}` : null;
    } else if (
      item.type === "WATCHLIST_ADDED" ||
      item.type === "WATCHLIST_REMOVED"
    ) {
      href = item.marketSymbol
        ? `/market/${encodeURIComponent(item.marketSymbol)}`
        : null;
    } else if (
      item.type === "COMMENT_DELETED" ||
      item.type === "REPLY_DELETED"
    ) {
      href = null;
    } else if (item.replyId) {
      const reply = replyMap.get(item.replyId);
      const symbol = reply?.comment.assets[0]?.assetSymbol;

      if (reply && symbol) {
        const query = new URLSearchParams({
          comment: reply.commentId,
          reply: reply.id,
        });

        href = `/market/${encodeURIComponent(symbol)}?${query}`;
      }
    } else if (item.commentId) {
      const comment = commentMap.get(item.commentId);
      const symbol = comment?.assets[0]?.assetSymbol;

      if (comment && symbol) {
        const query = new URLSearchParams({
          comment: comment.id,
        });

        href = `/market/${encodeURIComponent(symbol)}?${query}`;
      }
    }

    // A prediction remains useful even if its comment is unavailable.
    if (!href && item.type === "PREDICTION_SUBMITTED" && item.marketSymbol) {
      href = `/market/${encodeURIComponent(item.marketSymbol)}`;
    }

    return {
      ...item,
      createdAt: item.createdAt.toISOString(),
      targetUserName: targetUser?.name ?? savedName,
      href,
    };
  });

  const lastItem = page.at(-1);

  return {
    activities,
    nextCursor:
      hasMore && lastItem
        ? {
            id: lastItem.id,
            createdAt: lastItem.createdAt.toISOString(),
          }
        : null,
  };
}

export type HistoryActivity = Awaited<
  ReturnType<typeof getUserActivities>
>["activities"][number];
