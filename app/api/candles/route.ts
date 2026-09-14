import { getTimestampForMarketTime } from "@/lib/utils/market-time";
import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";
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
      // Fetch several days so we can always find
      // the latest available trading session,
      // including after market close / weekends.
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
    if (!quote?.date) {
      return false;
    }

    return (
      getExchangeDate(new Date(quote.date), timezone) === latestTradingDate
    );
  });
}

function isRegularMarketClosed(
  meta: any,
  lunchStartMs?: number | null,
  lunchEndMs?: number | null,
): boolean {
  const regularPeriod = meta?.currentTradingPeriod?.regular;

  if (!regularPeriod?.start || !regularPeriod?.end) {
    return true;
  }

  const now = Date.now();

  const start = new Date(regularPeriod.start).getTime();

  const end = new Date(regularPeriod.end).getTime();

  // Outside regular session
  if (now < start || now >= end) {
    return true;
  }

  // Inside manual lunch break
  if (
    lunchStartMs != null &&
    lunchEndMs != null &&
    now >= lunchStartMs &&
    now < lunchEndMs
  ) {
    return true;
  }

  return false;
}

type YahooInterval = "1m" | "2m" | "5m" | "15m" | "30m" | "60m" | "1d" | "1wk";

const INTERVALS: Record<string, YahooInterval> = {
  "1D": "15m",
  "5D": "15m",
  "1M": "1d",
  "6M": "1d",
  YTD: "1d",
  "1Y": "1d",
  "5Y": "1wk",
  MAX: "1wk",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const rawSymbol = searchParams.get("symbol") || "^GSPC";

  const range = searchParams.get("range") || "1D";

  const symbol = PROVIDER_SYMBOLS[rawSymbol] || rawSymbol;

  const period1 = getPeriod1(range);

  const requestedInterval = searchParams.get("interval");

  const allowedIntervals = new Set<YahooInterval>([
    "1m",
    "2m",
    "5m",
    "15m",
    "30m",
    "60m",
    "1d",
    "1wk",
  ]);

  const interval: YahooInterval =
    requestedInterval &&
    allowedIntervals.has(requestedInterval as YahooInterval)
      ? (requestedInterval as YahooInterval)
      : INTERVALS[range] || "5m";

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

    const exchangeTimezone = meta.exchangeTimezoneName;

    const market = ALL_MARKET_SYMBOLS.find(
      (item) =>
        item.symbol === rawSymbol ||
        item.symbol === symbol ||
        item.providerSymbol === symbol,
    );

    // --------------------------------------------------
    // SELECT CHART DATA
    // --------------------------------------------------

    let sessionQuotes = rawQuotes;

    if (range === "1D") {
      // IMPORTANT:
      // 1D = full latest trading session.
      //
      // Do NOT slice to the last 6 hours.
      // This keeps the complete Yahoo intraday session,
      // even after the market has closed.
      sessionQuotes = getLatestTradingSession(rawQuotes, exchangeTimezone);
    }

    // --------------------------------------------------
    // LUNCH BREAK
    // --------------------------------------------------

    let lunchStartMs: number | null = null;
    let lunchEndMs: number | null = null;

    if (
      range === "1D" &&
      sessionQuotes.length > 0 &&
      market?.tradingBreak &&
      exchangeTimezone
    ) {
      const latestQuote = sessionQuotes[sessionQuotes.length - 1];

      if (latestQuote?.date) {
        const tradingDate = getExchangeDate(
          new Date(latestQuote.date),
          exchangeTimezone,
        );

        lunchStartMs = getTimestampForMarketTime(
          tradingDate,
          market.tradingBreak.start,
          exchangeTimezone,
        );

        lunchEndMs = getTimestampForMarketTime(
          tradingDate,
          market.tradingBreak.end,
          exchangeTimezone,
        );
      }
    }

    // --------------------------------------------------
    // MARKET STATE
    // --------------------------------------------------

    const isClosed = isRegularMarketClosed(meta, lunchStartMs, lunchEndMs);

    // --------------------------------------------------
    // NO DATA
    // --------------------------------------------------

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

        isClosed,

        requestedSymbol: rawSymbol,
        providerSymbol: symbol,
        exchangeTimezone,

        lunchStartMs,
        lunchEndMs,
      });
    }

    // --------------------------------------------------
    // NORMALIZE CANDLES
    // --------------------------------------------------

    const points = sessionQuotes
      .filter(
        (quote: any) =>
          quote?.close != null && Number.isFinite(Number(quote.close)),
      )
      .map((quote: any) => {
        const close = Number(quote.close);

        const normalizedClose = Number(close.toFixed(2));

        return {
          timestampMs: new Date(quote.date).getTime(),

          price: normalizedClose,

          open:
            quote.open != null
              ? Number(Number(quote.open).toFixed(2))
              : normalizedClose,

          high:
            quote.high != null
              ? Number(Number(quote.high).toFixed(2))
              : normalizedClose,

          low:
            quote.low != null
              ? Number(Number(quote.low).toFixed(2))
              : normalizedClose,

          close: normalizedClose,
        };
      });

    // --------------------------------------------------
    // NO VALID POINTS
    // --------------------------------------------------

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

        isClosed,

        requestedSymbol: rawSymbol,
        providerSymbol: symbol,
        exchangeTimezone,

        lunchStartMs,
        lunchEndMs,
      });
    }

    // --------------------------------------------------
    // PRICE VALUES
    // --------------------------------------------------

    const currentPrice =
      typeof meta.regularMarketPrice === "number"
        ? meta.regularMarketPrice
        : (points[points.length - 1]?.price ?? 0);

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

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return NextResponse.json({
      points,

      currentPrice,
      previousClose,

      dailyChangePercent,
      rangeChangePercent,

      isClosed,

      requestedSymbol: rawSymbol,
      providerSymbol: symbol,
      exchangeTimezone,

      updatedAt: meta.regularMarketTime
        ? new Date(meta.regularMarketTime).getTime()
        : (points[points.length - 1]?.timestampMs ?? Date.now()),

      lunchStartMs,
      lunchEndMs,
    });
  } catch (error) {
    console.error(`Yahoo Finance chart error for ${symbol}:`, error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      },
    );
  }
}
