import "server-only";

import { TZDate } from "@date-fns/tz";
import YahooFinance from "yahoo-finance2";

import {
  ALL_MARKET_SYMBOLS,
  TRADING_HOURS,
  type MarketSymbolItem,
} from "@/lib/data/market-symbols";

const yahoo = new YahooFinance();

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export type DailyMarketCandle = {
  date: string;
  timestampMs: number;

  open: number;
  high: number;
  low: number;
  close: number;
};

// -----------------------------------------------------------------------------
// PROVIDER SYMBOL OVERRIDES
// -----------------------------------------------------------------------------

const PROVIDER_SYMBOLS: Record<string, string> = {
  TOPIX: "1306.T",
};

// -----------------------------------------------------------------------------
// PROVIDER SYMBOL
// -----------------------------------------------------------------------------

export function resolveProviderSymbol(symbol: string): string {
  const market = ALL_MARKET_SYMBOLS.find((item) => item.symbol === symbol);

  return market?.providerSymbol ?? PROVIDER_SYMBOLS[symbol] ?? symbol;
}

// -----------------------------------------------------------------------------
// MARKET
// -----------------------------------------------------------------------------

function getMarket(symbol: string): MarketSymbolItem | undefined {
  return ALL_MARKET_SYMBOLS.find(
    (item) => item.symbol === symbol || item.providerSymbol === symbol,
  );
}

// -----------------------------------------------------------------------------
// EXCHANGE DATE
// -----------------------------------------------------------------------------

export function getExchangeDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// -----------------------------------------------------------------------------
// MARKET TIME -> TIMESTAMP
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// DAILY CANDLES
// -----------------------------------------------------------------------------

export async function getDailyCandles({
  symbol,
  period1,
  period2,
}: {
  symbol: string;
  period1: Date;
  period2: Date;
}): Promise<DailyMarketCandle[]> {
  const providerSymbol = resolveProviderSymbol(symbol);

  const market = getMarket(symbol);

  const result = (await yahoo.chart(providerSymbol, {
    period1,
    period2,
    interval: "1d",
    includePrePost: false,
  })) as any;

  const quotes = Array.isArray(result?.quotes) ? result.quotes : [];

  const timezone =
    market?.timezone ??
    market?.exchangeTimezone ??
    result?.meta?.exchangeTimezoneName;

  if (!timezone) {
    throw new Error(`Could not determine exchange timezone for ${symbol}.`);
  }

  return quotes
    .filter((quote: any) => {
      if (!quote?.date) {
        return false;
      }

      const open = Number(quote.open);
      const high = Number(quote.high);
      const low = Number(quote.low);
      const close = Number(quote.close);

      return (
        Number.isFinite(open) &&
        Number.isFinite(high) &&
        Number.isFinite(low) &&
        Number.isFinite(close) &&
        close > 0
      );
    })
    .map((quote: any): DailyMarketCandle => {
      const date = new Date(quote.date);

      return {
        date: getExchangeDate(date, timezone),

        timestampMs: date.getTime(),

        open: Number(quote.open),
        high: Number(quote.high),
        low: Number(quote.low),
        close: Number(quote.close),
      };
    })
    .sort(
      (a: DailyMarketCandle, b: DailyMarketCandle) =>
        a.timestampMs - b.timestampMs,
    );
}

// -----------------------------------------------------------------------------
// REFERENCE CLOSE
// -----------------------------------------------------------------------------

export async function getReferenceClose(
  symbol: string,
  sessionDate: Date,
): Promise<number> {
  if (!(sessionDate instanceof Date) || Number.isNaN(sessionDate.getTime())) {
    throw new Error("Invalid prediction session.");
  }

  const market = getMarket(symbol);

  if (!market) {
    throw new Error(`Unknown market: ${symbol}`);
  }

  const timezone = market.timezone ?? market.exchangeTimezone;

  if (!timezone) {
    throw new Error(`Could not determine exchange timezone for ${symbol}.`);
  }

  // ---------------------------------------------------------------------------
  // TARGET SESSION DATE
  // ---------------------------------------------------------------------------

  const targetSessionDate = getExchangeDate(sessionDate, timezone);

  /*
   * Fetch enough history to safely cross:
   *
   * - weekends
   * - normal holidays
   * - consecutive exchange holidays
   *
   * We do NOT calculate the previous trading day ourselves.
   *
   * The existence of an actual Yahoo daily candle determines whether
   * a trading session occurred.
   */

  const period1 = new Date(sessionDate.getTime() - 14 * 24 * 60 * 60 * 1000);

  /*
   * Fetch slightly beyond the target.
   *
   * We still explicitly require candle.date < targetSessionDate below,
   * therefore the target day's candle can never become referenceClose.
   */

  const period2 = new Date(sessionDate.getTime() + 2 * 24 * 60 * 60 * 1000);

  const candles = await getDailyCandles({
    symbol,
    period1,
    period2,
  });

  // ---------------------------------------------------------------------------
  // PREVIOUS REAL TRADING SESSION
  // ---------------------------------------------------------------------------

  const previousCandles = candles.filter(
    (candle) => candle.date < targetSessionDate,
  );

  const previousSession = previousCandles[previousCandles.length - 1];

  if (!previousSession) {
    throw new Error(
      `Could not find a previous completed trading session for ${symbol}.`,
    );
  }

  const referenceClose = previousSession.close;

  if (!Number.isFinite(referenceClose) || referenceClose <= 0) {
    throw new Error(`Invalid previous closing price for ${symbol}.`);
  }

  return referenceClose;
}

// -----------------------------------------------------------------------------
// COMPLETED DAILY CANDLE
// -----------------------------------------------------------------------------

function isCompletedDailyCandle({
  candle,
  market,
  now = new Date(),
}: {
  candle: DailyMarketCandle;
  market: MarketSymbolItem;
  now?: Date;
}): boolean {
  /*
   * Prediction settlement currently applies to assets that have a defined
   * regular market schedule.
   *
   * If no schedule exists, we cannot safely determine that the session has
   * completed, so we leave the prediction pending.
   */

  if (!market.marketSchedule) {
    return false;
  }

  const schedule = TRADING_HOURS[market.marketSchedule];

  if (!schedule) {
    return false;
  }

  const timezone = schedule.timezone;

  // ---------------------------------------------------------------------------
  // SESSION CLOSE
  // ---------------------------------------------------------------------------

  const closeMs = getTimestampForMarketTime(
    candle.date,
    schedule.close,
    timezone,
  );

  /*
   * Yahoo may expose today's daily candle while the market is still trading.
   *
   * A candle therefore does NOT automatically mean that the trading session
   * has finished.
   *
   * Only accept it once the exchange's regular close has passed.
   */

  return now.getTime() >= closeMs;
}

// -----------------------------------------------------------------------------
// EXPECTED SESSION CLOSE
// -----------------------------------------------------------------------------

export function getExpectedSessionCloseMs(
  symbol: string,
  sessionDate: Date,
): number | null {
  if (!(sessionDate instanceof Date) || Number.isNaN(sessionDate.getTime())) {
    return null;
  }

  const market = getMarket(symbol);

  if (!market?.marketSchedule) {
    return null;
  }

  const schedule = TRADING_HOURS[market.marketSchedule];

  if (!schedule) {
    return null;
  }

  const timezone = schedule.timezone;

  /*
   * Convert sessionDate into the exchange's own calendar date.
   *
   * Example:
   * SPX -> America/New_York
   * N225 -> Asia/Tokyo
   * KOSPI -> Asia/Seoul
   */
  const exchangeDate = getExchangeDate(sessionDate, timezone);

  return getTimestampForMarketTime(exchangeDate, schedule.close, timezone);
}

// -----------------------------------------------------------------------------
// SETTLEMENT CANDLE
// -----------------------------------------------------------------------------

export async function getSettlementCandle(
  symbol: string,
  sessionDate: Date,
): Promise<DailyMarketCandle | null> {
  if (!(sessionDate instanceof Date) || Number.isNaN(sessionDate.getTime())) {
    throw new Error("Invalid prediction session.");
  }

  const market = getMarket(symbol);

  if (!market) {
    throw new Error(`Unknown market: ${symbol}`);
  }

  const timezone = market.timezone ?? market.exchangeTimezone;

  if (!timezone) {
    throw new Error(`Could not determine exchange timezone for ${symbol}.`);
  }

  // ---------------------------------------------------------------------------
  // FUTURE SESSION
  // ---------------------------------------------------------------------------

  /*
   * If the target session itself is still in the future, there is obviously
   * nothing to settle yet.
   */

  if (sessionDate.getTime() > Date.now()) {
    return null;
  }

  // ---------------------------------------------------------------------------
  // TARGET SESSION DATE
  // ---------------------------------------------------------------------------

  const targetSessionDate = getExchangeDate(sessionDate, timezone);

  /*
   * Search from slightly before the target session through the present.
   *
   * Starting slightly before the target gives Yahoo a safe boundary around
   * timezone/date transitions.
   */

  const period1 = new Date(sessionDate.getTime() - 2 * 24 * 60 * 60 * 1000);

  /*
   * Yahoo's period2 behaves as the upper boundary of the requested range.
   *
   * Give it a small amount of forward room so today's completed candle can
   * be included after the market closes.
   *
   * We still protect against an active/incomplete candle with
   * isCompletedDailyCandle().
   */

  const period2 = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

  const candles = await getDailyCandles({
    symbol,
    period1,
    period2,
  });

  // ---------------------------------------------------------------------------
  // FIRST COMPLETED REAL TRADING SESSION ON OR AFTER TARGET
  // ---------------------------------------------------------------------------

  /*
   * This is the important settlement rule.
   *
   * Example:
   *
   * Target = Monday
   *
   * Monday holiday:
   *   no candle
   *
   * Tuesday:
   *   first actual candle >= Monday
   *
   * Tuesday while market is open:
   *   candle exists but isCompletedDailyCandle() === false
   *   -> prediction remains PENDING
   *
   * Tuesday after close:
   *   candle exists
   *   session close has passed
   *   -> Tuesday becomes the settlement session
   */

  const settlementCandle = candles.find(
    (candle) =>
      candle.date >= targetSessionDate &&
      isCompletedDailyCandle({
        candle,
        market,
      }),
  );

  // ---------------------------------------------------------------------------
  // NO COMPLETED SESSION YET
  // ---------------------------------------------------------------------------

  /*
   * No candle is NOT a draw.
   *
   * It means:
   *
   * - holiday
   * - weekend
   * - market has not closed yet
   * - Yahoo data is not available yet
   *
   * The Prediction must remain PENDING and can be retried later.
   */

  if (!settlementCandle) {
    return null;
  }

  return settlementCandle;
}
