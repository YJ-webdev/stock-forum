"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getChatBanIdentityHash } from "@/lib/moderation/chat-ban-identity";

interface BanUserInput {
  userId: string;
  reason: string;
}

export async function banUser(input: BanUserInput) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  if (
    !input ||
    typeof input.userId !== "string" ||
    typeof input.reason !== "string"
  ) {
    throw new Error("Invalid ban request.");
  }

  const userId = input.userId.trim();
  const reason = input.reason.trim();

  if (!userId) {
    throw new Error("Select a user to ban.");
  }

  if (!reason || reason.length > 500) {
    throw new Error("Enter a reason between 1 and 500 characters.");
  }

  if (userId === session.user.id) {
    throw new Error("You cannot ban yourself.");
  }

  return prisma.$transaction(async (tx) => {
    const lockedUserIds = [...new Set([session.user.id, userId])].sort();

    for (const lockedUserId of lockedUserIds) {
      await tx.$queryRaw`
      SELECT "id"
      FROM "User"
      WHERE "id" = ${lockedUserId}
      FOR UPDATE
    `;
    }

    const moderator = await tx.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        status: true,
        deletedAt: true,
      },
    });

    if (
      !moderator ||
      moderator.role !== "ADMIN" ||
      moderator.status !== "ACTIVE" ||
      moderator.deletedAt
    ) {
      throw new Error("You do not have permission to ban users.");
    }

    const target = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        status: true,
        deletedAt: true,
        accounts: {
          select: {
            provider: true,
            providerAccountId: true,
          },
        },
      },
    });

    if (!target || target.deletedAt) {
      throw new Error("This account is no longer available.");
    }

    if (target.role === "ADMIN") {
      throw new Error("Administrators cannot be banned.");
    }

    if (target.status === "BANNED") {
      throw new Error("This user is already banned.");
    }

    const identityHashes = [
      ...new Set(
        target.accounts.map((account) =>
          getChatBanIdentityHash(account.provider, account.providerAccountId),
        ),
      ),
    ];

    const updated = await tx.user.updateMany({
      where: {
        id: userId,
        role: "USER",
        status: { not: "BANNED" },
        deletedAt: null,
      },
      data: {
        status: "BANNED",
        bannedAt: new Date(),
        mutedAt: null,
      },
    });

    if (updated.count !== 1) {
      throw new Error("This account changed. Refresh the page and try again.");
    }

    if (identityHashes.length > 0) {
      await tx.chatBanIdentity.createMany({
        data: identityHashes.map((identityHash) => ({
          identityHash,
          userId,
        })),
        skipDuplicates: true,
      });
    }

    const moderationAction = await tx.moderationAction.create({
      data: {
        type: "BAN_USER",
        moderatorId: session.user.id,
        targetUserId: userId,
        reason,
      },
      select: {
        id: true,
      },
    });

    await tx.notification.create({
      data: {
        userId,
        actorId: session.user.id,
        type: "USER_BANNED",
        title: "Your chat access has been restricted",
        message:
          `You can no longer post or edit comment and reply content. ` +
          `You can still make predictions without comment content.\n\n` +
          `Reason: ${reason}`,
        eventKey: `user-banned:${moderationAction.id}`,
      },
    });

    return { success: true };
  });
}

export async function unbanUser(input: BanUserInput) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  if (
    !input ||
    typeof input.userId !== "string" ||
    typeof input.reason !== "string"
  ) {
    throw new Error("Invalid unban request.");
  }

  const moderatorId = session.user.id;
  const userId = input.userId.trim();
  const reason = input.reason.trim();

  if (!userId) {
    throw new Error("Select a user to unban.");
  }

  if (!reason || reason.length > 500) {
    throw new Error("Enter a reason between 1 and 500 characters.");
  }

  if (userId === moderatorId) {
    throw new Error("You cannot unban yourself.");
  }

  return prisma.$transaction(async (tx) => {
    const lockedUserIds = [...new Set([moderatorId, userId])].sort();

    for (const lockedUserId of lockedUserIds) {
      await tx.$queryRaw`
        SELECT "id"
        FROM "User"
        WHERE "id" = ${lockedUserId}
        FOR UPDATE
      `;
    }

    const moderator = await tx.user.findUnique({
      where: { id: moderatorId },
      select: {
        role: true,
        status: true,
        deletedAt: true,
      },
    });

    if (
      !moderator ||
      moderator.role !== "ADMIN" ||
      moderator.status !== "ACTIVE" ||
      moderator.deletedAt
    ) {
      throw new Error("You do not have permission to unban users.");
    }

    const target = await tx.user.findUnique({
      where: { id: userId },
      select: {
        status: true,
        deletedAt: true,
      },
    });

    if (!target || target.deletedAt) {
      throw new Error("This account is no longer available.");
    }

    if (target.status !== "BANNED") {
      throw new Error("This user is not banned.");
    }

    await tx.chatBanIdentity.deleteMany({
      where: { userId },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        status: "ACTIVE",
        bannedAt: null,
        mutedAt: null,
      },
    });

    await tx.moderationAction.create({
      data: {
        type: "UNBAN_USER",
        moderatorId,
        targetUserId: userId,
        reason,
      },
    });

    return { success: true };
  });
}
