import "server-only";

import YahooFinance from "yahoo-finance2";

import { ALL_MARKET_SYMBOLS, TRADING_HOURS } from "@/lib/data/market-symbols";

const yahooFinance = new YahooFinance();

const DAY_MS = 24 * 60 * 60 * 1000;
const LOOKBACK_DAYS = 60;

function getLocalDateKey(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Unable to determine market date.");
  }

  return `${year}-${month}-${day}`;
}

export async function getReferenceClose(
  symbol: string,
  sessionDate: Date,
): Promise<number> {
  if (
    !(sessionDate instanceof Date) ||
    !Number.isFinite(sessionDate.getTime())
  ) {
    throw new Error("Invalid prediction session.");
  }

  const market = ALL_MARKET_SYMBOLS.find((item) => item.symbol === symbol);

  if (!market || market.assetType !== "index") {
    throw new Error("Voting is only available for indices.");
  }

  const schedule = market.marketSchedule
    ? TRADING_HOURS[market.marketSchedule]
    : null;

  const timezone = schedule?.timezone ?? market.timezone;

  if (!timezone) {
    throw new Error("Market timezone is unavailable.");
  }

  const providerSymbol = market.providerSymbol ?? market.symbol;

  // sessionDate is the actual market opening timestamp.
  // Determine its trading date in the exchange's timezone.
  const targetDateKey = getLocalDateKey(sessionDate, timezone);

  const targetSessionMs = sessionDate.getTime();

  const period1 = new Date(targetSessionMs - LOOKBACK_DAYS * DAY_MS);

  const period2 = new Date(Math.min(targetSessionMs + DAY_MS, Date.now()));

  if (period2.getTime() <= period1.getTime()) {
    throw new Error("Invalid prediction date range.");
  }

  const result = await yahooFinance.chart(providerSymbol, {
    period1,
    period2,
    interval: "1d",
    includePrePost: false,
    return: "array",
  });

  let latestTimestamp = -Infinity;
  let referenceClose: number | null = null;

  for (const quote of result.quotes) {
    const timestamp = quote.date.getTime();
    const close = quote.close;

    if (
      !Number.isFinite(timestamp) ||
      timestamp > Date.now() ||
      typeof close !== "number" ||
      !Number.isFinite(close) ||
      close <= 0
    ) {
      continue;
    }

    const tradingDateKey = getLocalDateKey(quote.date, timezone);

    // Never use the target session's own candle.
    if (tradingDateKey >= targetDateKey) continue;

    if (timestamp > latestTimestamp) {
      latestTimestamp = timestamp;
      referenceClose = close;
    }
  }

  if (referenceClose === null) {
    throw new Error("Previous close is unavailable.");
  }

  return referenceClose;
}
