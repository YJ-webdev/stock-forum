import { TZDate } from "@date-fns/tz";

import { ALL_MARKET_SYMBOLS, TRADING_HOURS } from "../data/market-symbols";

const COUNTDOWN_THRESHOLD_MS = 6 * 60 * 60 * 1000;

export type VotingCountdownType = "VOTING_CLOSES";

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

  for (let offset = 1; offset <= 7; offset++) {
    date.setDate(date.getDate() - 1);

    const dayOfWeek = date.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
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
  openTime: string,
  timezone: string,
): number | null {
  const now = new TZDate(nowMs, timezone);

  for (let offset = 1; offset <= 7; offset++) {
    const date = new TZDate(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + offset,
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
      openTime,
      timezone,
    );
  }

  return null;
}

function createVotingWindow(
  targetMs: number | null,
  currentSessionStartMs: number | null,
  nowMs: number,
): VotingWindow {
  const remaining = targetMs === null ? null : targetMs - nowMs;

  return {
    isMarketOpen: false,
    canVote: targetMs !== null,

    targetMs,
    predictionFor: targetMs === null ? null : new Date(targetMs),

    showCountdown:
      remaining !== null &&
      remaining > 0 &&
      remaining <= COUNTDOWN_THRESHOLD_MS,

    countdownType: targetMs === null ? null : "VOTING_CLOSES",

    currentSessionStartMs,
  };
}

export function getVotingWindow(
  symbol: string,
  nowMs = Date.now(),
): VotingWindow {
  const item = ALL_MARKET_SYMBOLS.find((market) => market.symbol === symbol);

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

  // Weekends: voting closes at the next weekday's open.
  if (isWeekend) {
    const nextOpenMs = getNextWeekdayOpen(
      nowMs,
      schedule.open,
      schedule.timezone,
    );

    const previousCloseMs = getPreviousWeekdayClose(
      nowMs,
      schedule.close,
      schedule.timezone,
    );

    return createVotingWindow(nextOpenMs, previousCloseMs, nowMs);
  }

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

  // Before open: voting closes at today's open.
  if (nowMs < openMs) {
    const previousCloseMs = getPreviousWeekdayClose(
      nowMs,
      schedule.close,
      schedule.timezone,
    );

    return createVotingWindow(openMs, previousCloseMs, nowMs);
  }

  // During the session: voting is closed; no countdown.
  if (nowMs < closeMs) {
    return {
      isMarketOpen: true,
      canVote: false,
      targetMs: null,
      predictionFor: new Date(openMs),
      showCountdown: false,
      countdownType: null,
      currentSessionStartMs: openMs,
    };
  }

  // After close: voting closes at the next weekday's open.
  const nextOpenMs = getNextWeekdayOpen(
    nowMs,
    schedule.open,
    schedule.timezone,
  );

  return createVotingWindow(nextOpenMs, closeMs, nowMs);
}
