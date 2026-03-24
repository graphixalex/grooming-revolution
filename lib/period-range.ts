import {
  endOfDay,
  endOfMonth,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";

export type PeriodPreset =
  | "all"
  | "last_30_days"
  | "this_month"
  | "last_3_months"
  | "last_6_months"
  | "last_12_months"
  | "this_year"
  | "custom";

export const PERIOD_PRESET_OPTIONS: Array<{ value: PeriodPreset; label: string }> = [
  { value: "all", label: "Tutta la vita" },
  { value: "last_30_days", label: "Ultimi 30 giorni" },
  { value: "this_month", label: "Mese corrente" },
  { value: "last_3_months", label: "Ultimi 3 mesi" },
  { value: "last_6_months", label: "Ultimi 6 mesi" },
  { value: "last_12_months", label: "Ultimi 12 mesi" },
  { value: "this_year", label: "Anno corrente" },
  { value: "custom", label: "Personalizzato" },
];

function parseDateInput(raw?: string) {
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function resolvePeriodRange(params: {
  presetRaw?: string;
  fromRaw?: string;
  toRaw?: string;
  defaultPreset: PeriodPreset;
}) {
  const allowed = new Set(PERIOD_PRESET_OPTIONS.map((option) => option.value));
  const preset = (allowed.has(params.presetRaw as PeriodPreset) ? params.presetRaw : params.defaultPreset) as PeriodPreset;
  const now = new Date();

  let from: Date | undefined;
  let to: Date | undefined;

  if (preset === "all") {
    from = undefined;
    to = undefined;
  } else if (preset === "last_30_days") {
    from = startOfDay(subDays(now, 29));
    to = endOfDay(now);
  } else if (preset === "this_month") {
    from = startOfMonth(now);
    to = endOfMonth(now);
  } else if (preset === "last_3_months") {
    from = startOfMonth(subMonths(now, 2));
    to = endOfMonth(now);
  } else if (preset === "last_6_months") {
    from = startOfMonth(subMonths(now, 5));
    to = endOfMonth(now);
  } else if (preset === "last_12_months") {
    from = startOfMonth(subMonths(now, 11));
    to = endOfMonth(now);
  } else if (preset === "this_year") {
    from = startOfYear(now);
    to = endOfYear(now);
  } else if (preset === "custom") {
    const parsedFrom = parseDateInput(params.fromRaw);
    const parsedTo = parseDateInput(params.toRaw);
    if (parsedFrom) from = startOfDay(parsedFrom);
    if (parsedTo) to = endOfDay(parsedTo);
    if (from && to && from > to) {
      const swapFrom = from;
      from = startOfDay(to);
      to = endOfDay(swapFrom);
    }
  }

  const fromInput = from ? from.toISOString().slice(0, 10) : "";
  const toInput = to ? to.toISOString().slice(0, 10) : "";
  const label =
    from && to
      ? `${from.toLocaleDateString("it-IT")} - ${to.toLocaleDateString("it-IT")}`
      : from
        ? `da ${from.toLocaleDateString("it-IT")}`
        : to
          ? `fino a ${to.toLocaleDateString("it-IT")}`
          : "Tutta la vita";

  return {
    preset,
    from,
    to,
    fromInput,
    toInput,
    label,
  };
}

