import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";

export const dynamic = "force-dynamic";

const yahoo = new YahooFinance();

const DAY_MS = 24 * 60 * 60 * 1000;

function isPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function getExchangeDate(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

async function getPreviousDailyClose(
  symbol: string,
  quoteTime: Date,
  timezone: string,
): Promise<number | null> {
  const quoteDate = getExchangeDate(quoteTime, timezone);

  const chart = await yahoo.chart(symbol, {
    period1: new Date(quoteTime.getTime() - 60 * DAY_MS),
    period2: new Date(Math.min(Date.now(), quoteTime.getTime() + DAY_MS)),
    interval: "1d",
    includePrePost: false,
    return: "array",
  });

  let previousClose: number | null = null;
  let latestTimestamp = -Infinity;

  for (const candle of chart.quotes ?? []) {
    const date = new Date(candle.date);
    const timestamp = date.getTime();

    if (
      !Number.isFinite(timestamp) ||
      !isPrice(candle.close) ||
      getExchangeDate(date, timezone) >= quoteDate
    ) {
      continue;
    }

    if (timestamp > latestTimestamp) {
      latestTimestamp = timestamp;
      previousClose = candle.close;
    }
  }

  return previousClose;
}

const getQuote = unstable_cache(
  async (symbol: string, isIndex: boolean, timezone: string) => {
    const quote = await yahoo.quote(symbol);

    const price = quote.regularMarketPrice;

    if (!isPrice(price)) {
      throw new Error("No market price available");
    }

    // This is a guard against a near-zero denominator for indices.
    const isUsablePreviousClose = (value: unknown): value is number =>
      isPrice(value) && (!isIndex || value >= price * 0.01);

    let previousClose: number | null = isUsablePreviousClose(
      quote.regularMarketPreviousClose,
    )
      ? quote.regularMarketPreviousClose
      : null;

    if (isIndex && previousClose === null) {
      const quoteTime = quote.regularMarketTime
        ? new Date(quote.regularMarketTime)
        : null;

      if (quoteTime && Number.isFinite(quoteTime.getTime())) {
        try {
          const dailyClose = await getPreviousDailyClose(
            symbol,
            quoteTime,
            timezone,
          );

          if (isUsablePreviousClose(dailyClose)) {
            previousClose = dailyClose;
          }
        } catch (error) {
          console.warn(
            `[market-quotes] Previous close lookup failed: ${symbol}`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    }

    // Keep change and percent based on the same previous close.
    const change = previousClose !== null ? price - previousClose : null;

    const calculatedPercent =
      previousClose !== null && change !== null
        ? (change / previousClose) * 100
        : null;

    const percent =
      calculatedPercent !== null && Number.isFinite(calculatedPercent)
        ? calculatedPercent
        : null;

    return {
      price,
      previousClose,
      change,
      percent,
    };
  },
  ["relative-market-quotes-v2"],
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
          quote: await getQuote(
            providerSymbol,
            item.assetType === "index",
            item.timezone ?? "UTC",
          ),
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
