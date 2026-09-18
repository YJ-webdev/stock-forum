import { TZDate } from "@date-fns/tz";
import { ALL_MARKET_SYMBOLS, TRADING_HOURS } from "../data/market-symbols";

const COUNTDOWN_THRESHOLD_MS = 6 * 60 * 60 * 1000;

export type VotingCountdownType = "VOTING_OPENS" | "VOTING_CLOSES";

export interface VotingWindow {
  // true while the exchange is inside normal trading hours
  isMarketOpen: boolean;

  // inverse of isMarketOpen for scheduled equity markets
  canVote: boolean;

  // Timestamp the countdown is counting toward:
  //
  // Market closed -> next market OPEN
  // Market open   -> current market CLOSE
  targetMs: number | null;

  // The trading session this prediction belongs to.
  //
  // Before today's open -> today's open
  // After today's close -> next weekday's open
  // Weekend             -> next weekday's open
  predictionFor: Date | null;

  // Only display countdown when target is <= 6 hours away
  showCountdown: boolean;

  // Market closed -> "Voting closes in..."
  // Market open   -> "Voting opens in..."
  countdownType: VotingCountdownType | null;
}

/**
 * Creates an absolute timestamp for a wall-clock time in the
 * exchange's own timezone.
 *
 * Example:
 * timezone = "Asia/Seoul"
 * date     = 2026-09-16
 * time     = "09:00"
 */
function getTimestampForMarketTime(
  year: number,
  month: number,
  day: number,
  time: string,
  timezone: string,
): number {
  const [hours, minutes] = time.split(":").map(Number);

  return new TZDate(year, month, day, hours, minutes, 0, 0, timezone).getTime();
}

/**
 * Finds the next Monday-Friday market opening.
 *
 * For now this skips weekends only.
 * Exchange holidays / special sessions can be added later.
 */
function getNextWeekdayOpen(
  nowMs: number,
  open: string,
  timezone: string,
): number | null {
  const now = new TZDate(nowMs, timezone);

  for (let addDays = 1; addDays <= 7; addDays++) {
    const date = new TZDate(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + addDays,
      0,
      0,
      0,
      0,
      timezone,
    );

    const dayOfWeek = date.getDay();

    // Sunday = 0
    // Saturday = 6
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue;
    }

    return getTimestampForMarketTime(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      open,
      timezone,
    );
  }

  return null;
}

/**
 * Returns whether the countdown should currently be displayed.
 */
function shouldShowCountdown(targetMs: number, nowMs: number): boolean {
  const remaining = targetMs - nowMs;

  return remaining > 0 && remaining <= COUNTDOWN_THRESHOLD_MS;
}

/**
 * Calculate the current voting state for a market.
 *
 * Voting rules:
 *
 * MARKET CLOSED
 * -> voting enabled
 * -> predictionFor = next trading session
 * -> countdown points toward market OPEN
 *
 * MARKET OPEN
 * -> voting disabled
 * -> predictionFor = current trading session
 * -> countdown points toward market CLOSE
 *
 * Countdown is only shown when the next transition is
 * 6 hours or less away.
 */
export function getVotingWindow(
  symbol: string,
  nowMs = Date.now(),
): VotingWindow {
  const item = ALL_MARKET_SYMBOLS.find((market) => market.symbol === symbol);

  /**
   * Crypto / currency / commodities currently don't use the
   * equity marketSchedule system.
   */
  if (!item?.marketSchedule) {
    return {
      isMarketOpen: false,
      canVote: false,
      targetMs: null,
      predictionFor: null,
      showCountdown: false,
      countdownType: null,
    };
  }

  const schedule = TRADING_HOURS[item.marketSchedule];

  const now = new TZDate(nowMs, schedule.timezone);

  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  const dayOfWeek = now.getDay();

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // =====================================================
  // WEEKEND
  //
  // Market closed.
  // Voting enabled for the next weekday's session.
  // =====================================================

  if (isWeekend) {
    const nextOpenMs = getNextWeekdayOpen(
      nowMs,
      schedule.open,
      schedule.timezone,
    );

    if (!nextOpenMs) {
      return {
        isMarketOpen: false,
        canVote: true,
        targetMs: null,
        predictionFor: null,
        showCountdown: false,
        countdownType: null,
      };
    }

    return {
      isMarketOpen: false,
      canVote: true,

      targetMs: nextOpenMs,

      predictionFor: new Date(nextOpenMs),

      showCountdown: shouldShowCountdown(nextOpenMs, nowMs),

      countdownType: "VOTING_CLOSES",
    };
  }

  // =====================================================
  // TODAY'S MARKET OPEN / CLOSE
  // =====================================================

  const openMs = getTimestampForMarketTime(
    year,
    month,
    day,
    schedule.open,
    schedule.timezone,
  );

  const closeMs = getTimestampForMarketTime(
    year,
    month,
    day,
    schedule.close,
    schedule.timezone,
  );

  // =====================================================
  // BEFORE MARKET OPEN
  //
  // Example:
  //
  // KOSPI
  // Current time: 08:00
  // Market open:  09:00
  //
  // Voting: ACTIVE
  // Prediction: today's session
  // Countdown: "Voting closes in 01:00:00"
  // =====================================================

  if (nowMs < openMs) {
    return {
      isMarketOpen: false,
      canVote: true,

      targetMs: openMs,

      predictionFor: new Date(openMs),

      showCountdown: shouldShowCountdown(openMs, nowMs),

      countdownType: "VOTING_CLOSES",
    };
  }

  // =====================================================
  // MARKET OPEN
  //
  // Example:
  //
  // KOSPI
  // Current time: 12:00
  // Market close: 15:30
  //
  // Voting: DISABLED
  // Prediction: current session
  // Countdown: "Voting opens in 03:30:00"
  // =====================================================

  if (nowMs >= openMs && nowMs < closeMs) {
    return {
      isMarketOpen: true,
      canVote: false,

      targetMs: closeMs,

      predictionFor: new Date(openMs),

      showCountdown: shouldShowCountdown(closeMs, nowMs),

      countdownType: "VOTING_OPENS",
    };
  }

  // =====================================================
  // AFTER MARKET CLOSE
  //
  // Example:
  //
  // KOSPI
  // Current time: 16:00
  // Today's close: 15:30
  //
  // Voting: ACTIVE
  // Prediction: next weekday's session
  // Countdown target: next weekday's open
  // =====================================================

  const nextOpenMs = getNextWeekdayOpen(
    nowMs,
    schedule.open,
    schedule.timezone,
  );

  if (!nextOpenMs) {
    return {
      isMarketOpen: false,
      canVote: true,

      targetMs: null,
      predictionFor: null,

      showCountdown: false,
      countdownType: null,
    };
  }

  return {
    isMarketOpen: false,
    canVote: true,

    targetMs: nextOpenMs,

    predictionFor: new Date(nextOpenMs),

    showCountdown: shouldShowCountdown(nextOpenMs, nowMs),

    countdownType: "VOTING_CLOSES",
  };
}
