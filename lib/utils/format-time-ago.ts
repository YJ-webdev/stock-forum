const MAX_CACHED_LOCALES = 32;

const relativeTimeFormatters = new Map<string, Intl.RelativeTimeFormat>();
const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();

function getRelativeTimeFormatter(language: string) {
  const cached = relativeTimeFormatters.get(language);

  if (cached) return cached;

  const formatter = new Intl.RelativeTimeFormat(language, {
    numeric: "always",
    style: "short",
  });

  if (relativeTimeFormatters.size >= MAX_CACHED_LOCALES) {
    relativeTimeFormatters.clear();
  }

  relativeTimeFormatters.set(language, formatter);

  return formatter;
}

function getDateTimeFormatter(language: string) {
  const cached = dateTimeFormatters.get(language);

  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat(language, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  if (dateTimeFormatters.size >= MAX_CACHED_LOCALES) {
    dateTimeFormatters.clear();
  }

  dateTimeFormatters.set(language, formatter);

  return formatter;
}

export function formatTimeAgo(
  value: Date | string | number,
  language = "en",
  justNowLabel = "Just now",
  nowMs = Date.now(),
): string {
  const date = new Date(value);
  const timestamp = date.getTime();

  if (!Number.isFinite(timestamp) || !Number.isFinite(nowMs)) {
    return "";
  }

  const elapsed = Math.max(0, nowMs - timestamp);

  if (elapsed < 60_000) {
    return justNowLabel;
  }

  if (elapsed >= 604_800_000) {
    return getDateTimeFormatter(language).format(date);
  }

  const formatter = getRelativeTimeFormatter(language);

  if (elapsed < 3_600_000) {
    return formatter.format(-Math.floor(elapsed / 60_000), "minute");
  }

  if (elapsed < 86_400_000) {
    return formatter.format(-Math.floor(elapsed / 3_600_000), "hour");
  }

  return formatter.format(-Math.floor(elapsed / 86_400_000), "day");
}
