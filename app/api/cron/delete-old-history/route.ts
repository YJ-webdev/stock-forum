import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getActivityCutoff } from "@/lib/activity/activity-retention";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// -----------------------------------------------------------------------------
// CONFIG
// -----------------------------------------------------------------------------

const DELETE_BATCH_SIZE = 500;
const MAX_BATCHES = 100;
const MAX_RUN_TIME_MS = 90_000;

// -----------------------------------------------------------------------------
// DELETE OLD HISTORY CRON
// -----------------------------------------------------------------------------

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[CRON] CRON_SECRET is not configured.");

    return NextResponse.json(
      {
        success: false,
        error: "Cron is not configured.",
      },
      { status: 500 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized.",
      },
      { status: 401 },
    );
  }

  const startedAt = Date.now();

  try {
    const cutoff = getActivityCutoff();

    let deletedActivities = 0;
    let batches = 0;
    let completed = false;

    while (batches < MAX_BATCHES && Date.now() - startedAt < MAX_RUN_TIME_MS) {
      const deleted = await prisma.$executeRaw`
        DELETE FROM "UserActivity"
        WHERE "id" IN (
          SELECT "id"
          FROM "UserActivity"
          WHERE "createdAt" < ${cutoff}
          ORDER BY "createdAt" ASC, "id" ASC
          LIMIT ${DELETE_BATCH_SIZE}
        )
      `;

      deletedActivities += deleted;
      batches += 1;

      if (deleted < DELETE_BATCH_SIZE) {
        completed = true;
        break;
      }
    }

    console.info("[CRON] Activity cleanup completed:", {
      deletedActivities,
      batches,
      completed,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      deletedActivities,
      batches,
      completed,
      cutoff: cutoff.toISOString(),
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("[CRON] Failed to delete expired history:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete expired history.",
      },
      { status: 500 },
    );
  }
}
