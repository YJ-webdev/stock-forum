import { TZDate } from "@date-fns/tz";
import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

import {
  ALL_MARKET_SYMBOLS,
  TRADING_HOURS,
  type MarketSymbolItem,
} from "@/lib/data/market-symbols";

export const dynamic = "force-dynamic";

const yahoo = new YahooFinance();
const PROVIDER_SYMBOLS: Record<string, string> = {
  TOPIX: "1306.T",
};

type YahooInterval = "1m" | "2m" | "5m" | "15m" | "30m" | "60m" | "1d" | "1wk";

interface MarketSession {
  isClosed: boolean;
  marketOpenMs: number | null;
  marketCloseMs: number | null;
}

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

const INTERVAL_MS: Record<YahooInterval, number> = {
  "1m": 60_000,
  "2m": 2 * 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "30m": 30 * 60_000,
  "60m": 60 * 60_000,
  "1d": 24 * 60 * 60_000,
  "1wk": 7 * 24 * 60 * 60_000,
};

function getPeriod1(range: string): Date {
  const now = new Date();

  switch (range) {
    case "1D":
      /*
       * Fetch several days so the latest complete/active
       * trading session can still be found after close,
       * weekends, etc.
       */
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

function getExchangeWeekday(date: Date, timezone: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(date);

  const days: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return days[weekday] ?? 0;
}

function getTimestampForMarketTime(
  date: string,
  time: string,
  timezone: string,
): number {
  const [year, month, day] = date.split("-").map(Number);

  const [hours, minutes] = time.split(":").map(Number);

  const zonedDate = new TZDate(
    year,
    month - 1,
    day,
    hours,
    minutes,
    0,
    timezone,
  );

  return zonedDate.getTime();
}

function addCalendarDays(dateString: string, amount: number): string {
  const [year, month, day] = dateString.split("-").map(Number);

  /*
   * UTC is intentionally used here only for calendar arithmetic.
   * The resulting YYYY-MM-DD is later interpreted in the
   * exchange's own timezone by TZDate.
   */
  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() + amount);

  return date.toISOString().slice(0, 10);
}

function getCalendarWeekday(dateString: string): number {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function isMarketWeekend(
  weekday: number,
  marketSchedule?: MarketSymbolItem["marketSchedule"],
): boolean {
  // Saudi Exchange: Friday + Saturday
  if (marketSchedule === "SA_EQUITY") {
    return weekday === 5 || weekday === 6;
  }

  // Default: Saturday + Sunday
  return weekday === 0 || weekday === 6;
}

function getNextTradingDay(
  dateString: string,
  marketSchedule?: MarketSymbolItem["marketSchedule"],
): string {
  let nextDate = addCalendarDays(dateString, 1);

  while (true) {
    const weekday = getCalendarWeekday(nextDate);

    if (!isMarketWeekend(weekday, marketSchedule)) {
      return nextDate;
    }

    nextDate = addCalendarDays(nextDate, 1);
  }
}

function getLatestTradingSession(quotes: any[], timezone?: string): any[] {
  if (quotes.length === 0) {
    return [];
  }

  const validQuotes = quotes.filter((quote) => quote?.date);

  if (validQuotes.length === 0) {
    return [];
  }

  const latestQuote = validQuotes[validQuotes.length - 1];

  const latestTradingDate = getExchangeDate(
    new Date(latestQuote.date),
    timezone,
  );

  return validQuotes.filter(
    (quote) =>
      getExchangeDate(new Date(quote.date), timezone) === latestTradingDate,
  );
}

// -----------------------------------------------------------------------------
// DETECT INTRADAY BREAK
// -----------------------------------------------------------------------------

// function detectTradingBreak(
//   quotes: any[],
//   interval: YahooInterval,
// ): {
//   lunchStartMs: number | null;
//   lunchEndMs: number | null;
// } {
//   /*
//    * Only intraday candles can tell us about an
//    * intraday trading break.
//    */
//   if (interval === "1d" || interval === "1wk") {
//     return {
//       lunchStartMs: null,
//       lunchEndMs: null,
//     };
//   }

//   const timestamps = quotes
//     .filter((quote) => quote?.date)
//     .map((quote) => new Date(quote.date).getTime())
//     .filter(Number.isFinite)
//     .sort((a, b) => a - b);

//   if (timestamps.length < 2) {
//     return {
//       lunchStartMs: null,
//       lunchEndMs: null,
//     };
//   }

//   const expectedInterval = INTERVAL_MS[interval];

//   /*
//    * Require a gap of at least 3 normal candle intervals.
//    *
//    * Example with 15m candles:
//    *
//    * 15m = normal
//    * 30m = possibly missing candle
//    * 45m+ = meaningful session gap
//    */
//   const minimumGap = expectedInterval * 3;

//   let largestGap = 0;
//   let lunchStartMs: number | null = null;
//   let lunchEndMs: number | null = null;

//   for (let index = 1; index < timestamps.length; index++) {
//     const previous = timestamps[index - 1];

//     const current = timestamps[index];

//     const gap = current - previous;

//     if (gap >= minimumGap && gap > largestGap) {
//       largestGap = gap;

//       /*
//        * previous = last candle before break
//        *
//        * Its candle covers one interval, therefore the
//        * actual gap begins one candle interval later.
//        */
//       lunchStartMs = previous + expectedInterval;

//       lunchEndMs = current;
//     }
//   }

//   return {
//     lunchStartMs,
//     lunchEndMs,
//   };
// }
function detectTradingBreak(
  quotes: any[],
  interval: YahooInterval,
): {
  lunchStartMs: number | null;
  lunchEndMs: number | null;
} {
  if (interval === "1d" || interval === "1wk") {
    return {
      lunchStartMs: null,
      lunchEndMs: null,
    };
  }

  if (quotes.length < 2) {
    return {
      lunchStartMs: null,
      lunchEndMs: null,
    };
  }

  const expectedInterval = INTERVAL_MS[interval];

  // At least 10 minutes of consecutive null candles
  // so we don't mistake a few missing candles for a lunch break.
  const minimumBreakDuration = 10 * 60 * 1000;

  // Don't consider anything longer than 3 hours a lunch break.
  const maximumBreakDuration = 3 * 60 * 60 * 1000;

  let bestStartMs: number | null = null;
  let bestEndMs: number | null = null;
  let bestDuration = 0;

  let nullStartIndex: number | null = null;

  for (let i = 0; i < quotes.length; i++) {
    const quote = quotes[i];

    const hasPrice =
      quote?.close != null && Number.isFinite(Number(quote.close));

    if (!hasPrice) {
      if (nullStartIndex === null) {
        nullStartIndex = i;
      }

      continue;
    }

    // We just reached the first valid candle after a null run.
    if (nullStartIndex !== null) {
      const firstNullQuote = quotes[nullStartIndex];
      const firstValidAfterBreak = quote;

      const startMs = new Date(firstNullQuote.date).getTime();
      const endMs = new Date(firstValidAfterBreak.date).getTime();

      const duration = endMs - startMs;

      if (
        duration >= minimumBreakDuration &&
        duration <= maximumBreakDuration &&
        duration > bestDuration
      ) {
        bestDuration = duration;
        bestStartMs = startMs;
        bestEndMs = endMs;
      }

      nullStartIndex = null;
    }
  }

  if (bestStartMs == null || bestEndMs == null) {
    const validQuotes = quotes.filter(
      (quote) =>
        quote?.date &&
        quote?.close != null &&
        Number.isFinite(Number(quote.close)),
    );

    for (let i = 1; i < validQuotes.length; i++) {
      const previous = new Date(validQuotes[i - 1].date).getTime();
      const current = new Date(validQuotes[i].date).getTime();

      const gap = current - previous;

      if (
        gap >= expectedInterval * 3 &&
        gap <= maximumBreakDuration &&
        gap > bestDuration
      ) {
        bestDuration = gap;

        bestStartMs = previous + expectedInterval;
        bestEndMs = current;
      }
    }
  }

  return {
    lunchStartMs: bestStartMs,
    lunchEndMs: bestEndMs,
  };
}

function getRegularMarketSession(
  market: MarketSymbolItem,
  now = new Date(),
): MarketSession {
  if (!market.marketSchedule) {
    return {
      isClosed: true,
      marketOpenMs: null,
      marketCloseMs: null,
    };
  }

  const schedule = TRADING_HOURS[market.marketSchedule];
  const timezone = schedule.timezone;

  const nowMs = now.getTime();
  const today = getExchangeDate(now, timezone);
  const weekday = getExchangeWeekday(now, timezone);

  // Weekend
  if (isMarketWeekend(weekday, market.marketSchedule)) {
    const nextDate = getNextTradingDay(today, market.marketSchedule);

    return {
      isClosed: true,
      marketOpenMs: getTimestampForMarketTime(
        nextDate,
        schedule.open,
        timezone,
      ),
      marketCloseMs: null,
    };
  }

  const todayOpenMs = getTimestampForMarketTime(today, schedule.open, timezone);

  const todayCloseMs = getTimestampForMarketTime(
    today,
    schedule.close,
    timezone,
  );

  // Before today's opening
  if (nowMs < todayOpenMs) {
    return {
      isClosed: true,
      marketOpenMs: todayOpenMs,
      marketCloseMs: todayCloseMs,
    };
  }

  // During today's regular session
  if (nowMs >= todayOpenMs && nowMs < todayCloseMs) {
    return {
      isClosed: false,
      marketOpenMs: todayOpenMs,
      marketCloseMs: todayCloseMs,
    };
  }

  // After close -> next weekday
  const nextDate = getNextTradingDay(today, market.marketSchedule);

  return {
    isClosed: true,
    marketOpenMs: getTimestampForMarketTime(nextDate, schedule.open, timezone),
    marketCloseMs: todayCloseMs,
  };
}

function getForexSession(now = new Date()): MarketSession {
  /*
   * Simplified global FX session:
   *
   * Sunday 17:00 New York
   * ->
   * Friday 17:00 New York
   */

  const timezone = "America/New_York";
  const nowMs = now.getTime();
  const today = getExchangeDate(now, timezone);
  const weekday = getExchangeWeekday(now, timezone);
  const today1700 = getTimestampForMarketTime(today, "17:00", timezone);

  /*
   * Saturday.
   */
  if (weekday === 6) {
    const sunday = addCalendarDays(today, 1);

    return {
      isClosed: true,

      marketOpenMs: getTimestampForMarketTime(sunday, "17:00", timezone),

      marketCloseMs: null,
    };
  }

  /*
   * Sunday before 17:00.
   */
  if (weekday === 0 && nowMs < today1700) {
    return {
      isClosed: true,
      marketOpenMs: today1700,
      marketCloseMs: null,
    };
  }

  /*
   * Friday at/after 17:00.
   */
  if (weekday === 5 && nowMs >= today1700) {
    const sunday = addCalendarDays(today, 2);

    return {
      isClosed: true,

      marketOpenMs: getTimestampForMarketTime(sunday, "17:00", timezone),

      marketCloseMs: today1700,
    };
  }

  return {
    isClosed: false,
    marketOpenMs: null,
    marketCloseMs: null,
  };
}

function getCryptoSession(): MarketSession {
  return {
    isClosed: false,
    marketOpenMs: null,
    marketCloseMs: null,
  };
}

function getMarketSession(market?: MarketSymbolItem): MarketSession {
  if (!market) {
    return {
      isClosed: true,
      marketOpenMs: null,
      marketCloseMs: null,
    };
  }

  switch (market.assetType) {
    case "crypto":
      return getCryptoSession();

    case "currency":
      return getForexSession();

    case "index":
    case "stock":
      return getRegularMarketSession(market);

    /*
     * Futures require their own session model.
     *
     * They often trade almost 24 hours and cross
     * midnight with daily maintenance breaks.
     *
     * Until we add that properly, don't pretend
     * GLOBAL has stock-market hours.
     */
    case "commodities":
      return {
        isClosed: false,
        marketOpenMs: null,
        marketCloseMs: null,
      };

    default:
      return {
        isClosed: true,
        marketOpenMs: null,
        marketCloseMs: null,
      };
  }
}

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

    const market = ALL_MARKET_SYMBOLS.find(
      (item) =>
        item.symbol === rawSymbol ||
        item.symbol === symbol ||
        item.providerSymbol === symbol,
    );

    const exchangeTimezone =
      market?.timezone ||
      market?.exchangeTimezone ||
      meta.exchangeTimezoneName ||
      undefined;

    const { isClosed, marketOpenMs, marketCloseMs } = getMarketSession(market);

    let sessionQuotes = rawQuotes;

    if (range === "1D") {
      /*
       * Keep the complete latest trading session.
       *
       * Do NOT slice the last X hours because that
       * breaks charts after market close.
       */
      sessionQuotes = getLatestTradingSession(rawQuotes, exchangeTimezone);
    }

    let lunchStartMs: number | null = null;
    let lunchEndMs: number | null = null;

    if (range === "1D" && sessionQuotes.length > 0) {
      const detectedBreak = detectTradingBreak(sessionQuotes, interval);

      lunchStartMs = detectedBreak.lunchStartMs;
      lunchEndMs = detectedBreak.lunchEndMs;
    }

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

        marketOpenMs,
        marketCloseMs,

        requestedSymbol: rawSymbol,

        providerSymbol: symbol,

        exchangeTimezone,

        updatedAt: meta.regularMarketTime
          ? new Date(meta.regularMarketTime).getTime()
          : Date.now(),

        lunchStartMs,
        lunchEndMs,
      });
    }

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

        marketOpenMs,
        marketCloseMs,

        requestedSymbol: rawSymbol,

        providerSymbol: symbol,

        exchangeTimezone,

        updatedAt: meta.regularMarketTime
          ? new Date(meta.regularMarketTime).getTime()
          : Date.now(),

        lunchStartMs,
        lunchEndMs,
      });
    }

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

    return NextResponse.json({
      points,

      currentPrice,
      previousClose,

      dailyChangePercent,
      rangeChangePercent,

      isClosed,

      marketOpenMs,
      marketCloseMs,

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
