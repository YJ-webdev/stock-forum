import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { TZDate } from "@date-fns/tz";

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
  "3M": "1d",
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

    case "3M":
      return new Date(now.setMonth(now.getMonth() - 3));

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

// -----------------------------------------------------------------------------
// YAHOO CHART CACHE
// -----------------------------------------------------------------------------

type CachedYahooChartResult = {
  chartResult: any;
  fetchedAt: number;
};

async function fetchYahooChart(
  symbol: string,
  range: string,
  interval: YahooInterval,
): Promise<CachedYahooChartResult> {
  const start = performance.now();

  const chartResult = await yahoo.chart(symbol, {
    period1: getPeriod1(range),
    interval,
    includePrePost: false,
  });

  console.log(
    `[PERF] yahoo.chart SOURCE ${symbol} ${range}/${interval}: ${(
      performance.now() - start
    ).toFixed(0)}ms`,
  );

  return {
    chartResult,
    fetchedAt: Date.now(),
  };
}

// 1D → 30 seconds
const getYahooChart30Seconds = unstable_cache(
  fetchYahooChart,
  ["yahoo-chart-30-seconds-v1"],
  {
    revalidate: 30,
  },
);

// 5D → 1 minute
const getYahooChart1Minute = unstable_cache(
  fetchYahooChart,
  ["yahoo-chart-1-minute-v1"],
  {
    revalidate: 60,
  },
);

// 1M / 3M / 6M / YTD / 1Y → 5 minutes
const getYahooChart5Minutes = unstable_cache(
  fetchYahooChart,
  ["yahoo-chart-5-minutes-v1"],
  {
    revalidate: 5 * 60,
  },
);

// 5Y / MAX → 30 minutes
const getYahooChart30Minutes = unstable_cache(
  fetchYahooChart,
  ["yahoo-chart-30-minutes-v1"],
  {
    revalidate: 30 * 60,
  },
);

function getCachedYahooChart(
  symbol: string,
  range: string,
  interval: YahooInterval,
): Promise<CachedYahooChartResult> {
  switch (range) {
    case "1D":
      return getYahooChart30Seconds(symbol, range, interval);

    case "5D":
      return getYahooChart1Minute(symbol, range, interval);

    case "1M":
    case "3M":
    case "6M":
    case "YTD":
    case "1Y":
      return getYahooChart5Minutes(symbol, range, interval);

    case "5Y":
    case "MAX":
      return getYahooChart30Minutes(symbol, range, interval);

    default:
      return getYahooChart1Minute(symbol, range, interval);
  }
}

// Cache fallback requests during long holidays.
const getHolidayFallbackChart = unstable_cache(
  async (symbol: string, interval: YahooInterval, quoteTimeMs: number) => {
    const DAY_MS = 24 * 60 * 60 * 1000;

    return yahoo.chart(symbol, {
      period1: new Date(quoteTimeMs - 3 * DAY_MS),
      period2: new Date(Math.min(Date.now(), quoteTimeMs + DAY_MS)),
      interval,
      includePrePost: false,
    });
  },
  ["yahoo-holiday-fallback-v1"],
  { revalidate: 300 },
);

const getPreviousDailyClose = unstable_cache(
  async (
    symbol: string,
    quoteDate: string,
    timezone: string,
  ): Promise<number | null> => {
    const period1 = getTimestampForMarketTime(
      addCalendarDays(quoteDate, -60),
      "00:00",
      timezone,
    );

    const period2 = Math.min(
      Date.now(),
      getTimestampForMarketTime(
        addCalendarDays(quoteDate, 1),
        "00:00",
        timezone,
      ),
    );

    const result = await yahoo.chart(symbol, {
      period1: new Date(period1),
      period2: new Date(period2),
      interval: "1d",
      includePrePost: false,
    });

    const previousCandles = (Array.isArray(result.quotes) ? result.quotes : [])
      .filter((candle) => {
        const timestamp = new Date(candle.date).getTime();

        return (
          Number.isFinite(timestamp) &&
          typeof candle.close === "number" &&
          Number.isFinite(candle.close) &&
          candle.close > 0 &&
          getExchangeDate(new Date(timestamp), timezone) < quoteDate
        );
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return previousCandles.at(-1)?.close ?? null;
  },
  ["yahoo-previous-daily-close-v1"],
  { revalidate: 300 },
);
// -----------------------------------------------------------------------------
// INTL FORMATTER CACHE
// -----------------------------------------------------------------------------

const exchangeDateFormatters = new Map<string, Intl.DateTimeFormat>();

const exchangeWeekdayFormatters = new Map<string, Intl.DateTimeFormat>();

function getExchangeDateFormatter(timezone: string): Intl.DateTimeFormat {
  let formatter = exchangeDateFormatters.get(timezone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    exchangeDateFormatters.set(timezone, formatter);
  }

  return formatter;
}

function getExchangeWeekdayFormatter(timezone: string): Intl.DateTimeFormat {
  let formatter = exchangeWeekdayFormatters.get(timezone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    });

    exchangeWeekdayFormatters.set(timezone, formatter);
  }

  return formatter;
}

function getExchangeDate(date: Date, timezone?: string): string {
  if (!timezone) {
    return date.toISOString().slice(0, 10);
  }

  return getExchangeDateFormatter(timezone).format(date);
}

function getExchangeWeekday(date: Date, timezone: string): number {
  const weekday = getExchangeWeekdayFormatter(timezone).format(date);

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

  // Only real candles should be allowed to determine
  // what the latest available trading session is.
  //
  // This is important after weekends / holidays / exchange closures,
  // because Yahoo may return timestamped entries without a valid close.
  const validQuotes = quotes.filter(
    (quote) =>
      quote?.date &&
      quote?.close != null &&
      Number.isFinite(Number(quote.close)),
  );

  if (validQuotes.length === 0) {
    return [];
  }

  // Do not assume Yahoo's array ordering.
  // Find the newest actual candle explicitly.
  const latestQuote = validQuotes.reduce((latest, quote) => {
    const latestMs = new Date(latest.date).getTime();
    const quoteMs = new Date(quote.date).getTime();

    return quoteMs > latestMs ? quote : latest;
  });

  const latestTradingDate = getExchangeDate(
    new Date(latestQuote.date),
    timezone,
  );

  // Return all quotes belonging to that actual trading session.
  //
  // We intentionally filter from the original array instead of validQuotes
  // so null candles inside a real session remain available to
  // detectTradingBreak().
  return quotes.filter(
    (quote) =>
      quote?.date &&
      getExchangeDate(new Date(quote.date), timezone) === latestTradingDate,
  );
}

// -----------------------------------------------------------------------------
// DETECT INTRADAY BREAK
// -----------------------------------------------------------------------------

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

  // Saturday
  if (weekday === 6) {
    const sunday = addCalendarDays(today, 1);

    return {
      isClosed: true,

      marketOpenMs: getTimestampForMarketTime(sunday, "17:00", timezone),

      marketCloseMs: null,
    };
  }

  // Sunday before 17:00
  if (weekday === 0 && nowMs < today1700) {
    return {
      isClosed: true,
      marketOpenMs: today1700,
      marketCloseMs: null,
    };
  }

  // Friday at/after 17:00
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
    case "commodity":
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
  const totalStart = performance.now();

  const { searchParams } = new URL(request.url);

  const rawSymbol = searchParams.get("symbol") || "^GSPC";
  const range = searchParams.get("range") || "1D";

  const symbol = PROVIDER_SYMBOLS[rawSymbol] || rawSymbol;

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
    const yahooStart = performance.now();

    const requestStartedAt = Date.now();

    const [cachedYahoo, quote] = await Promise.all([
      getCachedYahooChart(symbol, range, interval),
      yahoo.quote(symbol),
    ]);

    const chartResult = cachedYahoo.chartResult;

    const cacheStatus =
      cachedYahoo.fetchedAt >= requestStartedAt - 5 ? "MISS" : "HIT";

    console.log(
      `[PERF] yahoo.chart ${symbol} ${range}/${interval}: ${(
        performance.now() - yahooStart
      ).toFixed(0)}ms (${cacheStatus})`,
    );

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
      sessionQuotes = getLatestTradingSession(rawQuotes, exchangeTimezone);

      // When the rolling window contains no candles,
      // look around the date of the last available quote.
      const quoteTimeMs = quote.regularMarketTime
        ? new Date(quote.regularMarketTime).getTime()
        : NaN;

      const hasValidCandle = sessionQuotes.some(
        (candle: any) =>
          candle?.close != null &&
          Number.isFinite(Number(candle.close)) &&
          Number.isFinite(new Date(candle.date).getTime()),
      );

      if (!hasValidCandle && Number.isFinite(quoteTimeMs)) {
        // Older 1m data may be unavailable.
        // Try coarser intraday candles if needed.
        const fallbackIntervals = Array.from(
          new Set<YahooInterval>([interval, "5m", "15m"]),
        );

        for (const fallbackInterval of fallbackIntervals) {
          try {
            const fallback = await getHolidayFallbackChart(
              symbol,
              fallbackInterval,
              quoteTimeMs,
            );

            const fallbackQuotes = getLatestTradingSession(
              Array.isArray(fallback.quotes) ? fallback.quotes : [],
              exchangeTimezone,
            );

            const hasFallbackCandle = fallbackQuotes.some(
              (candle: any) =>
                candle?.close != null &&
                Number.isFinite(Number(candle.close)) &&
                Number.isFinite(new Date(candle.date).getTime()),
            );

            if (hasFallbackCandle) {
              sessionQuotes = fallbackQuotes;
              break;
            }
          } catch (error) {
            console.warn(
              `[candles] Holiday fallback failed: ${symbol}/${fallbackInterval}`,
              error instanceof Error ? error.message : String(error),
            );
          }
        }
      }
    }

    // Keep candles ordered before detecting gaps or selecting endpoints.
    sessionQuotes = sessionQuotes
      .filter(
        (candle: any) =>
          candle?.date != null &&
          Number.isFinite(new Date(candle.date).getTime()),
      )
      .slice()
      .sort(
        (a: any, b: any) =>
          new Date(a.date).getTime() - new Date(b.date).getTime(),
      );

    /*
     * Determine previous close once and reuse it
     * everywhere below, including early returns.
     *
     * For 1D, prefer the final valid candle before
     * the latest trading session.
     */
    const isValidPrice = (value: unknown): value is number =>
      typeof value === "number" && Number.isFinite(value) && value > 0;

    // Daily lookup failure falls back to the quote's previous close.
    // Do not use the current price or a multi-day chart's starting baseline.
    let previousClose = isValidPrice(quote.regularMarketPreviousClose)
      ? quote.regularMarketPreviousClose
      : isValidPrice(meta.previousClose)
        ? meta.previousClose
        : 0;

    const quoteTimeMs = quote.regularMarketTime
      ? new Date(quote.regularMarketTime).getTime()
      : NaN;

    const shouldCheckDailyClose =
      market?.assetType === "index" || market?.assetType === "stock";

    if (
      shouldCheckDailyClose &&
      exchangeTimezone &&
      Number.isFinite(quoteTimeMs)
    ) {
      const quoteDate = getExchangeDate(
        new Date(quoteTimeMs),
        exchangeTimezone,
      );

      try {
        const dailyPreviousClose = await getPreviousDailyClose(
          symbol,
          quoteDate,
          exchangeTimezone,
        );

        if (isValidPrice(dailyPreviousClose)) {
          previousClose = dailyPreviousClose;
        }
      } catch (error) {
        console.warn(
          `[candles] Previous daily close lookup failed: ${symbol}`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    console.log("[candles] previous close", {
      symbol,
      quotePreviousClose: quote.regularMarketPreviousClose,
      selectedPreviousClose: previousClose,
    });

    const availablePrice =
      typeof quote.regularMarketPrice === "number" &&
      Number.isFinite(quote.regularMarketPrice)
        ? quote.regularMarketPrice
        : typeof meta.regularMarketPrice === "number" &&
            Number.isFinite(meta.regularMarketPrice)
          ? meta.regularMarketPrice
          : 0;

    const availableDailyChangePercent =
      previousClose > 0 && availablePrice > 0
        ? ((availablePrice - previousClose) / previousClose) * 100
        : 0;

    const availableUpdatedAt = quote.regularMarketTime
      ? new Date(quote.regularMarketTime).getTime()
      : meta.regularMarketTime
        ? new Date(meta.regularMarketTime).getTime()
        : null;

    function emptyChartResponse() {
      return NextResponse.json({
        points: [],

        currentPrice: availablePrice,
        previousClose,

        dailyChangePercent: availableDailyChangePercent,
        rangeChangePercent: range === "1D" ? availableDailyChangePercent : null,

        isClosed,
        marketOpenMs,
        marketCloseMs,

        requestedSymbol: rawSymbol,
        providerSymbol: symbol,
        exchangeTimezone,

        updatedAt:
          availableUpdatedAt !== null && Number.isFinite(availableUpdatedAt)
            ? availableUpdatedAt
            : null,

        lunchStartMs: null,
        lunchEndMs: null,
      });
    }
    let lunchStartMs: number | null = null;
    let lunchEndMs: number | null = null;

    if (range === "1D" && sessionQuotes.length > 0) {
      const detectedBreak = detectTradingBreak(sessionQuotes, interval);

      lunchStartMs = detectedBreak.lunchStartMs;
      lunchEndMs = detectedBreak.lunchEndMs;
    }

    if (sessionQuotes.length === 0) {
      return emptyChartResponse();
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
      return emptyChartResponse();
    }

    const currentPrice =
      typeof quote.regularMarketPrice === "number"
        ? quote.regularMarketPrice
        : typeof meta.regularMarketPrice === "number"
          ? meta.regularMarketPrice
          : (points[points.length - 1]?.price ?? 0);

    const rangeStartPrice = points[0]?.price ?? previousClose;

    const dailyChangePercent =
      previousClose !== 0
        ? ((currentPrice - previousClose) / previousClose) * 100
        : 0;

    const rangeChangePercent =
      rangeStartPrice !== 0
        ? ((currentPrice - rangeStartPrice) / rangeStartPrice) * 100
        : 0;

    console.log(
      `[PERF] candles total ${symbol} ${range}/${interval}: ${(
        performance.now() - totalStart
      ).toFixed(0)}ms`,
    );

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
