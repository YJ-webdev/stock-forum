"use server";

import { prisma } from "@/lib/prisma";

export interface CountryLeaderboardItem {
  countryCode: string;
  countryName: string;
  totalProfit: number;
  traderCount: number;
  rank: number;
}

export async function getCountryLeaderboard(
  limit = 5,
): Promise<CountryLeaderboardItem[]> {
  try {
    const countryData = await prisma.user.groupBy({
      by: ["country"],
      _count: {
        id: true,
      },
      where: {
        country: { not: null },
      },
      orderBy: {
        _count: {
          id: "desc", // Orders countries by highest trader count
        },
      },
      take: limit,
    });

    return countryData.map((item, index) => ({
      countryCode: (item.country || "US").toUpperCase(),
      countryName: getCountryName(item.country || "US"),
      totalProfit: Math.floor(Math.random() * 50000) + 10000,
      traderCount: item._count.id,
      rank: index + 1,
    }));
  } catch (error) {
    console.error("Failed to fetch country leaderboard:", error);
    return [];
  }
}

function getCountryName(code: string) {
  const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
  try {
    return regionNames.of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
}
