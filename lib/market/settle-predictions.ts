import {
  PredictionDirection,
  PredictionStatus,
} from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

import {
  getExpectedSessionCloseMs,
  getSettlementCandle,
} from "@/lib/market/yahoo";

// -----------------------------------------------------------------------------
// CONFIG
// -----------------------------------------------------------------------------

/*
 * Give Yahoo some time after the official market close to finalize/publish
 * the daily candle.
 *
 * Without this grace period, a settlement job running immediately after
 * market close could incorrectly tell the user that no trading data exists.
 */
const SETTLEMENT_DATA_GRACE_MS = 30 * 60 * 1000;

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

type SettlementSummary = {
  checked: number;
  won: number;
  lost: number;
  draw: number;
  pending: number;
  errors: number;
};

// -----------------------------------------------------------------------------
// MARKET RESULT
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// SETTLE PENDING PREDICTIONS
// -----------------------------------------------------------------------------

export async function settlePendingPredictions(): Promise<SettlementSummary> {
  const summary: SettlementSummary = {
    checked: 0,
    won: 0,
    lost: 0,
    draw: 0,
    pending: 0,
    errors: 0,
  };

  // ---------------------------------------------------------------------------
  // FIND PENDING PREDICTIONS
  // ---------------------------------------------------------------------------

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
          name: true,
          displaySymbol: true,
        },
      },
    },

    orderBy: {
      sessionDate: "asc",
    },
  });

  // ---------------------------------------------------------------------------
  // PROCESS
  // ---------------------------------------------------------------------------

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

      // -----------------------------------------------------------------------
      // GET SETTLEMENT CANDLE
      // -----------------------------------------------------------------------

      const settlementCandle = await getSettlementCandle(
        prediction.symbol,
        prediction.sessionDate,
      );

      // -----------------------------------------------------------------------
      // NO COMPLETED CANDLE
      // -----------------------------------------------------------------------

      if (!settlementCandle) {
        summary.pending += 1;

        const expectedCloseMs = getExpectedSessionCloseMs(
          prediction.symbol,
          prediction.sessionDate,
        );

        /*
         * If we cannot determine an expected close, leave the prediction
         * pending without making assumptions.
         */
        if (expectedCloseMs === null) {
          continue;
        }

        const notificationThreshold =
          expectedCloseMs + SETTLEMENT_DATA_GRACE_MS;

        /*
         * The target session hasn't passed its expected close + grace period.
         *
         * This is completely normal. Do not notify yet.
         */
        if (Date.now() < notificationThreshold) {
          continue;
        }

        // ---------------------------------------------------------------------
        // PENDING NOTIFICATION
        // ---------------------------------------------------------------------

        /*
         * eventKey is unique.
         *
         * Therefore a settlement job can run repeatedly without generating:
         *
         * Pending
         * Pending
         * Pending
         * Pending...
         *
         * for the same target session.
         */

        const pendingEventKey = `prediction:${prediction.id}:pending:${prediction.sessionDate.toISOString()}`;

        await prisma.notification.upsert({
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

        continue;
      }

      // -----------------------------------------------------------------------
      // SETTLEMENT PRICE
      // -----------------------------------------------------------------------

      const settlementClose = settlementCandle.close;

      if (!Number.isFinite(settlementClose) || settlementClose <= 0) {
        console.error(
          `Invalid settlement close for prediction ${prediction.id}`,
        );

        summary.errors += 1;

        continue;
      }

      // -----------------------------------------------------------------------
      // MARKET DIRECTION
      // -----------------------------------------------------------------------

      const marketDirection = getMarketDirection({
        referenceClose,
        settlementClose,
      });

      // -----------------------------------------------------------------------
      // DRAW
      // -----------------------------------------------------------------------

      if (marketDirection === "DRAW") {
        const settled = await settleDraw({
          predictionId: prediction.id,
          userId: prediction.userId,

          symbol: displaySymbol,

          pointsBet: prediction.pointsBet,

          settlementClose,
        });

        if (settled) {
          summary.draw += 1;
        }

        continue;
      }

      // -----------------------------------------------------------------------
      // WON
      // -----------------------------------------------------------------------

      if (marketDirection === prediction.direction) {
        const settled = await settleWin({
          predictionId: prediction.id,
          userId: prediction.userId,

          symbol: displaySymbol,

          direction: prediction.direction,

          pointsBet: prediction.pointsBet,

          referenceClose,
          settlementClose,
        });

        if (settled) {
          summary.won += 1;
        }

        continue;
      }

      // -----------------------------------------------------------------------
      // LOST
      // -----------------------------------------------------------------------

      const settled = await settleLoss({
        predictionId: prediction.id,
        userId: prediction.userId,

        symbol: displaySymbol,

        direction: prediction.direction,

        pointsBet: prediction.pointsBet,

        referenceClose,
        settlementClose,
      });

      if (settled) {
        summary.lost += 1;
      }
    } catch (error) {
      summary.errors += 1;

      console.error(`Failed to settle prediction ${prediction.id}:`, error);
    }
  }

  return summary;
}

// -----------------------------------------------------------------------------
// WIN
// -----------------------------------------------------------------------------

async function settleWin({
  predictionId,
  userId,

  symbol,
  direction,

  pointsBet,

  referenceClose,
  settlementClose,
}: {
  predictionId: string;
  userId: string;

  symbol: string;
  direction: PredictionDirection;

  pointsBet: number;

  referenceClose: number;
  settlementClose: number;
}): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    // -----------------------------------------------------------------------
    // CLAIM PREDICTION
    // -----------------------------------------------------------------------

    /*
     * Only a PENDING prediction may be settled.
     *
     * updateMany gives us an atomic:
     *
     * WHERE id = predictionId
     * AND status = PENDING
     *
     * If another worker already settled it, count === 0.
     */

    const claimed = await tx.prediction.updateMany({
      where: {
        id: predictionId,
        status: PredictionStatus.PENDING,
      },

      data: {
        status: PredictionStatus.WON,

        settlementClose,

        /*
         * The bet was already deducted when the prediction was created.
         *
         * pointsChange represents the NET result:
         *
         * bet 100
         * -100 initially
         * +200 payout
         * ----------------
         * net +100
         */
        pointsChange: pointsBet,

        settledAt: new Date(),
      },
    });

    if (claimed.count !== 1) {
      return false;
    }

    // -----------------------------------------------------------------------
    // PAYOUT
    // -----------------------------------------------------------------------

    const payout = pointsBet * 2;

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

    // -----------------------------------------------------------------------
    // LEDGER
    // -----------------------------------------------------------------------

    await tx.pointTransaction.create({
      data: {
        userId,
        predictionId,

        type: "WIN_PAYOUT",

        amount: payout,
      },
    });

    // -----------------------------------------------------------------------
    // NOTIFICATION
    // -----------------------------------------------------------------------

    await tx.notification.upsert({
      where: {
        eventKey: `prediction:${predictionId}:won`,
      },

      update: {},

      create: {
        userId,

        type: "PREDICTION_WON",

        title: "Prediction won",

        message:
          `Your ${direction.toLowerCase()} prediction for ${symbol} was correct. ` +
          `${referenceClose.toFixed(2)} → ${settlementClose.toFixed(2)}. ` +
          `You earned ${pointsBet.toLocaleString()} points.`,

        predictionId,

        eventKey: `prediction:${predictionId}:won`,
      },
    });

    return true;
  });
}

// -----------------------------------------------------------------------------
// LOSS
// -----------------------------------------------------------------------------

async function settleLoss({
  predictionId,
  userId,

  symbol,
  direction,

  pointsBet,

  referenceClose,
  settlementClose,
}: {
  predictionId: string;
  userId: string;

  symbol: string;
  direction: PredictionDirection;

  pointsBet: number;

  referenceClose: number;
  settlementClose: number;
}): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    // -----------------------------------------------------------------------
    // CLAIM PREDICTION
    // -----------------------------------------------------------------------

    const claimed = await tx.prediction.updateMany({
      where: {
        id: predictionId,
        status: PredictionStatus.PENDING,
      },

      data: {
        status: PredictionStatus.LOST,

        settlementClose,

        /*
         * The bet was already deducted during prediction creation.
         *
         * Do NOT deduct it again here.
         */
        pointsChange: -pointsBet,

        settledAt: new Date(),
      },
    });

    if (claimed.count !== 1) {
      return false;
    }

    // -----------------------------------------------------------------------
    // NOTIFICATION
    // -----------------------------------------------------------------------

    await tx.notification.upsert({
      where: {
        eventKey: `prediction:${predictionId}:lost`,
      },

      update: {},

      create: {
        userId,

        type: "PREDICTION_LOST",

        title: "Prediction lost",

        message:
          `Your ${direction.toLowerCase()} prediction for ${symbol} was incorrect. ` +
          `${referenceClose.toFixed(2)} → ${settlementClose.toFixed(2)}. ` +
          `You lost ${pointsBet.toLocaleString()} points.`,

        predictionId,

        eventKey: `prediction:${predictionId}:lost`,
      },
    });

    return true;
  });
}

// -----------------------------------------------------------------------------
// DRAW
// -----------------------------------------------------------------------------

async function settleDraw({
  predictionId,
  userId,

  symbol,

  pointsBet,
  settlementClose,
}: {
  predictionId: string;
  userId: string;

  symbol: string;

  pointsBet: number;
  settlementClose: number;
}): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    // -----------------------------------------------------------------------
    // CLAIM PREDICTION
    // -----------------------------------------------------------------------

    const claimed = await tx.prediction.updateMany({
      where: {
        id: predictionId,
        status: PredictionStatus.PENDING,
      },

      data: {
        status: PredictionStatus.DRAW,

        settlementClose,

        // Bet is refunded, therefore net change is zero.
        pointsChange: 0,

        settledAt: new Date(),
      },
    });

    if (claimed.count !== 1) {
      return false;
    }

    // -----------------------------------------------------------------------
    // REFUND
    // -----------------------------------------------------------------------

    await tx.pointBalance.upsert({
      where: {
        userId,
      },

      update: {
        points: {
          increment: pointsBet,
        },
      },

      create: {
        userId,
        points: 10000 + pointsBet,
      },
    });

    // -----------------------------------------------------------------------
    // LEDGER
    // -----------------------------------------------------------------------

    await tx.pointTransaction.create({
      data: {
        userId,
        predictionId,

        type: "DRAW_REFUND",

        amount: pointsBet,
      },
    });

    // -----------------------------------------------------------------------
    // NOTIFICATION
    // -----------------------------------------------------------------------

    await tx.notification.upsert({
      where: {
        eventKey: `prediction:${predictionId}:draw`,
      },

      update: {},

      create: {
        userId,

        type: "PREDICTION_DRAW",

        title: "Prediction draw",

        message:
          `The completed ${symbol} session closed unchanged at ` +
          `${settlementClose.toFixed(2)}. ` +
          `Your ${pointsBet.toLocaleString()} point bet has been refunded.`,

        predictionId,

        eventKey: `prediction:${predictionId}:draw`,
      },
    });

    return true;
  });
}
