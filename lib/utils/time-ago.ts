// lib/utils/time-ago.ts

export function getTimeAgo(dateInput?: string | Date | number | null): string {
  if (!dateInput) return "";

  const now = new Date();
  let postDate: Date;

  // 1. Handle time-only strings ("오후 10:45", "오전 04:44", "10:45 PM")
  if (
    typeof dateInput === "string" &&
    (dateInput.includes("오전") ||
      dateInput.includes("오후") ||
      dateInput.includes("AM") ||
      dateInput.includes("PM"))
  ) {
    const isPM = dateInput.includes("오후") || dateInput.includes("PM");
    const cleanTime = dateInput.replace(/(오전|오후|AM|PM)/gi, "").trim();
    const [hoursStr, minutesStr] = cleanTime.split(":");

    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (isNaN(hours) || isNaN(minutes)) return String(dateInput);

    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;

    postDate = new Date();
    postDate.setHours(hours, minutes, 0, 0);

    // If the time is later than current time, it occurred before midnight (Yesterday)
    if (postDate.getTime() > now.getTime()) {
      return "Yesterday";
    }

    return "Today";
  }

  // 2. Handle standard dates / ISO strings
  postDate = new Date(dateInput);
  if (isNaN(postDate.getTime())) return String(dateInput);

  // Normalize dates to midnight to compare calendar days accurately
  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const postMidnight = new Date(
    postDate.getFullYear(),
    postDate.getMonth(),
    postDate.getDate(),
  );

  const diffTime = todayMidnight.getTime() - postMidnight.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}
