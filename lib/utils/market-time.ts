import { TZDate } from "@date-fns/tz";

export function getTimestampForMarketTime(
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
