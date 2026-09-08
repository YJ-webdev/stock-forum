"use server";

import { prisma } from "@/lib/prisma";

export interface NavbarBalanceData {
  cash: number;
  totalEquity: number;
}

export async function getNavbarBalance(
  userId: string,
): Promise<NavbarBalanceData> {
  try {
    const balance = await prisma.accountBalance.findUnique({
      where: { userId },
      select: { cash: true },
    });

    const openTrades = await prisma.trade.findMany({
      where: { userId, status: "OPEN" },
      select: {
        quantity: true,
        asset: { select: { lastPrice: true } },
      },
    });

    const cash = balance?.cash ?? 10000;
    const openPositionsValue = openTrades.reduce((acc, trade) => {
      return acc + trade.quantity * (trade.asset?.lastPrice ?? 0);
    }, 0);

    return {
      cash,
      totalEquity: cash + openPositionsValue,
    };
  } catch (error: unknown) {
    console.error("Failed to load navbar balance:", error);
    return { cash: 0, totalEquity: 0 };
  }
}
