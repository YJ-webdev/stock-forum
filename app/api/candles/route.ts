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

const DAY_MS = 24 * 60 * 60 * 1000;

const PROVIDER_SYMBOLS: Record<string, string> = {
  TOPIX: "1306.T",
};

type YahooInterval = "1m" | "2m" | "5m" | "15m" | "30m" | "60m" | "1d" | "1wk";

interface MarketSession {
  isClosed: boolean;
  marketOpenMs: number | null;
  marketCloseMs: number | null;
}

interface Candle {
  date: Date | string | number;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
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
  "1d": DAY_MS,
  "1wk": 7 * DAY_MS,
};

const ALLOWED_INTERVALS = new Set<YahooInterval>([
  "1m",
  "2m",
  "5m",
  "15m",
  "30m",
  "60m",
  "1d",
  "1wk",
]);

function isValidPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function toTimestamp(value: unknown): number {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string" || typeof value === "number") {
    return new Date(value).getTime();
  }

  return NaN;
}

function hasValidCandle(candles: Candle[]): boolean {
  return candles.some(
    (candle) =>
      isValidPrice(candle.close) && Number.isFinite(toTimestamp(candle.date)),
  );
}

function getPeriod1(range: string): Date {
  const now = new Date();

  switch (range) {
    case "1D":
      return new Date(now.getTime() - 7 * DAY_MS);

    case "5D":
      return new Date(now.getTime() - 5 * DAY_MS);

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
      return new Date(now.getTime() - 7 * DAY_MS);
  }
}

// -----------------------------------------------------------------------------
// YAHOO CACHE
// -----------------------------------------------------------------------------

async function fetchYahooChart(
  symbol: string,
  range: string,
  interval: YahooInterval,
) {
  return yahoo.chart(symbol, {
    period1: getPeriod1(range),
    interval,
    includePrePost: false,
  });
}

const getYahooQuote30Seconds = unstable_cache(
  async (symbol: string) => yahoo.quote(symbol),
  ["yahoo-quote-30-seconds-v1"],
  { revalidate: 30 },
);

const getYahooChart30Seconds = unstable_cache(
  fetchYahooChart,
  ["yahoo-chart-30-seconds-v2"],
  { revalidate: 30 },
);

const getYahooChart1Minute = unstable_cache(
  fetchYahooChart,
  ["yahoo-chart-1-minute-v2"],
  { revalidate: 60 },
);

const getYahooChart5Minutes = unstable_cache(
  fetchYahooChart,
  ["yahoo-chart-5-minutes-v2"],
  { revalidate: 300 },
);

const getYahooChart30Minutes = unstable_cache(
  fetchYahooChart,
  ["yahoo-chart-30-minutes-v2"],
  { revalidate: 1_800 },
);

function getCachedYahooChart(
  symbol: string,
  range: string,
  interval: YahooInterval,
) {
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

const getHolidayFallbackChart = unstable_cache(
  async (symbol: string, interval: YahooInterval, quoteTimeMs: number) => {
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

    let latestTimestamp = -Infinity;
    let previousClose: number | null = null;

    for (const candle of result.quotes ?? []) {
      const timestamp = toTimestamp(candle.date);

      if (
        !Number.isFinite(timestamp) ||
        !isValidPrice(candle.close) ||
        getExchangeDate(new Date(timestamp), timezone) >= quoteDate
      ) {
        continue;
      }

      if (timestamp > latestTimestamp) {
        latestTimestamp = timestamp;
        previousClose = candle.close;
      }
    }

    return previousClose;
  },
  ["yahoo-previous-daily-close-v1"],
  { revalidate: 300 },
);

// -----------------------------------------------------------------------------
// EXCHANGE DATE HELPERS
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

  const parts = getExchangeDateFormatter(timezone).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
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

  return new TZDate(
    year,
    month - 1,
    day,
    hours,
    minutes,
    0,
    timezone,
  ).getTime();
}

function addCalendarDays(dateString: string, amount: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
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
  if (marketSchedule === "SA_EQUITY") {
    return weekday === 5 || weekday === 6;
  }

  return weekday === 0 || weekday === 6;
}

function getNextTradingDay(
  dateString: string,
  marketSchedule?: MarketSymbolItem["marketSchedule"],
): string {
  let nextDate = addCalendarDays(dateString, 1);

  while (isMarketWeekend(getCalendarWeekday(nextDate), marketSchedule)) {
    nextDate = addCalendarDays(nextDate, 1);
  }

  return nextDate;
}

// -----------------------------------------------------------------------------
// LATEST TRADING SESSION
// -----------------------------------------------------------------------------

function getLatestTradingSession(
  quotes: Candle[],
  timezone?: string,
): Candle[] {
  let latestTimestamp = -Infinity;

  for (const quote of quotes) {
    const timestamp = toTimestamp(quote.date);

    if (
      isValidPrice(quote.close) &&
      Number.isFinite(timestamp) &&
      timestamp > latestTimestamp
    ) {
      latestTimestamp = timestamp;
    }
  }

  if (!Number.isFinite(latestTimestamp)) {
    return [];
  }

  const latestTradingDate = getExchangeDate(
    new Date(latestTimestamp),
    timezone,
  );

  return quotes.filter((quote) => {
    const timestamp = toTimestamp(quote.date);

    return (
      Number.isFinite(timestamp) &&
      getExchangeDate(new Date(timestamp), timezone) === latestTradingDate
    );
  });
}

// -----------------------------------------------------------------------------
// DETECT INTRADAY BREAK
// -----------------------------------------------------------------------------

function detectTradingBreak(
  quotes: Candle[],
  interval: YahooInterval,
): {
  lunchStartMs: number | null;
  lunchEndMs: number | null;
} {
  if (interval === "1d" || interval === "1wk" || quotes.length < 2) {
    return {
      lunchStartMs: null,
      lunchEndMs: null,
    };
  }

  const expectedInterval = INTERVAL_MS[interval];
  const minimumBreakDuration = 10 * 60_000;
  const maximumBreakDuration = 3 * 60 * 60_000;

  let bestStartMs: number | null = null;
  let bestEndMs: number | null = null;
  let bestDuration = 0;
  let nullStartIndex: number | null = null;

  for (let i = 0; i < quotes.length; i++) {
    const quote = quotes[i];

    if (!isValidPrice(quote.close)) {
      if (nullStartIndex === null) {
        nullStartIndex = i;
      }

      continue;
    }

    if (nullStartIndex !== null) {
      const startMs = toTimestamp(quotes[nullStartIndex].date);
      const endMs = toTimestamp(quote.date);
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

  if (bestStartMs === null || bestEndMs === null) {
    const validQuotes = quotes.filter(
      (quote) =>
        isValidPrice(quote.close) && Number.isFinite(toTimestamp(quote.date)),
    );

    for (let i = 1; i < validQuotes.length; i++) {
      const previous = toTimestamp(validQuotes[i - 1].date);
      const current = toTimestamp(validQuotes[i].date);
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

// -----------------------------------------------------------------------------
// MARKET SESSIONS
// -----------------------------------------------------------------------------

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

  if (nowMs < todayOpenMs) {
    return {
      isClosed: true,
      marketOpenMs: todayOpenMs,
      marketCloseMs: todayCloseMs,
    };
  }

  if (nowMs < todayCloseMs) {
    return {
      isClosed: false,
      marketOpenMs: todayOpenMs,
      marketCloseMs: todayCloseMs,
    };
  }

  const nextDate = getNextTradingDay(today, market.marketSchedule);

  return {
    isClosed: true,
    marketOpenMs: getTimestampForMarketTime(nextDate, schedule.open, timezone),
    marketCloseMs: todayCloseMs,
  };
}

function getForexSession(now = new Date()): MarketSession {
  const timezone = "America/New_York";
  const nowMs = now.getTime();
  const today = getExchangeDate(now, timezone);
  const weekday = getExchangeWeekday(now, timezone);

  const today1700 = getTimestampForMarketTime(today, "17:00", timezone);

  if (weekday === 6) {
    return {
      isClosed: true,
      marketOpenMs: getTimestampForMarketTime(
        addCalendarDays(today, 1),
        "17:00",
        timezone,
      ),
      marketCloseMs: null,
    };
  }

  if (weekday === 0 && nowMs < today1700) {
    return {
      isClosed: true,
      marketOpenMs: today1700,
      marketCloseMs: null,
    };
  }

  if (weekday === 5 && nowMs >= today1700) {
    return {
      isClosed: true,
      marketOpenMs: getTimestampForMarketTime(
        addCalendarDays(today, 2),
        "17:00",
        timezone,
      ),
      marketCloseMs: today1700,
    };
  }

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
    case "currency":
      return getForexSession();

    case "index":
    case "stock":
      return getRegularMarketSession(market);

    case "crypto":
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

// -----------------------------------------------------------------------------
// ROUTE
// -----------------------------------------------------------------------------

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const rawSymbol = searchParams.get("symbol") || "^GSPC";
  const range = searchParams.get("range") || "1D";
  const symbol = PROVIDER_SYMBOLS[rawSymbol] || rawSymbol;

  const requestedInterval = searchParams.get("interval");

  const interval: YahooInterval =
    requestedInterval &&
    ALLOWED_INTERVALS.has(requestedInterval as YahooInterval)
      ? (requestedInterval as YahooInterval)
      : INTERVALS[range] || "5m";

  try {
    const [chartResult, quote] = await Promise.all([
      getCachedYahooChart(symbol, range, interval),
      getYahooQuote30Seconds(symbol),
    ]);

    const rawQuotes: Candle[] = Array.isArray(chartResult.quotes)
      ? chartResult.quotes
      : [];

    const meta = chartResult.meta;

    const market = ALL_MARKET_SYMBOLS.find(
      (item) =>
        item.symbol === rawSymbol ||
        item.symbol === symbol ||
        item.providerSymbol === symbol,
    );

    const exchangeTimezone =
      market?.timezone ||
      market?.exchangeTimezone ||
      meta?.exchangeTimezoneName ||
      undefined;

    const quoteTimeMs = toTimestamp(quote.regularMarketTime);

    const shouldCheckDailyClose =
      market?.assetType === "index" || market?.assetType === "stock";

    // Start before holiday fallback so both requests can run concurrently.
    const previousDailyClosePromise =
      shouldCheckDailyClose && exchangeTimezone && Number.isFinite(quoteTimeMs)
        ? getPreviousDailyClose(
            symbol,
            getExchangeDate(new Date(quoteTimeMs), exchangeTimezone),
            exchangeTimezone,
          ).catch((error) => {
            console.warn(
              `[candles] Previous daily close lookup failed: ${symbol}`,
              error instanceof Error ? error.message : String(error),
            );

            return null;
          })
        : Promise.resolve(null);

    const { isClosed, marketOpenMs, marketCloseMs } = getMarketSession(market);

    let sessionQuotes = rawQuotes;
    let effectiveInterval = interval;

    if (range === "1D") {
      sessionQuotes = getLatestTradingSession(rawQuotes, exchangeTimezone);

      if (!hasValidCandle(sessionQuotes) && Number.isFinite(quoteTimeMs)) {
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

            if (hasValidCandle(fallbackQuotes)) {
              sessionQuotes = fallbackQuotes;
              effectiveInterval = fallbackInterval;
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

    sessionQuotes = sessionQuotes
      .filter((candle) => Number.isFinite(toTimestamp(candle.date)))
      .slice()
      .sort((a, b) => toTimestamp(a.date) - toTimestamp(b.date));

    let previousClose = isValidPrice(quote.regularMarketPreviousClose)
      ? quote.regularMarketPreviousClose
      : isValidPrice(meta?.previousClose)
        ? meta.previousClose
        : 0;

    const dailyPreviousClose = await previousDailyClosePromise;

    if (isValidPrice(dailyPreviousClose)) {
      previousClose = dailyPreviousClose;
    }

    const points = sessionQuotes
      .filter((candle): candle is Candle & { close: number } =>
        isValidPrice(candle.close),
      )
      .map((candle) => {
        const close = Number(candle.close.toFixed(2));

        return {
          timestampMs: toTimestamp(candle.date),
          price: close,
          open: isValidPrice(candle.open)
            ? Number(candle.open.toFixed(2))
            : close,
          high: isValidPrice(candle.high)
            ? Number(candle.high.toFixed(2))
            : close,
          low: isValidPrice(candle.low) ? Number(candle.low.toFixed(2)) : close,
          close,
        };
      });

    const currentPrice = isValidPrice(quote.regularMarketPrice)
      ? quote.regularMarketPrice
      : isValidPrice(meta?.regularMarketPrice)
        ? meta.regularMarketPrice
        : (points.at(-1)?.price ?? 0);

    const dailyChangePercent =
      previousClose > 0 && currentPrice > 0
        ? ((currentPrice - previousClose) / previousClose) * 100
        : 0;

    const rangeStartPrice = points[0]?.price ?? previousClose;

    const rangeChangePercent =
      points.length === 0
        ? range === "1D"
          ? dailyChangePercent
          : null
        : rangeStartPrice > 0
          ? ((currentPrice - rangeStartPrice) / rangeStartPrice) * 100
          : 0;

    const metaTimeMs = toTimestamp(meta?.regularMarketTime);

    const updatedAt = Number.isFinite(quoteTimeMs)
      ? quoteTimeMs
      : Number.isFinite(metaTimeMs)
        ? metaTimeMs
        : (points.at(-1)?.timestampMs ?? null);

    const { lunchStartMs, lunchEndMs } =
      range === "1D" && sessionQuotes.length > 0
        ? detectTradingBreak(sessionQuotes, effectiveInterval)
        : {
            lunchStartMs: null,
            lunchEndMs: null,
          };

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
      updatedAt,
      lunchStartMs,
      lunchEndMs,
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
