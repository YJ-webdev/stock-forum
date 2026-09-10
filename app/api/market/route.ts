// app/api/market/route.ts
import { NextResponse } from "next/server";

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  const to = Math.floor(Date.now() / 1000);
  const from = to - 6 * 60 * 60; // Last 6 hours

  if (!symbol) {
    return NextResponse.json(
      { error: "Symbol parameter is required" },
      { status: 400 },
    );
  }

  try {
    // Get 1-minute resolution candles
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=1&from=${from}&to=${to}&token=${process.env.FINNHUB_API_KEY}`,
    );

    if (!res.ok) {
      throw new Error(`Finnhub error: ${res.statusText}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch quote" },
      { status: 500 },
    );
  }
}
