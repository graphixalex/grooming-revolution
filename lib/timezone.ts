type DateParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function getDatePartsInTimeZone(date: Date, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const p = getDatePartsInTimeZone(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - date.getTime();
}

function zonedDateTimeToUtc(dateParts: DateParts, timeZone: string) {
  const utcGuess = Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day, dateParts.hour, dateParts.minute, dateParts.second);
  const offset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  return new Date(utcGuess - offset);
}

export function getTomorrowUtcRangeForTimeZone(timeZone: string) {
  const now = new Date();
  const nowParts = getDatePartsInTimeZone(now, timeZone);
  const baseUtc = Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day);
  const tomorrow = new Date(baseUtc + 24 * 60 * 60 * 1000);
  const y = tomorrow.getUTCFullYear();
  const m = tomorrow.getUTCMonth() + 1;
  const d = tomorrow.getUTCDate();

  const startUtc = zonedDateTimeToUtc({ year: y, month: m, day: d, hour: 0, minute: 0, second: 0 }, timeZone);
  const endUtc = zonedDateTimeToUtc({ year: y, month: m, day: d, hour: 23, minute: 59, second: 59 }, timeZone);
  return { startUtc, endUtc };
}
