export const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type DayKey = (typeof dayKeys)[number];

export type WorkingHoursRow = {
  enabled?: boolean;
  start?: string;
  end?: string;
  breaks?: Array<{ start?: string; end?: string }>;
};

export type WorkingHoursJsonWithExceptions = Partial<Record<DayKey, WorkingHoursRow>> & {
  exceptions?: Record<string, WorkingHoursRow>;
};

function getPartsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    weekday: parts.find((p) => p.type === "weekday")?.value || "Mon",
    year: Number(parts.find((p) => p.type === "year")?.value || 0),
    month: Number(parts.find((p) => p.type === "month")?.value || 0),
    day: Number(parts.find((p) => p.type === "day")?.value || 0),
  };
}

export function getDateKeyInTimeZone(date: Date, timeZone: string) {
  const p = getPartsInTimeZone(date, timeZone);
  return `${String(p.year).padStart(4, "0")}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function getDayKeyInTimeZone(date: Date, timeZone: string): DayKey {
  const weekday = getPartsInTimeZone(date, timeZone).weekday;
  const map: Record<string, DayKey> = {
    Sun: "sun",
    Mon: "mon",
    Tue: "tue",
    Wed: "wed",
    Thu: "thu",
    Fri: "fri",
    Sat: "sat",
  };
  return map[weekday] ?? "mon";
}

export function getWorkingHoursRowForDate(
  workingHoursJson: WorkingHoursJsonWithExceptions | null | undefined,
  date: Date,
  timeZone: string,
) {
  if (!workingHoursJson) return undefined;
  const dateKey = getDateKeyInTimeZone(date, timeZone);
  const exceptionRow = workingHoursJson.exceptions?.[dateKey];
  if (exceptionRow) {
    return exceptionRow.enabled ? exceptionRow : undefined;
  }
  const dayKey = getDayKeyInTimeZone(date, timeZone);
  const baseRow = workingHoursJson[dayKey];
  return baseRow?.enabled ? baseRow : undefined;
}
