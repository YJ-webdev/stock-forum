import { TZDate } from "@date-fns/tz";
import { ALL_MARKET_SYMBOLS, TRADING_HOURS } from "@/lib/data/market-symbols";

/** Latest scheduled regular-session close, in milliseconds. Excludes weekends. */
export function getLatestMarketCloseMs(
  symbol: string,
  nowMs = Date.now(),
): number | null {
  if (!Number.isFinite(nowMs)) return null;

  const market = ALL_MARKET_SYMBOLS.find((item) => item.symbol === symbol);
  if (!market?.marketSchedule) return null;

  const schedule = TRADING_HOURS[market.marketSchedule];
  if (!schedule) return null;

  const [openHour, openMinute] = schedule.open.split(":").map(Number);
  const [closeHour, closeMinute] = schedule.close.split(":").map(Number);
  if (![openHour, openMinute, closeHour, closeMinute].every(Number.isFinite)) {
    return null;
  }

  const now = new TZDate(nowMs, schedule.timezone);
  const overnight = closeHour * 60 + closeMinute <= openHour * 60 + openMinute;

  for (let daysBack = 0; daysBack < 10; daysBack++) {
    const sessionDay = new TZDate(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - daysBack,
      12,
      0,
      0,
      0,
      schedule.timezone,
    );
    if (sessionDay.getDay() === 0 || sessionDay.getDay() === 6) continue;

    const closeMs = new TZDate(
      sessionDay.getFullYear(),
      sessionDay.getMonth(),
      sessionDay.getDate() + (overnight ? 1 : 0),
      closeHour,
      closeMinute,
      0,
      0,
      schedule.timezone,
    ).getTime();

    if (closeMs <= nowMs) return closeMs;
  }

  return null;
}
