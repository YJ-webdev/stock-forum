"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function closeTrade({
  tradeId,
  userId,
  currentPrice,
}: {
  tradeId: string;
  userId: string;
  currentPrice: number;
}) {
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Fetch trade
      const trade = await tx.trade.findUnique({
        where: { id: tradeId, userId, status: "OPEN" },
      });

      if (!trade) {
        throw new Error("Active trade not found.");
      }

      // 2. Calculate P&L
      const priceDifference = currentPrice - trade.entryPrice;
      const pnl =
        trade.type === "BUY"
          ? priceDifference * trade.quantity
          : -priceDifference * trade.quantity;

      // 3. Calculate total funds to return (Entry Capital + P&L)
      const returnedCapital = trade.entryPrice * trade.quantity + pnl;

      // 4. Update trade status
      await tx.trade.update({
        where: { id: tradeId },
        data: {
          status: "CLOSED",
          exitPrice: currentPrice,
          pnl,
          closedAt: new Date(),
        },
      });

      // 5. Credit user account balance and update total P&L
      await tx.accountBalance.update({
        where: { userId },
        data: {
          cash: { increment: returnedCapital },
          pnl: { increment: pnl },
        },
      });
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to close position.",
    };
  }
}
