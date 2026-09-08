"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface TradeInput {
  userId: string;
  symbol: string;
  type: "BUY" | "SELL";
  quantity: number;
  currentPrice: number;
}

export async function executeTrade(input: TradeInput) {
  const { userId, symbol, type, quantity, currentPrice } = input;

  if (quantity <= 0) {
    return { success: false, error: "Quantity must be greater than zero." };
  }

  const totalCost = quantity * currentPrice;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Fetch user balance
      const accountBalance = await tx.accountBalance.findUnique({
        where: { userId },
      });

      if (!accountBalance) {
        throw new Error("Account balance record not found.");
      }

      // 2. Validate funds for BUY orders
      if (type === "BUY" && accountBalance.cash < totalCost) {
        throw new Error("Insufficient cash balance for this order.");
      }

      // 3. Update cash balance
      const updatedCash =
        type === "BUY"
          ? accountBalance.cash - totalCost
          : accountBalance.cash + totalCost;

      await tx.accountBalance.update({
        where: { userId },
        data: { cash: updatedCash },
      });

      // 4. Create trade entry
      await tx.trade.create({
        data: {
          userId,
          symbol,
          type,
          quantity,
          entryPrice: currentPrice,
          status: "OPEN",
        },
      });
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to execute trade.";
    return { success: false, error: errorMessage };
  }
}
