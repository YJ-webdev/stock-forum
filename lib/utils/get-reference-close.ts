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
  const targetDateKey = getLocalDateKey(sessionDate, timezone);
  const targetSessionMs = sessionDate.getTime();
  const nowMs = Date.now();

  const period1 = new Date(targetSessionMs - LOOKBACK_DAYS * DAY_MS);
  const period2 = new Date(Math.min(targetSessionMs + DAY_MS, nowMs));

  if (period2.getTime() <= period1.getTime()) {
    throw new Error("Invalid prediction date range.");
  }

  const query = {
    period1,
    period2,
    interval: "1d" as const,
    includePrePost: false,
    return: "array" as const,
  };

  const fetchValidatedChart = () => yahooFinance.chart(providerSymbol, query);

  type ChartResult = Awaited<ReturnType<typeof fetchValidatedChart>>;

  const result: ChartResult =
    providerSymbol === "^STOXX50E"
      ? ((await yahooFinance.chart(providerSymbol, query, {
          validateResult: false,
        })) as ChartResult)
      : await fetchValidatedChart();

  if (!result || !Array.isArray(result.quotes)) {
    throw new Error("Market price data is unavailable.");
  }

  let latestTimestamp = -Infinity;
  let referenceClose: number | null = null;

  for (const quote of result.quotes) {
    if (!quote || !(quote.date instanceof Date)) {
      continue;
    }

    const timestamp = quote.date.getTime();
    const close = quote.close;

    if (
      !Number.isFinite(timestamp) ||
      timestamp > nowMs ||
      typeof close !== "number" ||
      !Number.isFinite(close) ||
      close <= 0
    ) {
      continue;
    }

    const tradingDateKey = getLocalDateKey(quote.date, timezone);

    // Never use the target session's own candle.
    if (tradingDateKey >= targetDateKey) {
      continue;
    }

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
