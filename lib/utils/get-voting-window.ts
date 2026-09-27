import { TZDate } from "@date-fns/tz";
import { ALL_MARKET_SYMBOLS, TRADING_HOURS } from "../data/market-symbols";

const COUNTDOWN_THRESHOLD_MS = 6 * 60 * 60 * 1000;

export type VotingCountdownType = "VOTING_OPENS" | "VOTING_CLOSES";

export interface VotingWindow {
  isMarketOpen: boolean;
  canVote: boolean;
  targetMs: number | null;
  predictionFor: Date | null;
  showCountdown: boolean;
  countdownType: VotingCountdownType | null;
  currentSessionStartMs: number | null;
}

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

function getPreviousWeekdayClose(
  nowMs: number,
  closeTime: string,
  timezone: string,
): number | null {
  const date = new TZDate(nowMs, timezone);

  for (let i = 0; i < 7; i++) {
    date.setDate(date.getDate() - 1);

    const day = date.getDay();

    if (day === 0 || day === 6) {
      continue;
    }

    return getTimestampForMarketTime(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      closeTime,
      timezone,
    );
  }

  return null;
}

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

function shouldShowCountdown(targetMs: number, nowMs: number): boolean {
  const remaining = targetMs - nowMs;

  return remaining > 0 && remaining <= COUNTDOWN_THRESHOLD_MS;
}

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
      currentSessionStartMs: null,
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

    const currentSessionStartMs = getPreviousWeekdayClose(
      nowMs,
      schedule.close,
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
        currentSessionStartMs,
      };
    }

    return {
      isMarketOpen: false,
      canVote: true,

      targetMs: nextOpenMs,

      predictionFor: new Date(nextOpenMs),

      showCountdown: shouldShowCountdown(nextOpenMs, nowMs),

      countdownType: "VOTING_CLOSES",

      currentSessionStartMs,
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
    const currentSessionStartMs = getPreviousWeekdayClose(
      nowMs,
      schedule.close,
      schedule.timezone,
    );

    return {
      isMarketOpen: false,
      canVote: true,

      targetMs: openMs,

      predictionFor: new Date(openMs),

      showCountdown: shouldShowCountdown(openMs, nowMs),

      countdownType: "VOTING_CLOSES",

      currentSessionStartMs,
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

      currentSessionStartMs: openMs,
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

      currentSessionStartMs: closeMs,
    };
  }
  return {
    isMarketOpen: false,
    canVote: true,

    targetMs: nextOpenMs,

    predictionFor: new Date(nextOpenMs),

    showCountdown: shouldShowCountdown(nextOpenMs, nowMs),

    countdownType: "VOTING_CLOSES",

    currentSessionStartMs: closeMs,
  };
}
