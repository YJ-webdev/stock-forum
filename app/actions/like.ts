"use server";

import { auth } from "@/auth";
import { recordUserActivity } from "@/lib/activity/record-user-activity";
import { prisma } from "@/lib/prisma";

export async function toggleCommentLike(commentId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  const userId = session.user.id;
  const eventKey = `comment-like:${userId}:${commentId}`;

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT 1 AS locked
      FROM pg_advisory_xact_lock(
        hashtext(${eventKey})::bigint
      )
    `;

    const comment = await tx.comment.findUnique({
      where: { id: commentId },
      select: {
        authorId: true,
        withdrawnAt: true,
        moderatedAt: true,
        assets: {
          take: 1,
          select: { assetSymbol: true },
        },
      },
    });

    if (!comment) {
      throw new Error("Comment not found.");
    }

    if (comment.withdrawnAt || comment.moderatedAt) {
      throw new Error("This comment can no longer be liked.");
    }

    const existingLike = await tx.commentLike.findUnique({
      where: {
        userId_commentId: { userId, commentId },
      },
      select: { id: true },
    });

    const liked = !existingLike;

    if (existingLike) {
      await tx.commentLike.delete({
        where: { id: existingLike.id },
      });

      await tx.notification.deleteMany({
        where: { eventKey },
      });
    } else {
      await tx.commentLike.create({
        data: { userId, commentId },
      });

      if (comment.authorId !== userId) {
        await tx.notification.create({
          data: {
            userId: comment.authorId,
            actorId: userId,
            type: "COMMENT_LIKED",
            title: "👍 New like",
            message: `${session.user.name ?? "Someone"} liked your comment.`,
            commentId,
            eventKey,
          },
        });
      }
    }

    await tx.userActivity.deleteMany({
      where: {
        userId,
        commentId,
        type: {
          in: ["COMMENT_LIKED", "COMMENT_UNLIKED"],
        },
      },
    });

    await recordUserActivity(tx, {
      userId,
      type: liked ? "COMMENT_LIKED" : "COMMENT_UNLIKED",
      targetUserId: comment.authorId,
      commentId,
      marketSymbol: comment.assets[0]?.assetSymbol ?? null,
    });

    const likeCount = await tx.commentLike.count({
      where: { commentId },
    });

    return { liked, likeCount };
  });
}

export async function toggleReplyLike(replyId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  const userId = session.user.id;
  const eventKey = `reply-like:${userId}:${replyId}`;

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT 1 AS locked
      FROM pg_advisory_xact_lock(
        hashtext(${eventKey})::bigint
      )
    `;

    const reply = await tx.reply.findUnique({
      where: { id: replyId },
      select: {
        authorId: true,
        commentId: true,
        moderatedAt: true,
        comment: {
          select: {
            assets: {
              take: 1,
              select: { assetSymbol: true },
            },
          },
        },
      },
    });

    if (!reply) {
      throw new Error("Reply not found.");
    }

    if (reply.moderatedAt) {
      throw new Error("This reply can no longer be liked.");
    }

    const existingLike = await tx.replyLike.findUnique({
      where: {
        userId_replyId: { userId, replyId },
      },
      select: { id: true },
    });

    const liked = !existingLike;

    if (existingLike) {
      await tx.replyLike.delete({
        where: { id: existingLike.id },
      });

      await tx.notification.deleteMany({
        where: { eventKey },
      });
    } else {
      await tx.replyLike.create({
        data: { userId, replyId },
      });

      if (reply.authorId !== userId) {
        await tx.notification.create({
          data: {
            userId: reply.authorId,
            actorId: userId,
            type: "REPLY_LIKED",
            title: "👍 New like",
            message: `${session.user.name ?? "Someone"} liked your reply.`,
            replyId,
            eventKey,
          },
        });
      }
    }

    await tx.userActivity.deleteMany({
      where: {
        userId,
        replyId,
        type: {
          in: ["REPLY_LIKED", "REPLY_UNLIKED"],
        },
      },
    });

    await recordUserActivity(tx, {
      userId,
      type: liked ? "REPLY_LIKED" : "REPLY_UNLIKED",
      targetUserId: reply.authorId,
      commentId: reply.commentId,
      replyId,
      marketSymbol: reply.comment.assets[0]?.assetSymbol ?? null,
    });

    const likeCount = await tx.replyLike.count({
      where: { replyId },
    });

    return { liked, likeCount };
  });
}
