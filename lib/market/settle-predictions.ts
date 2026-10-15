import "server-only";

import {
  PredictionDirection,
  PredictionStatus,
} from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

import {
  getExpectedSessionCloseMs,
  getSettlementCandle,
} from "@/lib/market/yahoo";

// Give Yahoo time to finalize the daily candle after market close.
const SETTLEMENT_DATA_GRACE_MS = 30 * 60 * 1000;

type SettlementSummary = {
  checked: number;
  won: number;
  lost: number;
  draw: number;
  pending: number;
  errors: number;
};

type SettlementInput = {
  predictionId: string;
  userId: string;
  symbol: string;
  direction: PredictionDirection;
  pointsBet: number;
  referenceClose: number;
  settlementClose: number;
};

type SettlementOutcome = "WON" | "LOST" | "DRAW";

function getMarketDirection({
  referenceClose,
  settlementClose,
}: {
  referenceClose: number;
  settlementClose: number;
}): PredictionDirection | "DRAW" {
  if (settlementClose > referenceClose) {
    return PredictionDirection.BULL;
  }

  if (settlementClose < referenceClose) {
    return PredictionDirection.BEAR;
  }

  return "DRAW";
}

export async function settlePendingPredictions(): Promise<SettlementSummary> {
  const summary: SettlementSummary = {
    checked: 0,
    won: 0,
    lost: 0,
    draw: 0,
    pending: 0,
    errors: 0,
  };

  // Include deleted users so retained predictions still receive a result.
  const predictions = await prisma.prediction.findMany({
    where: {
      status: PredictionStatus.PENDING,
    },

    select: {
      id: true,
      userId: true,
      symbol: true,
      direction: true,
      pointsBet: true,
      referenceClose: true,
      sessionDate: true,

      asset: {
        select: {
          displaySymbol: true,
        },
      },
    },

    orderBy: {
      sessionDate: "asc",
    },
  });

  for (const prediction of predictions) {
    summary.checked += 1;

    try {
      const referenceClose = Number(prediction.referenceClose);

      if (!Number.isFinite(referenceClose) || referenceClose <= 0) {
        console.error(`Invalid referenceClose for prediction ${prediction.id}`);

        summary.errors += 1;
        continue;
      }

      const displaySymbol = prediction.asset.displaySymbol ?? prediction.symbol;

      const settlementCandle = await getSettlementCandle(
        prediction.symbol,
        prediction.sessionDate,
      );

      if (!settlementCandle) {
        summary.pending += 1;

        const expectedCloseMs = getExpectedSessionCloseMs(
          prediction.symbol,
          prediction.sessionDate,
        );

        if (expectedCloseMs === null) {
          continue;
        }

        const notificationThreshold =
          expectedCloseMs + SETTLEMENT_DATA_GRACE_MS;

        if (Date.now() < notificationThreshold) {
          continue;
        }

        const pendingEventKey =
          `prediction:${prediction.id}:pending:` +
          prediction.sessionDate.toISOString();

        await prisma.$transaction(async (tx) => {
          // Coordinate with account deletion.
          await tx.$queryRaw`
            SELECT "id"
            FROM "User"
            WHERE "id" = ${prediction.userId}
            FOR UPDATE
          `;

          const user = await tx.user.findUnique({
            where: {
              id: prediction.userId,
            },
            select: {
              deletedAt: true,
            },
          });

          if (!user || user.deletedAt) {
            return;
          }

          // Another settlement worker may have completed this prediction.
          const currentPrediction = await tx.prediction.findUnique({
            where: {
              id: prediction.id,
            },
            select: {
              status: true,
            },
          });

          if (currentPrediction?.status !== PredictionStatus.PENDING) {
            return;
          }

          await tx.notification.upsert({
            where: {
              eventKey: pendingEventKey,
            },

            update: {},

            create: {
              userId: prediction.userId,
              type: "PREDICTION_PENDING",
              title: "Prediction still pending",

              message:
                `No completed trading session is available yet for ` +
                `${displaySymbol}. ` +
                `The market may have been closed, it may be a non-trading day, ` +
                `or market data may still be unavailable. ` +
                `Your prediction will be settled after the next completed trading session.`,

              predictionId: prediction.id,
              eventKey: pendingEventKey,
            },
          });
        });

        continue;
      }

      const settlementClose = settlementCandle.close;

      if (!Number.isFinite(settlementClose) || settlementClose <= 0) {
        console.error(
          `Invalid settlement close for prediction ${prediction.id}`,
        );

        summary.errors += 1;
        continue;
      }

      const marketDirection = getMarketDirection({
        referenceClose,
        settlementClose,
      });

      const outcome: SettlementOutcome =
        marketDirection === "DRAW"
          ? "DRAW"
          : marketDirection === prediction.direction
            ? "WON"
            : "LOST";

      const settled = await settlePrediction(
        {
          predictionId: prediction.id,
          userId: prediction.userId,
          symbol: displaySymbol,
          direction: prediction.direction,
          pointsBet: prediction.pointsBet,
          referenceClose,
          settlementClose,
        },
        outcome,
      );

      if (!settled) {
        continue;
      }

      if (outcome === "WON") {
        summary.won += 1;
      } else if (outcome === "LOST") {
        summary.lost += 1;
      } else {
        summary.draw += 1;
      }
    } catch (error) {
      summary.errors += 1;

      console.error(`Failed to settle prediction ${prediction.id}:`, error);
    }
  }

  return summary;
}

async function settlePrediction(
  {
    predictionId,
    userId,
    symbol,
    direction,
    pointsBet,
    referenceClose,
    settlementClose,
  }: SettlementInput,
  outcome: SettlementOutcome,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    // Use the same lock as deleteAccount.
    // If settlement runs first, deletion removes its personal records.
    // If deletion runs first, settlement only updates the prediction.
    await tx.$queryRaw`
      SELECT "id"
      FROM "User"
      WHERE "id" = ${userId}
      FOR UPDATE
    `;

    const user = await tx.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        deletedAt: true,
      },
    });

    if (!user) {
      return false;
    }

    const status =
      outcome === "WON"
        ? PredictionStatus.WON
        : outcome === "LOST"
          ? PredictionStatus.LOST
          : PredictionStatus.DRAW;

    const pointsChange =
      outcome === "WON"
        ? pointsBet
        : outcome === "LOST"
          ? pointsBet > 0
            ? -pointsBet
            : 0
          : 0;

    // Only one settlement worker can claim a pending prediction.
    const claimed = await tx.prediction.updateMany({
      where: {
        id: predictionId,
        userId,
        status: PredictionStatus.PENDING,
      },

      data: {
        status,
        settlementClose,
        pointsChange,
        settledAt: new Date(),
      },
    });

    if (claimed.count !== 1) {
      return false;
    }

    // Preserve historical results without recreating deleted account data.
    if (user.deletedAt) {
      return true;
    }

    // The original bet was deducted at submission.
    if (pointsBet > 0 && outcome !== "LOST") {
      const payout = outcome === "WON" ? pointsBet * 2 : pointsBet;

      await tx.pointBalance.upsert({
        where: {
          userId,
        },

        update: {
          points: {
            increment: payout,
          },
        },

        create: {
          userId,
          points: 10000 + payout,
        },
      });

      await tx.pointTransaction.create({
        data: {
          userId,
          predictionId,
          type: outcome === "WON" ? "WIN_PAYOUT" : "DRAW_REFUND",
          amount: payout,
        },
      });
    }

    const eventKey = `prediction:${predictionId}:${outcome.toLowerCase()}`;

    const type =
      outcome === "WON"
        ? "PREDICTION_WON"
        : outcome === "LOST"
          ? "PREDICTION_LOST"
          : "PREDICTION_DRAW";

    const title =
      outcome === "WON"
        ? "Prediction won"
        : outcome === "LOST"
          ? "Prediction lost"
          : "Prediction draw";

    let message: string;

    if (outcome === "WON") {
      message =
        `Your ${direction.toLowerCase()} prediction for ${symbol} was correct. ` +
        `${referenceClose.toFixed(2)} → ${settlementClose.toFixed(2)}.` +
        (pointsBet > 0
          ? ` You earned ${pointsBet.toLocaleString()} points.`
          : "");
    } else if (outcome === "LOST") {
      message =
        `Your ${direction.toLowerCase()} prediction for ${symbol} was incorrect. ` +
        `${referenceClose.toFixed(2)} → ${settlementClose.toFixed(2)}.` +
        (pointsBet > 0
          ? ` You lost ${pointsBet.toLocaleString()} points.`
          : "");
    } else {
      message =
        `The completed ${symbol} session closed unchanged at ` +
        `${settlementClose.toFixed(2)}.` +
        (pointsBet > 0
          ? ` Your ${pointsBet.toLocaleString()} point bet has been refunded.`
          : "");
    }

    await tx.notification.upsert({
      where: {
        eventKey,
      },

      update: {},

      create: {
        userId,
        type,
        title,
        message,
        predictionId,
        eventKey,
      },
    });

    return true;
  });
}
