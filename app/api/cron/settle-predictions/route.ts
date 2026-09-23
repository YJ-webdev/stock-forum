import { NextResponse } from "next/server";

import { settlePendingPredictions } from "@/lib/market/settle-predictions";

export const dynamic = "force-dynamic";

// -----------------------------------------------------------------------------
// SETTLE PREDICTIONS CRON
// -----------------------------------------------------------------------------

export async function GET(request: Request) {
  // ---------------------------------------------------------------------------
  // AUTHORIZE
  // ---------------------------------------------------------------------------

  const authorization = request.headers.get("authorization");

  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET is not configured.");

    return NextResponse.json(
      {
        error: "Cron is not configured.",
      },
      {
        status: 500,
      },
    );
  }

  if (authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      {
        error: "Unauthorized.",
      },
      {
        status: 401,
      },
    );
  }

  // ---------------------------------------------------------------------------
  // SETTLE
  // ---------------------------------------------------------------------------

  try {
    const result = await settlePendingPredictions();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Prediction settlement cron failed:", error);

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error ? error.message : "Unknown settlement error.",
      },
      {
        status: 500,
      },
    );
  }
}
