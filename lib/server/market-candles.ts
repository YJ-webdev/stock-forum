import "server-only";

import YahooFinance from "yahoo-finance2";
import { TZDate } from "@date-fns/tz";
import { ALL_MARKET_SYMBOLS, TRADING_HOURS } from "@/lib/data/market-symbols";
import {
  buildMarketQuote,
  type InitialMarketQuote,
} from "@/lib/utils/build-market-quote";

const yahoo = new YahooFinance();
const DAY = 86_400_000;

type Interval =
  | "1m"
  | "2m"
  | "5m"
  | "15m"
  | "30m"
  | "60m"
  | "1d"
  | "1wk"
  | "1mo";
const intervals: Record<string, Interval> = {
  "1D": "5m",
  "5D": "15m",
  "1M": "1d",
  "3M": "1d",
  "6M": "1d",
  YTD: "1d",
  "1Y": "1wk",
  "5Y": "1mo",
  MAX: "1mo",
};
const allowed = new Set<Interval>([
  "1m",
  "2m",
  "5m",
  "15m",
  "30m",
  "60m",
  "1d",
  "1wk",
  "1mo",
]);
const price = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0;
const timestamp = (value: unknown): number => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" || typeof value === "string")
    return new Date(value).getTime();
  return NaN;
};

function startDate(range: string, now: Date): Date {
  const d = new Date(now);
  switch (range) {
    case "1D":
      return new Date(now.getTime() - 7 * DAY);
    case "5D":
      return new Date(now.getTime() - 14 * DAY);
    case "1M":
      d.setUTCMonth(d.getUTCMonth() - 1);
      break;
    case "3M":
      d.setUTCMonth(d.getUTCMonth() - 3);
      break;
    case "6M":
      d.setUTCMonth(d.getUTCMonth() - 6);
      break;
    case "YTD":
      return new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    case "1Y":
      d.setUTCFullYear(d.getUTCFullYear() - 1);
      break;
    case "5Y":
      d.setUTCFullYear(d.getUTCFullYear() - 5);
      break;
    case "MAX":
      return new Date("1980-01-01T00:00:00.000Z");
  }
  return d;
}

const dateFormatters = new Map<string, Intl.DateTimeFormat>();
function exchangeDay(ms: number, timezone: string): string {
  let formatter = dateFormatters.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    dateFormatters.set(timezone, formatter);
  }
  const parts = formatter.formatToParts(ms);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function sessionState(
  market: (typeof ALL_MARKET_SYMBOLS)[number] | undefined,
  now: Date,
) {
  const empty = {
    isClosed: true,
    marketOpenMs: null as number | null,
    marketCloseMs: null as number | null,
  };
  if (!market) return empty;
  if (market.assetType === "crypto" || market.assetType === "commodity")
    return { ...empty, isClosed: false };
  if (market.assetType === "currency") {
    const ny = "America/New_York";
    const date = exchangeDay(now.getTime(), ny);
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: ny,
      weekday: "short",
    }).format(now);
    const [y, m, d] = date.split("-").map(Number);
    const close = new TZDate(y, m - 1, d, 17, 0, 0, ny).getTime();
    return {
      ...empty,
      isClosed:
        weekday === "Sat" ||
        (weekday === "Sun" && now.getTime() < close) ||
        (weekday === "Fri" && now.getTime() >= close),
    };
  }
  if (!market.marketSchedule) return empty;
  const schedule = TRADING_HOURS[market.marketSchedule];
  if (!schedule) return empty;
  const zone = schedule.timezone;
  const day = exchangeDay(now.getTime(), zone);
  const [y, m, d] = day.split("-").map(Number);
  const time = (hhmm: string) => {
    const [h, min] = hhmm.split(":").map(Number);
    return new TZDate(y, m - 1, d, h, min, 0, zone).getTime();
  };
  const open = time(schedule.open);
  const close = time(schedule.close);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    weekday: "short",
  }).format(now);
  const weekend =
    market.marketSchedule === "SA_EQUITY"
      ? weekday === "Fri" || weekday === "Sat"
      : weekday === "Sat" || weekday === "Sun";
  return {
    isClosed: weekend || now.getTime() < open || now.getTime() >= close,
    marketOpenMs: open,
    marketCloseMs: close,
  };
}

export async function getMarketCandles(
  rawSymbol = "^GSPC",
  range = "1D",
  requestedInterval?: string | null,
) {
  if (!(range in intervals))
    throw new Error(`Unsupported chart range: ${range}`);
  const market = ALL_MARKET_SYMBOLS.find((item) => item.symbol === rawSymbol);
  const symbol = market?.providerSymbol ?? rawSymbol;
  const interval: Interval = ["1Y", "5Y", "MAX"].includes(range)
    ? intervals[range]
    : requestedInterval && allowed.has(requestedInterval as Interval)
      ? (requestedInterval as Interval)
      : intervals[range];
  const now = new Date();

  // No Next.js data cache: each request checks Yahoo directly.
  // These requests may fail or be delayed by the upstream provider.
  const query = {
    period1: startDate(range, now),
    interval,
    includePrePost: false,
    return: "array" as const,
  };
  // Keep the validated Yahoo response type even for the known STOXX50E
  // null-currency exception, where runtime validation is disabled.
  type ChartResult = Awaited<ReturnType<typeof fetchValidatedChart>>;
  async function fetchValidatedChart() {
    return yahoo.chart(symbol, query);
  }
  const chartPromise: Promise<ChartResult> =
    symbol === "^STOXX50E"
      ? (yahoo.chart(symbol, query, {
          validateResult: false,
        }) as Promise<ChartResult>)
      : fetchValidatedChart();
  const [chart, quote] = await Promise.all([chartPromise, yahoo.quote(symbol)]);

  const timezone =
    market?.timezone ||
    market?.exchangeTimezone ||
    chart.meta?.exchangeTimezoneName ||
    "UTC";
  const candles = (chart.quotes ?? [])
    .filter((c) => Number.isFinite(timestamp(c.date)) && price(c.close))
    .map((c) => ({
      timestampMs: timestamp(c.date),
      price: c.close as number,
      open: price(c.open) ? c.open : (c.close as number),
      high: price(c.high) ? c.high : (c.close as number),
      low: price(c.low) ? c.low : (c.close as number),
      close: c.close as number,
    }))
    .sort((a, b) => a.timestampMs - b.timestampMs);

  let points = candles;
  if (range === "1D" && candles.length) {
    const lastDay = exchangeDay(
      candles[candles.length - 1].timestampMs,
      timezone,
    );
    points = candles.filter(
      (c) => exchangeDay(c.timestampMs, timezone) === lastDay,
    );
  }
  if (range === "5D" && candles.length) {
    const days = [
      ...new Set(candles.map((c) => exchangeDay(c.timestampMs, timezone))),
    ];
    const selected = new Set(days.slice(-5));
    points = candles.filter((c) =>
      selected.has(exchangeDay(c.timestampMs, timezone)),
    );
  }
  if (!points.length)
    throw new Error(`No valid candles returned for ${symbol}`);

  const last = points[points.length - 1];
  const quoteTime = timestamp(quote.regularMarketTime);
  const metaTime = timestamp(chart.meta?.regularMarketTime);
  // A quote can be newer than a chart. Keep the candle timestamps untouched.
  const quoteCurrent =
    price(quote.regularMarketPrice) &&
    Number.isFinite(quoteTime) &&
    quoteTime >= last.timestampMs &&
    (range !== "1D" ||
      exchangeDay(quoteTime, timezone) ===
        exchangeDay(last.timestampMs, timezone))
      ? quote.regularMarketPrice
      : undefined;
  const currentPrice = quoteCurrent ?? last.price;

  // Quote's official previous close is preferred; never derive it from intraday candles.
  const quoteMatchesSession =
    Number.isFinite(quoteTime) &&
    exchangeDay(quoteTime, timezone) ===
      exchangeDay(last.timestampMs, timezone);
  const previousClose =
    (range !== "1D" || quoteMatchesSession) &&
    price(quote.regularMarketPreviousClose)
      ? quote.regularMarketPreviousClose
      : price(chart.meta?.previousClose)
        ? chart.meta.previousClose
        : null;

  // Longer-range returns use the first visible candle's open as an explicit approximation.
  // This avoids a second query with independently cached data.
  const rangeBasePrice = range === "1D" ? previousClose : points[0].open;
  const base = rangeBasePrice && rangeBasePrice > 0 ? rangeBasePrice : null;
  const change = base === null ? null : ((currentPrice - base) / base) * 100;
  const session = sessionState(market, now);

  const schedule = market?.marketSchedule
    ? TRADING_HOURS[market.marketSchedule]
    : null;

  let lunchStartMs: number | null = null;
  let lunchEndMs: number | null = null;

  if (range === "1D" && schedule?.lunchStart && schedule?.lunchEnd) {
    const day = exchangeDay(last.timestampMs, schedule.timezone);
    const [year, month, date] = day.split("-").map(Number);

    const toTimestamp = (time: string) => {
      const [hour, minute] = time.split(":").map(Number);

      return new TZDate(
        year,
        month - 1,
        date,
        hour,
        minute,
        0,
        schedule.timezone,
      ).getTime();
    };

    lunchStartMs = toTimestamp(schedule.lunchStart);
    lunchEndMs = toTimestamp(schedule.lunchEnd);
  }

  return {
    points,
    currentPrice,
    previousClose: previousClose ?? undefined,
    rangeBasePrice,
    dailyChangePercent:
      previousClose && previousClose > 0
        ? ((currentPrice - previousClose) / previousClose) * 100
        : null,
    rangeChangePercent: change,
    ...session,
    requestedSymbol: rawSymbol,
    providerSymbol: symbol,
    exchangeTimezone: timezone,
    updatedAt:
      Number.isFinite(quoteTime) && quoteCurrent !== undefined
        ? quoteTime
        : Number.isFinite(metaTime) && metaTime >= last.timestampMs
          ? metaTime
          : last.timestampMs,
    lunchStartMs,
    lunchEndMs,
  };
}

/** Server-rendered initial data uses exactly the same market service as the API. */
export async function getInitialMarketQuote(
  symbol: string,
): Promise<InitialMarketQuote | null> {
  const market = ALL_MARKET_SYMBOLS.find((item) => item.symbol === symbol);
  if (!market) return null;

  try {
    const candles = await getMarketCandles(symbol, "1D", "1m");
    return {
      data: buildMarketQuote({
        candles,
        symbol,
        name: market.name,
        displaySymbol: market.displaySymbol ?? symbol,
        assetType: market.assetType,
        range: "1D",
      }),
      fetchedAt: Date.now(),
    };
  } catch (error) {
    console.error("[initial-market-quote]", symbol, error);
    return null;
  }
}
