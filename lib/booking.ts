import { addMinutes } from "date-fns";
import { DogSize } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getDayKeyInTimeZone, getWorkingHoursRowForDate, type WorkingHoursRow } from "@/lib/working-hours";

type SlotOption = {
  startAt: Date;
  endAt: Date;
  operatorId: string | null;
  operatorName: string | null;
};

type DateParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function includesPattern(valueA: string | null | undefined, valueB: string | null | undefined, pattern: string | null | undefined) {
  if (!pattern) return true;
  const p = pattern.toLowerCase().trim();
  if (!p) return true;
  const a = String(valueA || "").toLowerCase();
  const b = String(valueB || "").toLowerCase();
  return a.includes(p) || b.includes(p);
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && endA > startB;
}

function isInsideRowByMinutes(row: WorkingHoursRow | undefined, start: number, end: number) {
  if (!row?.enabled || !row.start || !row.end) return false;
  const rowStart = toMinutes(row.start);
  const rowEnd = toMinutes(row.end);
  if (start < rowStart || end > rowEnd) return false;
  for (const b of row.breaks ?? []) {
    if (!b.start || !b.end) continue;
    const bs = toMinutes(b.start);
    const be = toMinutes(b.end);
    if (start < be && end > bs) return false;
  }
  return true;
}

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

function addDaysToYmd(parts: Pick<DateParts, "year" | "month" | "day">, dayOffset: number) {
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + dayOffset));
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

function getDayKeyAndMinutesInTimeZone(date: Date, timeZone: string) {
  const parts = getDatePartsInTimeZone(date, timeZone);
  return {
    dayKey: getDayKeyInTimeZone(date, timeZone),
    minutes: parts.hour * 60 + parts.minute,
  };
}

function shuffleArray<T>(items: T[]) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function slugifyBooking(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export async function estimateBookingDuration(params: {
  salonId: string;
  treatmentId: string;
  dogSize: DogSize;
  dogRazza?: string | null;
  dogTipoPelo?: string | null;
  dogNodi?: "NESSUNO" | "MODERATI" | "MOLTI" | string | null;
  at?: Date;
}) {
  const at = params.at ?? new Date();
  const rules = await prisma.servicePriceRule.findMany({
    where: {
      salonId: params.salonId,
      treatmentId: params.treatmentId,
      attiva: true,
      validoDa: { lte: at },
      OR: [{ validoA: null }, { validoA: { gte: at } }],
    },
    select: {
      dogSize: true,
      razzaPattern: true,
      durataMinuti: true,
      validoDa: true,
    },
    orderBy: { validoDa: "desc" },
  });

  const best = rules
    .filter((r) => !r.dogSize || r.dogSize === params.dogSize)
    .filter((r) => includesPattern(params.dogRazza, params.dogTipoPelo, r.razzaPattern))
    .map((r) => ({
      duration: r.durataMinuti,
      score: (r.dogSize ? 10 : 0) + (r.razzaPattern ? 5 : 0),
      from: r.validoDa.getTime(),
    }))
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : b.from - a.from))[0];

  const raw = best?.duration ?? 60;
  const nodi = String(params.dogNodi || "NESSUNO").toUpperCase();
  const nodiExtra = nodi === "MODERATI" ? 30 : nodi === "MOLTI" ? 60 : 0;
  const finalDuration = raw + nodiExtra;
  return Math.max(15, Math.ceil(finalDuration / 15) * 15);
}

export async function getBookingSlotOptions(params: {
  salonId: string;
  treatmentId: string;
  dogSize: DogSize;
  dogRazza?: string | null;
  dogTipoPelo?: string | null;
  dogNodi?: "NESSUNO" | "MODERATI" | "MOLTI" | string | null;
  maxOptions?: number;
  startAt?: Date;
}) {
  const maxOptions = params.maxOptions ?? 6;
  const startFrom = params.startAt ?? new Date();
  const durationMin = await estimateBookingDuration(params);

  const [salon, operators, appointments] = await Promise.all([
    prisma.salon.findUnique({
      where: { id: params.salonId },
      select: { timezone: true },
    }),
    prisma.operator.findMany({
      where: { salonId: params.salonId, attivo: true },
      select: { id: true, nome: true, workingHoursJson: true },
      orderBy: { ordine: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        salonId: params.salonId,
        deletedAt: null,
        stato: { not: "CANCELLATO" },
        startAt: { lt: addMinutes(startFrom, 60 * 24 * 21) },
        endAt: { gt: addMinutes(startFrom, -60 * 24) },
      },
      select: { operatorId: true, startAt: true, endAt: true },
      orderBy: { startAt: "asc" },
    }),
  ]);

  if (!salon) return { durationMin, slots: [] as SlotOption[] };

  const candidateSlotsByDay = new Map<string, SlotOption[]>();
  const operatorsEnabled = operators.length > 0;
  const now = new Date();
  const timeZone = salon.timezone || "Europe/Zurich";
  const nowParts = getDatePartsInTimeZone(now, timeZone);
  const startParts = getDatePartsInTimeZone(startFrom, timeZone);
  const baseYmd = {
    year: startParts.year || nowParts.year,
    month: startParts.month || nowParts.month,
    day: startParts.day || nowParts.day,
  };

  // Cerca fino a 8 settimane per non rimanere bloccati se la prima settimana e piena.
  for (let dayOffset = 0; dayOffset <= 55; dayOffset += 1) {
    const ymd = addDaysToYmd(baseYmd, dayOffset);

    if (!operatorsEnabled) continue;
    for (const op of operators) {
      const dayDate = zonedDateTimeToUtc(
        {
          year: ymd.year,
          month: ymd.month,
          day: ymd.day,
          hour: 12,
          minute: 0,
          second: 0,
        },
        timeZone,
      );
      const row = getWorkingHoursRowForDate(op.workingHoursJson as any, dayDate, timeZone);
      if (!row?.enabled || !row.start || !row.end) continue;
      const startMin = toMinutes(row.start);
      const endMin = toMinutes(row.end);

      for (let m = startMin; m + durationMin <= endMin; m += 30) {
        const slotStart = zonedDateTimeToUtc(
          {
            year: ymd.year,
            month: ymd.month,
            day: ymd.day,
            hour: Math.floor(m / 60),
            minute: m % 60,
            second: 0,
          },
          timeZone,
        );
        if (slotStart <= now) continue;
        const slotEnd = addMinutes(slotStart, durationMin);
        if (!isInsideRowByMinutes(row, m, m + durationMin)) continue;
        const overlapOperator = appointments.some((a) => a.operatorId === op.id && overlaps(slotStart, slotEnd, a.startAt, a.endAt));
        if (overlapOperator) continue;
        const overlapSalon = appointments.some((a) => overlaps(slotStart, slotEnd, a.startAt, a.endAt));
        if (overlapSalon) continue;
        const slot: SlotOption = {
          startAt: slotStart,
          endAt: slotEnd,
          operatorId: op.id,
          operatorName: op.nome,
        };
        const dayKey = `${ymd.year}-${String(ymd.month).padStart(2, "0")}-${String(ymd.day).padStart(2, "0")}`;
        const dayList = candidateSlotsByDay.get(dayKey) ?? [];
        dayList.push(slot);
        candidateSlotsByDay.set(dayKey, dayList);
      }
    }
  }

  const dayKeys = [...candidateSlotsByDay.keys()].sort();
  const dayQueues = dayKeys.map((dayKey) => shuffleArray(candidateSlotsByDay.get(dayKey) ?? []));
  const selected: SlotOption[] = [];

  // Round-robin tra i giorni: distribuzione migliore delle opzioni nel calendario.
  while (selected.length < maxOptions) {
    let addedInCycle = 0;
    for (const queue of dayQueues) {
      if (!queue.length || selected.length >= maxOptions) continue;
      selected.push(queue.shift() as SlotOption);
      addedInCycle += 1;
    }
    if (addedInCycle === 0) break;
  }

  // Se mancano slot, completa con il resto in ordine casuale.
  if (selected.length < maxOptions) {
    const remaining = shuffleArray(dayQueues.flat());
    for (const slot of remaining) {
      if (selected.length >= maxOptions) break;
      selected.push(slot);
    }
  }

  selected.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  return { durationMin, slots: selected };
}

export async function isBookingSlotStillAvailable(params: {
  salonId: string;
  startAt: Date;
  endAt: Date;
  operatorId?: string | null;
  db?: any;
}) {
  const db = params.db ?? prisma;
  const salon = await db.salon.findUnique({
    where: { id: params.salonId },
    select: { timezone: true },
  });
  if (!salon) return false;

  const timeZone = salon.timezone || "Europe/Zurich";
  const startInfo = getDayKeyAndMinutesInTimeZone(params.startAt, timeZone);
  const endInfo = getDayKeyAndMinutesInTimeZone(params.endAt, timeZone);
  if (startInfo.dayKey !== endInfo.dayKey) return false;

  if (!params.operatorId) return false;
  const op = await db.operator.findFirst({
    where: { id: params.operatorId, salonId: params.salonId, attivo: true },
    select: { workingHoursJson: true },
  });
  if (!op) return false;
  const opRow = getWorkingHoursRowForDate(op.workingHoursJson as any, params.startAt, timeZone);
  if (!isInsideRowByMinutes(opRow, startInfo.minutes, endInfo.minutes)) return false;

  const overlapOperator = await db.appointment.findFirst({
    where: {
      salonId: params.salonId,
      operatorId: params.operatorId,
      deletedAt: null,
      stato: { not: "CANCELLATO" },
      startAt: { lt: params.endAt },
      endAt: { gt: params.startAt },
    },
    select: { id: true },
  });
  if (overlapOperator) return false;

  const overlapSalon = await db.appointment.findFirst({
    where: {
      salonId: params.salonId,
      deletedAt: null,
      stato: { not: "CANCELLATO" },
      startAt: { lt: params.endAt },
      endAt: { gt: params.startAt },
    },
    select: { id: true },
  });
  if (overlapSalon) return false;

  return true;
}
