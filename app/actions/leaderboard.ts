"use server";

import { prisma } from "@/lib/prisma";

export interface LeaderboardUser {
  id: string;
  name: string;
  image?: string | null;
  winRate: number; // e.g. 78.5
  totalProfit: number; // e.g. 12450.00
  rank: number;
}

export async function getTopBetters(limit = 5): Promise<LeaderboardUser[]> {
  try {
    // Query users sorted by profit/balance or win rate
    const users = await prisma.user.findMany({
      take: limit,
      select: {
        id: true,
        name: true,
        image: true,
        // Replace with your schema fields (e.g., totalProfit, winRate, balance)
      },
      // orderBy: { totalProfit: "desc" },
    });

    return users.map((user, index) => ({
      id: user.id,
      name: user.name || "Anonymous Trader",
      image: user.image,
      winRate: Math.floor(Math.random() * 30) + 65, // Replace with calculated field from DB
      totalProfit: Math.floor(Math.random() * 10000) + 1000, // Replace with calculated field from DB
      rank: index + 1,
    }));
  } catch (error) {
    console.error("Failed to fetch leaderboard users:", error);
    return [];
  }
}
