"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordUserActivity } from "@/lib/activity/record-user-activity";

function validateTargetUserId(targetUserId: string) {
  if (typeof targetUserId !== "string" || !targetUserId.trim()) {
    throw new Error("Invalid user.");
  }

  return targetUserId.trim();
}

// -----------------------------------------------------------------------------
// FOLLOW
// -----------------------------------------------------------------------------

export async function followUser(targetUserId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Log in to follow users.");
  }

  const userId = session.user.id;
  const followingId = validateTargetUserId(targetUserId);

  if (userId === followingId) {
    throw new Error("You cannot follow yourself.");
  }

  const lockKey = `user-follow:${userId}:${followingId}`;

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT 1 AS locked
      FROM pg_advisory_xact_lock(hashtext(${lockKey})::bigint)
    `;

    const targetUser = await tx.user.findUnique({
      where: { id: followingId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!targetUser) {
      throw new Error("User not found.");
    }

    const existingFollow = await tx.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId,
        },
      },
      select: { id: true },
    });

    if (!existingFollow) {
      await tx.userFollow.create({
        data: {
          followerId: userId,
          followingId,
        },
      });

      await recordUserActivity(tx, {
        userId,
        type: "USER_FOLLOWED",
        targetUserId: followingId,
        metadata: {
          targetUserName: targetUser.name,
        },
      });
    }

    const followerCount = await tx.userFollow.count({
      where: { followingId },
    });

    return {
      success: true,
      isFollowing: true,
      followerCount,
    };
  });
}

// -----------------------------------------------------------------------------
// UNFOLLOW
// -----------------------------------------------------------------------------

export async function unfollowUser(targetUserId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Log in to manage followed users.");
  }

  const userId = session.user.id;
  const followingId = validateTargetUserId(targetUserId);

  if (userId === followingId) {
    throw new Error("You cannot unfollow yourself.");
  }

  const lockKey = `user-follow:${userId}:${followingId}`;

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT 1 AS locked
      FROM pg_advisory_xact_lock(hashtext(${lockKey})::bigint)
    `;

    const targetUser = await tx.user.findUnique({
      where: { id: followingId },
      select: {
        id: true,
        name: true,
      },
    });

    const removed = await tx.userFollow.deleteMany({
      where: {
        followerId: userId,
        followingId,
      },
    });

    if (removed.count > 0) {
      await recordUserActivity(tx, {
        userId,
        type: "USER_UNFOLLOWED",
        targetUserId: followingId,
        metadata: {
          targetUserName: targetUser?.name ?? null,
        },
      });
    }

    const followerCount = await tx.userFollow.count({
      where: { followingId },
    });

    return {
      success: true,
      isFollowing: false,
      followerCount,
    };
  });
}

// -----------------------------------------------------------------------------
// CURRENT USER'S FOLLOW STATUS
// -----------------------------------------------------------------------------

export async function isFollowingUser(targetUserId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return false;
  }

  const followingId = validateTargetUserId(targetUserId);
  const userId = session.user.id;

  if (userId === followingId) {
    return false;
  }

  const follow = await prisma.userFollow.findUnique({
    where: {
      followerId_followingId: {
        followerId: userId,
        followingId,
      },
    },
    select: { id: true },
  });

  return Boolean(follow);
}

// -----------------------------------------------------------------------------
// PUBLIC FOLLOW COUNTS
// -----------------------------------------------------------------------------

export async function getUserFollowCounts(targetUserId: string) {
  const userId = validateTargetUserId(targetUserId);

  const [followerCount, followingCount] = await Promise.all([
    prisma.userFollow.count({
      where: { followingId: userId },
    }),
    prisma.userFollow.count({
      where: { followerId: userId },
    }),
  ]);

  return {
    followerCount,
    followingCount,
  };
}
