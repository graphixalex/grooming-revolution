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
  versionedRules?: Array<{
    effectiveFrom: string;
    weekly?: Partial<Record<DayKey, WorkingHoursRow>>;
    exceptions?: Record<string, WorkingHoursRow>;
  }>;
};

type WorkingHoursVersion = {
  effectiveFrom: string;
  weekly: Partial<Record<DayKey, WorkingHoursRow>>;
  exceptions: Record<string, WorkingHoursRow>;
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
  const resolved = resolveWorkingHoursConfigForDate(workingHoursJson, date, timeZone);
  if (!resolved) return undefined;
  const dateKey = getDateKeyInTimeZone(date, timeZone);
  const exceptionRow = resolved.exceptions?.[dateKey];
  if (exceptionRow) {
    return exceptionRow.enabled ? exceptionRow : undefined;
  }
  const dayKey = getDayKeyInTimeZone(date, timeZone);
  const baseRow = resolved.weekly?.[dayKey];
  return baseRow?.enabled ? baseRow : undefined;
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeLegacyWorkingHours(
  input: WorkingHoursJsonWithExceptions | null | undefined,
): { weekly: Partial<Record<DayKey, WorkingHoursRow>>; exceptions: Record<string, WorkingHoursRow> } {
  if (!input || typeof input !== "object") return { weekly: {}, exceptions: {} };
  const weekly: Partial<Record<DayKey, WorkingHoursRow>> = {};
  for (const key of dayKeys) {
    if (input[key]) weekly[key] = input[key];
  }
  const exceptions = input.exceptions && typeof input.exceptions === "object" ? input.exceptions : {};
  return { weekly, exceptions };
}

function normalizeVersions(input: WorkingHoursJsonWithExceptions | null | undefined): WorkingHoursVersion[] {
  const rawVersions = Array.isArray(input?.versionedRules) ? input.versionedRules : [];
  const normalized = rawVersions
    .map((row) => {
      const effectiveFrom = typeof row?.effectiveFrom === "string" ? row.effectiveFrom : "";
      if (!isIsoDate(effectiveFrom)) return null;
      const weekly = row?.weekly && typeof row.weekly === "object" ? row.weekly : {};
      const exceptions = row?.exceptions && typeof row.exceptions === "object" ? row.exceptions : {};
      return { effectiveFrom, weekly, exceptions };
    })
    .filter((row): row is WorkingHoursVersion => Boolean(row))
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));

  if (normalized.length) return normalized;

  const legacy = normalizeLegacyWorkingHours(input);
  if (Object.keys(legacy.weekly).length || Object.keys(legacy.exceptions).length) {
    return [{ effectiveFrom: "1970-01-01", weekly: legacy.weekly, exceptions: legacy.exceptions }];
  }
  return [];
}

export function resolveWorkingHoursConfigForDate(
  input: WorkingHoursJsonWithExceptions | null | undefined,
  date: Date,
  timeZone: string,
) {
  const versions = normalizeVersions(input);
  if (!versions.length) {
    return normalizeLegacyWorkingHours(input);
  }
  const dateKey = getDateKeyInTimeZone(date, timeZone);
  let selected = versions[0];
  for (const row of versions) {
    if (row.effectiveFrom <= dateKey) selected = row;
  }
  return selected;
}

export function upsertWorkingHoursVersion(
  current: WorkingHoursJsonWithExceptions | null | undefined,
  next: WorkingHoursJsonWithExceptions | null | undefined,
  effectiveFrom: string,
) {
  const safeDate = isIsoDate(effectiveFrom) ? effectiveFrom : "1970-01-01";
  const versions = normalizeVersions(current);
  const normalizedNext = normalizeLegacyWorkingHours(next);
  const withoutSameDate = versions.filter((row) => row.effectiveFrom !== safeDate);
  withoutSameDate.push({
    effectiveFrom: safeDate,
    weekly: normalizedNext.weekly,
    exceptions: normalizedNext.exceptions,
  });
  withoutSameDate.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  return { versionedRules: withoutSameDate };
}
