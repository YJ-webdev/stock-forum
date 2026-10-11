// app/api/cron/route.ts

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getActivityCutoff } from "@/lib/activity/activity-retention";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "Cron secret is not configured." },
      { status: 500 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const cutoff = getActivityCutoff();

    const deletedActivities = await prisma.userActivity.deleteMany({
      where: {
        createdAt: { lt: cutoff },
      },
    });

    return NextResponse.json({
      success: true,
      deletedActivities: deletedActivities.count,
      cutoff: cutoff.toISOString(),
    });
  } catch (error) {
    console.error("[CRON] Failed to delete expired history:", error);

    return NextResponse.json(
      { error: "Failed to delete expired history." },
      { status: 500 },
    );
  }
}
