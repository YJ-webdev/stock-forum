"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function toggleCommentLike(commentId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  const userId = session.user.id;

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
    throw new Error("This comment can no longer be liked.");
  }

  const eventKey = `comment-like:${userId}:${commentId}`;

  const existingLike = await prisma.commentLike.findUnique({
    where: {
      userId_commentId: {
        userId,
        commentId,
      },
    },
    select: {
      id: true,
    },
  });

  // ---------------------------------------------------------------------------
  // UNLIKE
  // ---------------------------------------------------------------------------

  if (existingLike) {
    await prisma.$transaction([
      prisma.commentLike.delete({
        where: {
          userId_commentId: {
            userId,
            commentId,
          },
        },
      }),

      prisma.notification.deleteMany({
        where: {
          eventKey,
        },
      }),
    ]);

    const likeCount = await prisma.commentLike.count({
      where: {
        commentId,
      },
    });

    return {
      liked: false,
      likeCount,
    };
  }

  // ---------------------------------------------------------------------------
  // LIKE
  // ---------------------------------------------------------------------------

  if (comment.authorId === userId) {
    // Allow self-like, but don't notify yourself.
    await prisma.commentLike.create({
      data: {
        userId,
        commentId,
      },
    });
  } else {
    await prisma.$transaction([
      prisma.commentLike.create({
        data: {
          userId,
          commentId,
        },
      }),

      prisma.notification.create({
        data: {
          userId: comment.authorId,
          actorId: userId,

          type: "COMMENT_LIKED",

          title: "New like",
          message: `${session.user.name ?? "Someone"} liked your comment.`,

          commentId,
          eventKey,
        },
      }),
    ]);
  }

  const likeCount = await prisma.commentLike.count({
    where: {
      commentId,
    },
  });

  return {
    liked: true,
    likeCount,
  };
}

export async function toggleReplyLike(replyId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  const userId = session.user.id;

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

  if (reply.moderatedAt) {
    throw new Error("This reply can no longer be liked.");
  }

  const eventKey = `reply-like:${userId}:${replyId}`;

  const existingLike = await prisma.replyLike.findUnique({
    where: {
      userId_replyId: {
        userId,
        replyId,
      },
    },
    select: {
      id: true,
    },
  });

  // ---------------------------------------------------------------------------
  // UNLIKE
  // ---------------------------------------------------------------------------

  if (existingLike) {
    await prisma.$transaction([
      prisma.replyLike.delete({
        where: {
          userId_replyId: {
            userId,
            replyId,
          },
        },
      }),

      prisma.notification.deleteMany({
        where: {
          eventKey,
        },
      }),
    ]);

    const likeCount = await prisma.replyLike.count({
      where: {
        replyId,
      },
    });

    return {
      liked: false,
      likeCount,
    };
  }

  // ---------------------------------------------------------------------------
  // LIKE
  // ---------------------------------------------------------------------------

  if (reply.authorId === userId) {
    // Allow self-like, but don't notify yourself.
    await prisma.replyLike.create({
      data: {
        userId,
        replyId,
      },
    });
  } else {
    await prisma.$transaction([
      prisma.replyLike.create({
        data: {
          userId,
          replyId,
        },
      }),

      prisma.notification.create({
        data: {
          userId: reply.authorId,
          actorId: userId,

          type: "REPLY_LIKED",

          title: "New like",
          message: `${session.user.name ?? "Someone"} liked your reply.`,

          replyId,
          eventKey,
        },
      }),
    ]);
  }

  const likeCount = await prisma.replyLike.count({
    where: {
      replyId,
    },
  });

  return {
    liked: true,
    likeCount,
  };
}
