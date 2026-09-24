"use server";

import { prisma } from "@/lib/prisma";

export interface LeaderboardUser {
  id: string;
  name: string;
  image: string | null;
  winRate: number;
  points: number;
  rank: number;
}

export async function getTopBetters(limit = 5): Promise<LeaderboardUser[]> {
  try {
    const users = await prisma.user.findMany({
      // -----------------------------------------------------------------------
      // Only require a point balance
      // -----------------------------------------------------------------------

      where: {
        pointBalance: {
          isNot: null,
        },
      },

      // -----------------------------------------------------------------------
      // DATA
      // -----------------------------------------------------------------------

      select: {
        id: true,
        name: true,
        image: true,

        pointBalance: {
          select: {
            points: true,
          },
        },

        predictions: {
          where: {
            status: {
              in: ["WON", "LOST"],
            },
          },

          select: {
            status: true,
          },
        },
      },

      // -----------------------------------------------------------------------
      // RANKING
      // -----------------------------------------------------------------------

      orderBy: {
        pointBalance: {
          points: "desc",
        },
      },

      take: limit,
    });

    // -------------------------------------------------------------------------
    // FORMAT
    // -------------------------------------------------------------------------

    return users.map((user, index) => {
      const totalPredictions = user.predictions.length;

      const wins = user.predictions.filter(
        (prediction) => prediction.status === "WON",
      ).length;

      const winRate =
        totalPredictions > 0 ? (wins / totalPredictions) * 100 : 0;

      return {
        id: user.id,
        name: user.name || "Anonymous Trader",
        image: user.image,

        winRate: Math.round(winRate * 10) / 10,

        points: user.pointBalance?.points ?? 0,

        rank: index + 1,
      };
    });
  } catch (error) {
    console.error("Failed to fetch leaderboard users:", error);

    return [];
  }
}
