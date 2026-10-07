// lib/utils/time-ago.ts

export function getTimeAgo(dateInput?: string | Date | number | null): string {
  if (dateInput == null || dateInput === "") return "";

  const timestamp =
    dateInput instanceof Date
      ? dateInput.getTime()
      : new Date(dateInput).getTime();

  if (!Number.isFinite(timestamp)) return "";

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
