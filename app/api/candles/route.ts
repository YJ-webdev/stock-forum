import { NextResponse } from "next/server";

import { getMarketCandles } from "@/lib/server/market-candles";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const symbol = searchParams.get("symbol") || "^GSPC";
  const range = searchParams.get("range") || "1D";
  const interval = searchParams.get("interval");

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
