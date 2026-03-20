import { addMinutes, endOfDay, startOfDay } from "date-fns";
import { DogSize } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isInsideWorkingHours } from "@/lib/business-rules";

type SlotOption = {
  startAt: Date;
  endAt: Date;
  operatorId: string | null;
  operatorName: string | null;
};

type WorkingHoursRow = {
  enabled?: boolean;
  start?: string;
  end?: string;
  breaks?: Array<{ start?: string; end?: string }>;
};

const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

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

function isInsideOperatorRow(row: WorkingHoursRow | undefined, startAt: Date, endAt: Date) {
  if (!row?.enabled || !row.start || !row.end) return false;
  const start = startAt.getHours() * 60 + startAt.getMinutes();
  const end = endAt.getHours() * 60 + endAt.getMinutes();
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
  return Math.max(15, Math.ceil(raw / 15) * 15);
}

export async function getBookingSlotOptions(params: {
  salonId: string;
  treatmentId: string;
  dogSize: DogSize;
  dogRazza?: string | null;
  dogTipoPelo?: string | null;
  maxOptions?: number;
  startAt?: Date;
}) {
  const maxOptions = params.maxOptions ?? 6;
  const startFrom = params.startAt ?? new Date();
  const rangeStart = startOfDay(startFrom);
  const rangeEnd = endOfDay(addMinutes(rangeStart, 60 * 24 * 20));
  const durationMin = await estimateBookingDuration(params);

  const [salon, operators, appointments] = await Promise.all([
    prisma.salon.findUnique({
      where: { id: params.salonId },
      select: { workingHoursJson: true, overlapAllowed: true },
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
        startAt: { lt: rangeEnd },
        endAt: { gt: rangeStart },
      },
      select: { operatorId: true, startAt: true, endAt: true },
      orderBy: { startAt: "asc" },
    }),
  ]);

  if (!salon) return { durationMin, slots: [] as SlotOption[] };

  const results: SlotOption[] = [];
  const operatorsEnabled = operators.length > 0;
  const now = new Date();

  for (let dayOffset = 0; dayOffset <= 20 && results.length < maxOptions; dayOffset += 1) {
    const day = new Date(rangeStart);
    day.setDate(day.getDate() + dayOffset);
    const dayKey = dayKeys[day.getDay()];

    if (operatorsEnabled) {
      for (const op of operators) {
        const row = (op.workingHoursJson as Record<string, WorkingHoursRow> | null | undefined)?.[dayKey];
        if (!row?.enabled || !row.start || !row.end) continue;
        const startMin = toMinutes(row.start);
        const endMin = toMinutes(row.end);

        for (let m = startMin; m + durationMin <= endMin && results.length < maxOptions; m += 30) {
          const slotStart = new Date(day);
          slotStart.setHours(Math.floor(m / 60), m % 60, 0, 0);
          if (slotStart <= now) continue;
          const slotEnd = addMinutes(slotStart, durationMin);
          if (!isInsideWorkingHours(salon.workingHoursJson, slotStart, slotEnd)) continue;
          if (!isInsideOperatorRow(row, slotStart, slotEnd)) continue;

          const overlapOperator = appointments.some((a) => a.operatorId === op.id && overlaps(slotStart, slotEnd, a.startAt, a.endAt));
          if (overlapOperator) continue;
          if (!salon.overlapAllowed) {
            const overlapSalon = appointments.some((a) => overlaps(slotStart, slotEnd, a.startAt, a.endAt));
            if (overlapSalon) continue;
          }

          results.push({
            startAt: slotStart,
            endAt: slotEnd,
            operatorId: op.id,
            operatorName: op.nome,
          });
        }
      }
    } else {
      const row = (salon.workingHoursJson as Record<string, WorkingHoursRow> | null | undefined)?.[dayKey];
      if (!row?.enabled || !row.start || !row.end) continue;
      const startMin = toMinutes(row.start);
      const endMin = toMinutes(row.end);
      for (let m = startMin; m + durationMin <= endMin && results.length < maxOptions; m += 30) {
        const slotStart = new Date(day);
        slotStart.setHours(Math.floor(m / 60), m % 60, 0, 0);
        if (slotStart <= now) continue;
        const slotEnd = addMinutes(slotStart, durationMin);
        if (!isInsideWorkingHours(salon.workingHoursJson, slotStart, slotEnd)) continue;
        if (!isInsideOperatorRow(row, slotStart, slotEnd)) continue;
        const overlapSalon = appointments.some((a) => overlaps(slotStart, slotEnd, a.startAt, a.endAt));
        if (overlapSalon) continue;
        results.push({
          startAt: slotStart,
          endAt: slotEnd,
          operatorId: null,
          operatorName: null,
        });
      }
    }
  }

  return { durationMin, slots: results.slice(0, maxOptions) };
}
