"use server";

import type { UserTier } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

export interface LeaderboardUser {
  id: string;
  name: string;
  image: string | null;

  winRate: number;
  points: number;
  netProfit: number;

  rank: number;
  tier: UserTier;
  settledCount: number;
}

export async function getTopBetters(limit = 5): Promise<LeaderboardUser[]> {
  const take = Number.isFinite(limit)
    ? Math.min(100, Math.max(1, Math.trunc(limit)))
    : 5;

  try {
    const rankings = await prisma.userRanking.findMany({
      where: {
        rank: {
          not: null,
        },
        tier: {
          not: "UNRANKED",
        },
      },

      select: {
        rank: true,
        tier: true,
        netProfit: true,
        settledCount: true,
        wonCount: true,

        user: {
          select: {
            id: true,
            name: true,
            image: true,

            pointBalance: {
              select: {
                points: true,
              },
            },
          },
        },
      },

      orderBy: [
        {
          rank: "asc",
        },
        {
          userId: "asc",
        },
      ],

      take,
    });

    return rankings.map((ranking) => {
      const winRate =
        ranking.settledCount > 0
          ? (ranking.wonCount / ranking.settledCount) * 100
          : 0;

      return {
        id: ranking.user.id,
        name: ranking.user.name || "Anonymous Trader",
        image: ranking.user.image,

        winRate: Math.round(winRate * 10) / 10,

        points: ranking.user.pointBalance?.points ?? 0,
        netProfit: ranking.netProfit,

        rank: ranking.rank!,
        tier: ranking.tier,
        settledCount: ranking.settledCount,
      };
    });
  } catch (error) {
    console.error("Failed to fetch leaderboard users:", error);

    return [];
  }
}
