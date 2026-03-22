import { addMinutes } from "date-fns";
import { prisma } from "@/lib/prisma";

function parseTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  return { h, m };
}

function getPartsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const weekday = parts.find((p) => p.type === "weekday")?.value || "Mon";
  const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);

  const dayMap: Record<string, "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat"> = {
    Sun: "sun",
    Mon: "mon",
    Tue: "tue",
    Wed: "wed",
    Thu: "thu",
    Fri: "fri",
    Sat: "sat",
  };

  return {
    day: dayMap[weekday] ?? "mon",
    minutes: hour * 60 + minute,
  };
}

export async function canCreateClient(salonId: string) {
  const salon = await prisma.salon.findUnique({ where: { id: salonId }, select: { subscriptionPlan: true } });
  if (!salon || salon.subscriptionPlan !== "FREE") return true;

  const count = await prisma.client.count({ where: { salonId, deletedAt: null } });
  return count < 50;
}

export async function ensureDogLimit(salonId: string, clienteId: string) {
  const count = await prisma.dog.count({ where: { salonId, clienteId, deletedAt: null } });
  if (count >= 4) {
    throw new Error("Massimo 4 cani per cliente nel piano attuale");
  }
}

export function computeEndAt(startAt: Date, durataMinuti: number) {
  return addMinutes(startAt, durataMinuti);
}

export function isInsideWorkingHours(workingHoursJson: any, startAt: Date, endAt: Date, timeZone = "Europe/Zurich") {
  if (!workingHoursJson) return true;
  const startParts = getPartsInTimeZone(startAt, timeZone);
  const endParts = getPartsInTimeZone(endAt, timeZone);
  if (startParts.day !== endParts.day) return false;

  const config = workingHoursJson[startParts.day];
  if (!config?.enabled) return false;

  const { h: sh, m: sm } = parseTime(config.start);
  const { h: eh, m: em } = parseTime(config.end);

  const slotStart = startParts.minutes;
  const slotEnd = endParts.minutes;
  const workStart = sh * 60 + sm;
  const workEnd = eh * 60 + em;

  if (slotStart < workStart || slotEnd > workEnd) return false;

  for (const b of config.breaks ?? []) {
    const { h: bh1, m: bm1 } = parseTime(b.start);
    const { h: bh2, m: bm2 } = parseTime(b.end);
    const breakStart = bh1 * 60 + bm1;
    const breakEnd = bh2 * 60 + bm2;
    if (slotStart < breakEnd && slotEnd > breakStart) return false;
  }

  return true;
}

export async function hasOverlap(
  salonId: string,
  startAt: Date,
  endAt: Date,
  appointmentId?: string,
  operatorId?: string | null,
) {
  const overlap = await prisma.appointment.findFirst({
    where: {
      salonId,
      operatorId: operatorId || undefined,
      deletedAt: null,
      id: appointmentId ? { not: appointmentId } : undefined,
      stato: { notIn: ["CANCELLATO"] },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true },
  });
  return Boolean(overlap);
}

