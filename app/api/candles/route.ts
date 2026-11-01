import { NextResponse } from "next/server";

import { getMarketCandles } from "@/lib/server/market-candles";

export const dynamic = "force-dynamic";

const LONG_RANGE_INTERVALS: Record<string, string> = {
  "1Y": "1wk",
  "5Y": "1mo",
  MAX: "1mo",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const symbol = searchParams.get("symbol") || "^GSPC";
  const range = searchParams.get("range") || "1D";

  const interval = LONG_RANGE_INTERVALS[range] ?? searchParams.get("interval");

  try {
    const data = await getMarketCandles(symbol, range, interval);

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
