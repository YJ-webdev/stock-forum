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
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        image: true,

        pointBalance: {
          select: {
            points: true,
          },
        },

        ranking: {
          select: {
            tier: true,
            netProfit: true,
            settledCount: true,
          },
        },

        _count: {
          select: {
            predictions: {
              where: {
                status: {
                  in: ["WON", "LOST"],
                },
              },
            },
          },
        },
      },

      orderBy: [
        {
          pointBalance: {
            points: "desc",
          },
        },
        {
          id: "asc",
        },
      ],

      take,
    });

    const wins = await prisma.prediction.groupBy({
      by: ["userId"],

      where: {
        userId: {
          in: users.map((user) => user.id),
        },
        status: "WON",
      },

      _count: {
        _all: true,
      },
    });

    const winsByUser = new Map(
      wins.map((item) => [item.userId, item._count._all]),
    );

    return users.map((user, index) => {
      const totalPredictions = user._count.predictions;
      const wonCount = winsByUser.get(user.id) ?? 0;

      const winRate =
        totalPredictions > 0 ? (wonCount / totalPredictions) * 100 : 0;

      return {
        id: user.id,
        name: user.name || "Anonymous Trader",
        image: user.image,

        winRate: Math.round(winRate * 10) / 10,
        points: user.pointBalance?.points ?? 0,
        netProfit: user.ranking?.netProfit ?? 0,

        rank: index + 1,
        tier: user.ranking?.tier ?? "UNRANKED",
        settledCount: user.ranking?.settledCount ?? 0,
      };
    });
  } catch (error) {
    console.error("Failed to fetch leaderboard users:", error);

    return [];
  }
}
