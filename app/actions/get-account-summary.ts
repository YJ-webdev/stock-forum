"use server";

import { prisma } from "@/lib/prisma";

export interface AccountSummary {
  cash: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalEquity: number;
  overallPnl: number;
}

export async function getAccountSummary(
  userId: string,
): Promise<AccountSummary> {
  try {
    // 1. Fetch user balance record
    const balance = await prisma.accountBalance.findUnique({
      where: { userId },
    });

    const cash = balance?.cash ?? 10000;
    const realizedPnl = balance?.pnl ?? 0;

    // 2. Fetch all open trades with current asset prices
    const openTrades = await prisma.trade.findMany({
      where: { userId, status: "OPEN" },
      include: {
        asset: {
          select: { lastPrice: true },
        },
      },
    });

    // 3. Calculate unrealized PnL and total value of open trades
    let unrealizedPnl = 0;
    let openPositionsValue = 0;

    for (const trade of openTrades) {
      const currentPrice = trade.asset?.lastPrice ?? trade.entryPrice;
      const priceDiff = currentPrice - trade.entryPrice;

      const tradePnl =
        trade.type === "BUY"
          ? priceDiff * trade.quantity
          : -priceDiff * trade.quantity;

      unrealizedPnl += tradePnl;
      openPositionsValue += trade.quantity * currentPrice;
    }

    // 4. Calculate total equity and total combined PnL
    const totalEquity = cash + openPositionsValue;
    const overallPnl = realizedPnl + unrealizedPnl;

    return {
      cash,
      realizedPnl,
      unrealizedPnl,
      totalEquity,
      overallPnl,
    };
  } catch (error: unknown) {
    console.error("Failed to compute account summary:", error);
    return {
      cash: 0,
      realizedPnl: 0,
      unrealizedPnl: 0,
      totalEquity: 0,
      overallPnl: 0,
    };
  }
}
