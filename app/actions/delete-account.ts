"use server";

import { del } from "@vercel/blob";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function isVercelBlobUrl(url: string | null | undefined): boolean {
  if (!url) {
    return false;
  }

  try {
    const { protocol, hostname } = new URL(url);

    return (
      protocol === "https:" &&
      (hostname.endsWith(".public.blob.vercel-storage.com") ||
        hostname.endsWith(".blob.vercel-storage.com"))
    );
  } catch {
    return false;
  }
}

export async function deleteAccount(confirmation: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  if (confirmation !== "DELETE") {
    throw new Error("Type DELETE to confirm.");
  }

  const userId = session.user.id;

  const previousImage = await prisma.$transaction(async (tx) => {
    // Serialize deletion with comment creation and moderation.
    await tx.$queryRaw`
      SELECT "id"
      FROM "User"
      WHERE "id" = ${userId}
      FOR UPDATE
    `;

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        image: true,
        role: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      return null;
    }

    if (user.role === "ADMIN") {
      throw new Error("Administrator accounts cannot be deleted.");
    }

    const now = new Date();

    // Delete OAuth credentials and database sessions.
    // auth.ts also invalidates JWTs using deletedAt.
    await tx.account.deleteMany({
      where: { userId },
    });

    await tx.session.deleteMany({
      where: { userId },
    });

    if (user.email) {
      await tx.verificationToken.deleteMany({
        where: { identifier: user.email },
      });
    }

    // Delete personal account data.
    await tx.watchlist.deleteMany({
      where: { userId },
    });

    await tx.notification.deleteMany({
      where: {
        OR: [{ userId }, { actorId: userId }],
      },
    });

    await tx.userActivity.deleteMany({
      where: {
        OR: [{ userId }, { targetUserId: userId }],
      },
    });

    await tx.userFollow.deleteMany({
      where: {
        OR: [{ followerId: userId }, { followingId: userId }],
      },
    });

    await tx.userRanking.deleteMany({
      where: { userId },
    });

    await tx.pointTransaction.deleteMany({
      where: { userId },
    });

    await tx.pointBalance.deleteMany({
      where: { userId },
    });

    await tx.accountBalance.deleteMany({
      where: { userId },
    });

    // Clear authored content while preserving other users' replies.
    await tx.comment.updateMany({
      where: { authorId: userId },
      data: {
        content: {
          type: "doc",
          content: [],
        },
        hasContent: false,
        withdrawnAt: now,
      },
    });

    await tx.reply.updateMany({
      where: { authorId: userId },
      data: {
        content: "",
        gifUrl: null,
      },
    });

    await tx.commentLike.deleteMany({
      where: { userId },
    });

    await tx.replyLike.deleteMany({
      where: { userId },
    });

    // Preserve prediction totals without country attribution.
    await tx.prediction.updateMany({
      where: { userId },
      data: {
        nationality: "OTHER",
      },
    });

    // Keep a minimal account record for existing relations.
    // Preserve status, bannedAt, and chatBanIdentities.
    await tx.user.update({
      where: { id: userId },
      data: {
        name: "Deleted account",
        email: null,
        emailVerified: null,
        image: null,
        nationality: null,
        statusMessage: null,
        language: "en",
        role: "USER",
        isBot: false,
        mutedAt: null,
        deletedAt: now,
      },
    });

    return user.image;
  });

  // Delete the uploaded avatar only after the transaction succeeds.
  // External OAuth profile images are left untouched.
  if (previousImage && isVercelBlobUrl(previousImage)) {
    try {
      await del(previousImage);
    } catch (error) {
      // Blob cleanup failure must not block account deletion.
      console.error("Failed to delete account avatar:", error);
    }
  }

  return { success: true };
}
