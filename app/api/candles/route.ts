import { NextResponse } from "next/server";

import { getMarketCandles } from "@/lib/server/market-candles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "^GSPC";
  const range = searchParams.get("range") || "1D";
  const interval = searchParams.get("interval");

  try {
    const data = await getMarketCandles(symbol, range, interval);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("[api/candles]", { symbol, range, interval, error });
    return NextResponse.json(
      { error: "Unable to retrieve market candles" },
      { status: 502, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
