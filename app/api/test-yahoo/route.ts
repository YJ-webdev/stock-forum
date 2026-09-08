import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

export const dynamic = "force-dynamic";

// Instantiate the YahooFinance class (required for v3+)
const yahooFinance = new YahooFinance();

export async function GET() {
  try {
    const testSymbols = ["AAPL", "BTC-USD", "005930.KS", "^GSPC"];

    // Fetch quotes individually to maintain explicit TypeScript types
    const rawQuotes = await Promise.all(
      testSymbols.map((symbol) => yahooFinance.quote(symbol).catch(() => null)),
    );

    // Filter out failed quote fetches
    const validQuotes = rawQuotes.filter(
      (quote): quote is NonNullable<typeof quote> => quote !== null,
    );

    // Map clean metrics with full TypeScript auto-complete
    const results = validQuotes.map((quote) => ({
      symbol: quote.symbol,
      shortName: quote.shortName || quote.longName || quote.symbol,
      price: quote.regularMarketPrice ?? 0,
      change: quote.regularMarketChange ?? 0,
      changePercent: quote.regularMarketChangePercent ?? 0,
      dayHigh: quote.regularMarketDayHigh ?? 0,
      dayLow: quote.regularMarketDayLow ?? 0,
      volume: quote.regularMarketVolume ?? 0,
      currency: quote.currency || "USD",
      marketState: quote.marketState || "REGULAR",
    }));

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("Yahoo Finance fetch error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
