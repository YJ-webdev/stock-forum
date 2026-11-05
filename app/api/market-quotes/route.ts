import { NextResponse } from "next/server";

import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";
import { getMarketCandles } from "@/lib/server/market-candles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const HEADERS = { "Cache-Control": "no-store, max-age=0" };

function isPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = [
    ...new Set(
      (searchParams.get("symbols") ?? "")
        .split(",")
        .map((symbol) => symbol.trim())
        .filter(Boolean),
    ),
  ];

  if (symbols.length < 1 || symbols.length > 60) {
    return NextResponse.json(
      { error: "Provide between 1 and 60 market symbols." },
      { status: 400, headers: HEADERS },
    );
  }

  const marketMap = new Map(
    ALL_MARKET_SYMBOLS.map((market) => [market.symbol, market]),
  );
  if (symbols.some((symbol) => !marketMap.has(symbol))) {
    return NextResponse.json(
      { error: "Unknown market symbol." },
      { status: 400, headers: HEADERS },
    );
  }

  const quotes: Record<
    string,
    {
      price: number;
      previousClose: number | null;
      change: number | null;
      percent: number | null;
    }
  > = {};
  const errors: Record<string, string> = {};

  // Small batches avoid launching up to 120 upstream requests at once.
  const BATCH_SIZE = 5;
  for (let offset = 0; offset < symbols.length; offset += BATCH_SIZE) {
    await Promise.all(
      symbols.slice(offset, offset + BATCH_SIZE).map(async (symbol) => {
        try {
          // Both endpoints use the same validated market data service.
          const data = await getMarketCandles(symbol, "1D", "5m");
          const price = data.currentPrice;
          if (!isPrice(price)) throw new Error("Market price unavailable");

          const previousClose = isPrice(data.previousClose)
            ? data.previousClose
            : null;
          const change = previousClose === null ? null : price - previousClose;
          quotes[symbol] = {
            price,
            previousClose,
            change,
            percent: change === null ? null : (change / previousClose!) * 100,
          };
        } catch (error) {
          errors[symbol] =
            error instanceof Error ? error.message : "Quote unavailable";
        }
      }),
    );
  }

  return NextResponse.json({ quotes, errors }, { headers: HEADERS });
}
