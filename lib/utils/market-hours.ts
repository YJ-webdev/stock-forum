// src/lib/utils/market-hours.ts

interface MarketHours {
  timezone: string;
  openTime: string;
  closeTime: string;
  holidays?: string[];
}

export const MARKET_CONFIGS: Record<string, MarketHours> = {
  US: {
    timezone: "America/New_York",
    openTime: "09:30",
    closeTime: "16:00",
  },
  Asia: {
    timezone: "Asia/Tokyo",
    openTime: "09:00",
    closeTime: "15:30",
  },
  Europe: {
    timezone: "Europe/London",
    openTime: "08:00",
    closeTime: "16:30",
  },
};

export function isMarketOpen(config: MarketHours): boolean {
  if (!config) return false;

  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: config.timezone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(now).map((p) => [p.type, p.value]),
  );

  const dayOfWeek = parts.weekday;
  if (dayOfWeek === "Sat" || dayOfWeek === "Sun") return false;

  const dateStr = `${parts.year}-${parts.month}-${parts.day}`;
  if (config.holidays?.includes(dateStr)) return false;

  const currentMinutes =
    parseInt(parts.hour, 10) * 60 + parseInt(parts.minute, 10);
  const [openH, openM] = config.openTime.split(":").map(Number);
  const [closeH, closeM] = config.closeTime.split(":").map(Number);

  return (
    currentMinutes >= openH * 60 + openM &&
    currentMinutes < closeH * 60 + closeM
  );
}
