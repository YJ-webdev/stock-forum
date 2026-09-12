import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

export const dynamic = "force-dynamic";

const yahoo = new YahooFinance();

const PROVIDER_SYMBOLS: Record<string, string> = {
  TOPIX: "1306.T",
};

function getPeriod1(range: string): Date {
  const now = new Date();

  switch (range) {
    case "1D":
      // Fetch enough calendar days to find the latest trading session
      // even on weekends and market holidays.
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    case "5D":
      return new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

    case "1M":
      return new Date(now.setMonth(now.getMonth() - 1));

    case "6M":
      return new Date(now.setMonth(now.getMonth() - 6));

    case "YTD":
      return new Date(now.getFullYear(), 0, 1);

    case "1Y":
      return new Date(now.setFullYear(now.getFullYear() - 1));

    case "5Y":
      return new Date(now.setFullYear(now.getFullYear() - 5));

    case "MAX":
      return new Date("1980-01-01");

    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}

const INTERVALS: Record<string, "15m" | "1d" | "1wk"> = {
  "1D": "15m",
  "5D": "15m",
  "1M": "1d",
  "6M": "1d",
  YTD: "1d",
  "1Y": "1d",
  "5Y": "1wk",
  MAX: "1wk",
};

/**
 * Returns a calendar-day key in the exchange's timezone.
 *
 * Example:
 * America/New_York → "2026-09-11"
 */
function getExchangeDate(date: Date, timezone?: string): string {
  if (!timezone) {
    return date.toISOString().slice(0, 10);
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * For a 1D chart, Yahoo may return several days of 15m candles.
 * We only want the most recent trading session.
 */
function getLatestTradingSession(quotes: any[], timezone?: string): any[] {
  if (quotes.length === 0) {
    return [];
  }

  const latestQuote = quotes[quotes.length - 1];

  if (!latestQuote?.date) {
    return [];
  }

  const latestTradingDate = getExchangeDate(
    new Date(latestQuote.date),
    timezone,
  );

  return quotes.filter((quote) => {
    if (!quote?.date) return false;

    return (
      getExchangeDate(new Date(quote.date), timezone) === latestTradingDate
    );
  });
}

/**
 * Determines whether the regular exchange session is currently closed.
 *
 * Yahoo's chart metadata provides the current regular trading period.
 * This works for weekends, holidays, pre-market, regular hours,
 * and post-market without hard-coding a particular exchange.
 */
function isRegularMarketClosed(meta: any): boolean {
  const regularPeriod = meta?.currentTradingPeriod?.regular;

  if (regularPeriod?.start && regularPeriod?.end) {
    const now = Date.now();
    const start = new Date(regularPeriod.start).getTime();
    const end = new Date(regularPeriod.end).getTime();

    return now < start || now >= end;
  }

  // If Yahoo doesn't provide the trading period,
  // fail safely and treat the market as closed.
  return true;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const rawSymbol = searchParams.get("symbol") || "^GSPC";
  const range = searchParams.get("range") || "1D";

  const symbol = PROVIDER_SYMBOLS[rawSymbol] || rawSymbol;
  const period1 = getPeriod1(range);
  const interval = INTERVALS[range] || "15m";

  try {
    const chartResult = (await yahoo.chart(symbol, {
      period1,
      interval,
      includePrePost: false,
    })) as any;

    const rawQuotes = Array.isArray(chartResult?.quotes)
      ? chartResult.quotes
      : [];

    const meta = chartResult?.meta || {};

    /*
     * For 1D:
     *
     * Yahoo may return several days because we intentionally
     * request 7 calendar days. Select only the latest trading day.
     *
     * Example on Sunday:
     *
     * Wed → Thu → Fri → Sat → Sun
     *                    ↑
     *             latest trading session
     */
    const sessionQuotes =
      range === "1D"
        ? getLatestTradingSession(rawQuotes, meta.exchangeTimezoneName)
        : rawQuotes;

    if (sessionQuotes.length === 0) {
      return NextResponse.json({
        points: [],
        currentPrice: meta.regularMarketPrice ?? 0,
        previousClose:
          meta.chartPreviousClose ??
          meta.previousClose ??
          meta.regularMarketPrice ??
          0,
        dailyChangePercent: 0,
        rangeChangePercent: 0,
        isClosed: isRegularMarketClosed(meta),
        requestedSymbol: rawSymbol,
        providerSymbol: symbol,
        exchangeTimezone: meta.exchangeTimezoneName,
      });
    }

    const points = sessionQuotes
      .filter(
        (quote: any) =>
          quote?.close != null && Number.isFinite(Number(quote.close)),
      )
      .map((quote: any) => {
        const close = Number(quote.close);

        return {
          timestampMs: new Date(quote.date).getTime(),

          price: Number(close.toFixed(2)),

          open:
            quote.open != null
              ? Number(Number(quote.open).toFixed(2))
              : Number(close.toFixed(2)),

          high:
            quote.high != null
              ? Number(Number(quote.high).toFixed(2))
              : Number(close.toFixed(2)),

          low:
            quote.low != null
              ? Number(Number(quote.low).toFixed(2))
              : Number(close.toFixed(2)),

          close: Number(close.toFixed(2)),
        };
      });

    if (points.length === 0) {
      return NextResponse.json({
        points: [],
        currentPrice: meta.regularMarketPrice ?? 0,
        previousClose:
          meta.chartPreviousClose ??
          meta.previousClose ??
          meta.regularMarketPrice ??
          0,
        dailyChangePercent: 0,
        rangeChangePercent: 0,
        isClosed: isRegularMarketClosed(meta),
        requestedSymbol: rawSymbol,
        providerSymbol: symbol,
        exchangeTimezone: meta.exchangeTimezoneName,
      });
    }

    /*
     * regularMarketPrice is preferable because it represents
     * Yahoo's latest regular-session market price.
     *
     * When the market is closed, this remains the latest
     * regular-session price.
     */
    const currentPrice =
      typeof meta.regularMarketPrice === "number"
        ? meta.regularMarketPrice
        : (points[points.length - 1]?.price ?? 0);

    /*
     * chartPreviousClose is Yahoo's previous regular-session close.
     */
    const previousClose =
      typeof meta.chartPreviousClose === "number"
        ? meta.chartPreviousClose
        : typeof meta.previousClose === "number"
          ? meta.previousClose
          : currentPrice;

    const rangeStartPrice = points[0]?.price ?? previousClose;

    const dailyChangePercent =
      previousClose !== 0
        ? ((currentPrice - previousClose) / previousClose) * 100
        : 0;

    const rangeChangePercent =
      rangeStartPrice !== 0
        ? ((currentPrice - rangeStartPrice) / rangeStartPrice) * 100
        : 0;

    const isClosed = isRegularMarketClosed(meta);

    return NextResponse.json({
      points,
      currentPrice,
      previousClose,
      dailyChangePercent,
      rangeChangePercent,
      isClosed,

      requestedSymbol: rawSymbol,
      providerSymbol: symbol,

      exchangeTimezone: meta.exchangeTimezoneName,
      updatedAt: meta.regularMarketTime
        ? new Date(meta.regularMarketTime).getTime()
        : (points[points.length - 1]?.timestampMs ?? Date.now()),
    });
  } catch (error) {
    console.error(`Yahoo Finance chart error for ${symbol}:`, error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
