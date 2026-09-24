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
      // Only users who have participated in predictions
      // -----------------------------------------------------------------------

      where: {
        pointBalance: {
          isNot: null,
        },

        predictions: {
          some: {
            status: {
              in: ["WON", "LOST"],
            },
          },
        },
      },

      // -----------------------------------------------------------------------
      // DATA
      // -----------------------------------------------------------------------

      select: {
        id: true,
        name: true,
        image: true,

        // Current point balance
        pointBalance: {
          select: {
            points: true,
          },
        },

        // Only settled predictions are needed for win rate
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
    // FORMAT LEADERBOARD
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

        // Keep one decimal place:
        // 78.428... -> 78.4
        winRate: Math.round(winRate * 10) / 10,

        // Actual current points
        points: user.pointBalance?.points ?? 0,

        rank: index + 1,
      };
    });
  } catch (error) {
    console.error("Failed to fetch leaderboard users:", error);

    return [];
  }
}
