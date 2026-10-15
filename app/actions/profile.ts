"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getUserProfileCard(targetUserId: string) {
  if (typeof targetUserId !== "string" || !targetUserId.trim()) {
    throw new Error("Invalid user.");
  }

  const userId = targetUserId.trim();
  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const [user, follow] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        image: true,
        statusMessage: true,
        status: true,

        ranking: {
          select: {
            tier: true,
          },
        },

        watchlist: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          take: 6,
          select: {
            symbol: true,
            asset: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),

    viewerId && viewerId !== userId
      ? prisma.userFollow.findUnique({
          where: {
            followerId_followingId: {
              followerId: viewerId,
              followingId: userId,
            },
          },
          select: {
            id: true,
          },
        })
      : Promise.resolve(null),
  ]);

  if (!user) {
    throw new Error("User not found.");
  }

  return {
    id: user.id,
    name: user.name,
    image: user.image,
    tier: user.ranking?.tier ?? "UNRANKED",
    watchlist: user.watchlist.map((item) => ({
      symbol: item.symbol,
      name: item.asset.name,
    })),
    isFollowing: Boolean(follow),
    viewerId,
    statusMessage: user.statusMessage,
    status: user.status,
  };
}

export type UserProfileCardData = Awaited<
  ReturnType<typeof getUserProfileCard>
>;
