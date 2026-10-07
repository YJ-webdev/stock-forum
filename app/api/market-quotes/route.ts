import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";

export const dynamic = "force-dynamic";

const yahoo = new YahooFinance();

function isPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

const getQuote = unstable_cache(
  async (symbol: string) => {
    const quote = await yahoo.quote(symbol);

    if (!isPrice(quote.regularMarketPrice)) {
      throw new Error("No market price available");
    }

    const previousClose = isPrice(quote.regularMarketPreviousClose)
      ? quote.regularMarketPreviousClose
      : null;

    const change =
      previousClose !== null
        ? quote.regularMarketPrice - previousClose
        : typeof quote.regularMarketChange === "number" &&
            Number.isFinite(quote.regularMarketChange)
          ? quote.regularMarketChange
          : null;

    const percent =
      previousClose !== null
        ? ((quote.regularMarketPrice - previousClose) / previousClose) * 100
        : typeof quote.regularMarketChangePercent === "number" &&
            Number.isFinite(quote.regularMarketChangePercent)
          ? quote.regularMarketChangePercent
          : null;

    return {
      price: quote.regularMarketPrice,
      previousClose,
      change,
      percent,
    };
  },
  ["relative-market-quotes-v1"],
  { revalidate: 30 },
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const symbols = Array.from(
    new Set(
      (searchParams.get("symbols") ?? "")
        .split(",")
        .map((symbol) => symbol.trim())
        .filter(Boolean),
    ),
  );

  if (symbols.length === 0 || symbols.length > 60) {
    return NextResponse.json(
      { error: "Provide between 1 and 60 market symbols." },
      { status: 400 },
    );
  }

  const markets = symbols.map((symbol) =>
    ALL_MARKET_SYMBOLS.find((item) => item.symbol === symbol),
  );

  if (markets.some((market) => !market)) {
    return NextResponse.json(
      { error: "Unknown market symbol." },
      { status: 400 },
    );
  }

  const results = await Promise.all(
    markets.map(async (market) => {
      const item = market!;

      const providerSymbol =
        item.providerSymbol ??
        (item.symbol === "TOPIX" ? "1306.T" : item.symbol);

      try {
        return {
          symbol: item.symbol,
          quote: await getQuote(providerSymbol),
          error: null,
        };
      } catch (error) {
        return {
          symbol: item.symbol,
          quote: null,
          error: error instanceof Error ? error.message : "Quote unavailable",
        };
      }
    }),
  );

  return NextResponse.json({
    quotes: Object.fromEntries(
      results
        .filter((result) => result.quote !== null)
        .map((result) => [result.symbol, result.quote]),
    ),
    errors: Object.fromEntries(
      results
        .filter((result) => result.error !== null)
        .map((result) => [result.symbol, result.error]),
    ),
  });
}
