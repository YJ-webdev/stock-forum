"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

import { auth } from "@/auth";
import { recordUserActivity } from "@/lib/activity/record-user-activity";
import { prisma } from "@/lib/prisma";

const GUEST_COOKIE_NAME = "bbv_guest_voter";

type LikeIdentity =
  | {
      userId: string;
      guestId: null;
      name: string;
    }
  | {
      userId: null;
      guestId: string;
      name: null;
    };

async function getLikeIdentity(): Promise<LikeIdentity> {
  const session = await auth();

  if (session?.user?.id) {
    return {
      userId: session.user.id,
      guestId: null,
      name: session.user.name ?? "Someone",
    };
  }

  const cookieStore = await cookies();
  const storedGuestId = cookieStore.get(GUEST_COOKIE_NAME)?.value;

  const validGuestId =
    storedGuestId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      storedGuestId,
    );

  if (validGuestId) {
    return {
      userId: null,
      guestId: storedGuestId,
      name: null,
    };
  }

  const guestId = randomUUID();

  cookieStore.set(GUEST_COOKIE_NAME, guestId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return {
    userId: null,
    guestId,
    name: null,
  };
}

export async function toggleCommentLike(commentId: string) {
  if (typeof commentId !== "string" || !commentId.trim()) {
    throw new Error("Invalid comment.");
  }

  const identity = await getLikeIdentity();
  const { userId, guestId } = identity;

  const identityKey = userId !== null ? `user:${userId}` : `guest:${guestId}`;

  // Preserve existing member notification keys.
  const eventKey =
    userId !== null
      ? `comment-like:${userId}:${commentId}`
      : `comment-like:guest:${guestId}:${commentId}`;

  const lockKey = `comment-like:${identityKey}:${commentId}`;

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT 1 AS locked
      FROM pg_advisory_xact_lock(hashtext(${lockKey})::bigint)
    `;

    const comment = await tx.comment.findUnique({
      where: {
        id: commentId,
      },
      select: {
        authorId: true,
        visibility: true,
        withdrawnAt: true,
        moderatedAt: true,
        assets: {
          take: 1,
          select: {
            assetSymbol: true,
          },
        },
      },
    });

    if (!comment) {
      throw new Error("Comment not found.");
    }

    if (comment.withdrawnAt || comment.moderatedAt) {
      throw new Error("This comment can no longer be liked.");
    }

    // Guests must not interact with private content by supplying an ID.
    if (userId === null && comment.visibility !== "PUBLIC") {
      throw new Error("This comment is unavailable.");
    }

    const existingLike = await tx.commentLike.findUnique({
      where:
        userId !== null
          ? {
              userId_commentId: {
                userId,
                commentId,
              },
            }
          : {
              guestId_commentId: {
                guestId,
                commentId,
              },
            },
      select: {
        id: true,
      },
    });

    const liked = !existingLike;

    if (existingLike) {
      await tx.commentLike.delete({
        where: {
          id: existingLike.id,
        },
      });

      if (userId !== null) {
        await tx.notification.deleteMany({
          where: {
            eventKey,
          },
        });
      }
    } else {
      await tx.commentLike.create({
        data: {
          userId,
          guestId,
          commentId,
        },
      });

      if (userId !== null && comment.authorId !== userId) {
        await tx.notification.create({
          data: {
            userId: comment.authorId,
            actorId: userId,
            type: "COMMENT_LIKED",
            title: "👍 New like",
            message: `${identity.name} liked your comment.`,
            commentId,
            eventKey,
          },
        });
      }
    }

    if (userId !== null) {
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
    }

    const likeCount = await tx.commentLike.count({
      where: {
        commentId,
      },
    });

    return {
      liked,
      likeCount,
    };
  });
}

export async function toggleReplyLike(replyId: string) {
  if (typeof replyId !== "string" || !replyId.trim()) {
    throw new Error("Invalid reply.");
  }

  const identity = await getLikeIdentity();
  const { userId, guestId } = identity;

  const identityKey = userId !== null ? `user:${userId}` : `guest:${guestId}`;

  const eventKey =
    userId !== null
      ? `reply-like:${userId}:${replyId}`
      : `reply-like:guest:${guestId}:${replyId}`;

  const lockKey = `reply-like:${identityKey}:${replyId}`;

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT 1 AS locked
      FROM pg_advisory_xact_lock(hashtext(${lockKey})::bigint)
    `;

    const reply = await tx.reply.findUnique({
      where: {
        id: replyId,
      },
      select: {
        authorId: true,
        commentId: true,
        moderatedAt: true,
        comment: {
          select: {
            visibility: true,
            withdrawnAt: true,
            moderatedAt: true,
            assets: {
              take: 1,
              select: {
                assetSymbol: true,
              },
            },
          },
        },
      },
    });

    if (!reply) {
      throw new Error("Reply not found.");
    }

    if (
      reply.moderatedAt ||
      reply.comment.withdrawnAt ||
      reply.comment.moderatedAt
    ) {
      throw new Error("This reply can no longer be liked.");
    }

    if (userId === null && reply.comment.visibility !== "PUBLIC") {
      throw new Error("This reply is unavailable.");
    }

    const existingLike = await tx.replyLike.findUnique({
      where:
        userId !== null
          ? {
              userId_replyId: {
                userId,
                replyId,
              },
            }
          : {
              guestId_replyId: {
                guestId,
                replyId,
              },
            },
      select: {
        id: true,
      },
    });

    const liked = !existingLike;

    if (existingLike) {
      await tx.replyLike.delete({
        where: {
          id: existingLike.id,
        },
      });

      if (userId !== null) {
        await tx.notification.deleteMany({
          where: {
            eventKey,
          },
        });
      }
    } else {
      await tx.replyLike.create({
        data: {
          userId,
          guestId,
          replyId,
        },
      });

      if (userId !== null && reply.authorId !== userId) {
        await tx.notification.create({
          data: {
            userId: reply.authorId,
            actorId: userId,
            type: "REPLY_LIKED",
            title: "👍 New like",
            message: `${identity.name} liked your reply.`,
            replyId,
            eventKey,
          },
        });
      }
    }

    if (userId !== null) {
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
    }

    const likeCount = await tx.replyLike.count({
      where: {
        replyId,
      },
    });

    return {
      liked,
      likeCount,
    };
  });
}
