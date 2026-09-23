"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function toggleCommentLike(commentId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  const userId = session.user.id;

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

  if (existingLike) {
    await prisma.commentLike.delete({
      where: {
        userId_commentId: {
          userId,
          commentId,
        },
      },
    });

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

  // Like
  await prisma.commentLike.create({
    data: {
      userId,
      commentId,
    },
  });

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

  // Unlike
  if (existingLike) {
    await prisma.replyLike.delete({
      where: {
        userId_replyId: {
          userId,
          replyId,
        },
      },
    });

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

  // Like
  await prisma.replyLike.create({
    data: {
      userId,
      replyId,
    },
  });

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
