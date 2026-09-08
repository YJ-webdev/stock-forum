"use server";

import { prisma } from "@/lib/prisma";
import { OpenPosition } from "../components/portfolio-table";

export async function getUserOpenPositions(
  userId: string,
): Promise<OpenPosition[]> {
  try {
    // 1. Fetch open trades with their related asset details
    const openTrades = await prisma.trade.findMany({
      where: {
        userId,
        status: "OPEN",
      },
      include: {
        asset: {
          select: {
            lastPrice: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 2. Map trade data to OpenPosition interface
    return openTrades.map((trade) => ({
      id: trade.id,
      symbol: trade.symbol,
      type: trade.type,
      quantity: trade.quantity,
      entryPrice: trade.entryPrice,
      currentPrice: trade.asset?.lastPrice ?? trade.entryPrice,
    }));
  } catch (error: unknown) {
    console.error("Failed to fetch open positions:", error);
    return [];
  }
}
