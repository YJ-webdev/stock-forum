import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface FinnhubQuote {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High
  l: number; // Low
  o: number; // Open
  pc: number; // Previous close
}

// Map test symbols to Finnhub formats
const TEST_SYMBOLS: Record<string, string> = {
  AAPL: "AAPL",
  "BTC-USD": "BINANCE:BTCUSDT",
  "^GSPC": "SPY", // S&P 500 ETF equivalent
};

export async function GET() {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "FINNHUB_API_KEY is not configured" },
      { status: 500 },
    );
  }

  try {
    const results = await Promise.all(
      Object.entries(TEST_SYMBOLS).map(async ([label, symbol]) => {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
          { cache: "no-store" },
        );

        if (!res.ok) return null;

        const data: FinnhubQuote = await res.json();

        return {
          symbol: label,
          finnhubTicker: symbol,
          price: data.c ?? 0,
          change: data.d ?? 0,
          changePercent: data.dp ?? 0,
          dayHigh: data.h ?? 0,
          dayLow: data.l ?? 0,
          previousClose: data.pc ?? 0,
        };
      }),
    );

    const validResults = results.filter((item) => item !== null);

    return NextResponse.json({ success: true, data: validResults });
  } catch (error) {
    console.error("Finnhub test route error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
