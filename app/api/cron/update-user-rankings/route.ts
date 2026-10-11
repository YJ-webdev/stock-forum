// app/api/cron/update-user-rankings/route.ts

import { NextResponse } from "next/server";

import { updateUserRankings } from "@/lib/market/update-user-rankings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// -----------------------------------------------------------------------------
// UPDATE USER RANKINGS CRON
// -----------------------------------------------------------------------------

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET is not configured.");

    return NextResponse.json(
      {
        success: false,
        error: "Cron is not configured.",
      },
      {
        status: 500,
      },
    );
  }

  const authorization = request.headers.get("authorization");

  if (authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const result = await updateUserRankings();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("User ranking update failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update user rankings.",
      },
      {
        status: 500,
      },
    );
  }
}
