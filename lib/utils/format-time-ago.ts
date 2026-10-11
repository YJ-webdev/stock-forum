export function formatTimeAgo(
  date: Date | string,
  language = "en",
  justNow = "Just now",
) {
  const value = new Date(date);
  const time = value.getTime();

  if (!Number.isFinite(time)) {
    return "";
  }

  const diff = Math.max(0, Date.now() - time);

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return justNow;
  }

  const formatter = new Intl.RelativeTimeFormat(language, {
    numeric: "always",
    style: "short",
  });

  if (diff < hour) {
    return formatter.format(-Math.floor(diff / minute), "minute");
  }

  if (diff < day) {
    return formatter.format(-Math.floor(diff / hour), "hour");
  }

  if (diff < 7 * day) {
    return formatter.format(-Math.floor(diff / day), "day");
  }

  return new Intl.DateTimeFormat(language, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(value);
}
