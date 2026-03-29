import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTomorrowUtcRangeForTimeZone } from "@/lib/timezone";
import { DEFAULT_SALON_TIMEZONE } from "@/lib/reminders";
import { assertCriticalEnv } from "@/lib/env-security";
import { DEFAULT_WHATSAPP_BIRTHDAY_TEMPLATE } from "@/lib/default-templates";
import { enqueueBirthdayGreeting, enqueueReminderDayBefore } from "@/lib/whatsapp-automation";
import { processWhatsAppQueueBatch } from "@/lib/whatsapp-queue";

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;
  const alt = req.headers.get("x-cron-secret");
  return token === secret || alt === secret;
}

function getMonthDayInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const month = parts.find((p) => p.type === "month")?.value || "00";
  const day = parts.find((p) => p.type === "day")?.value || "00";
  return `${month}-${day}`;
}

export async function GET(req: NextRequest) {
  assertCriticalEnv("cron");

  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const salons = await (async () => {
    try {
      return await prisma.salon.findMany({
        where: {
          OR: [{ whatsappDayBeforeEnabled: true }, { whatsappBirthdayEnabled: true }],
        },
        select: {
          id: true,
          timezone: true,
          nomeAttivita: true,
          indirizzo: true,
          whatsappTemplate: true,
          whatsappBirthdayTemplate: true,
          whatsappDayBeforeEnabled: true,
          whatsappBirthdayEnabled: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2021" || error.code === "P2022")
      ) {
        const legacy = await prisma.salon.findMany({
          where: { whatsappApiEnabled: true },
          select: {
            id: true,
            timezone: true,
            nomeAttivita: true,
            indirizzo: true,
            whatsappTemplate: true,
          },
        });
        return legacy.map((s) => ({
          ...s,
          whatsappBirthdayTemplate: DEFAULT_WHATSAPP_BIRTHDAY_TEMPLATE,
          whatsappDayBeforeEnabled: true,
          whatsappBirthdayEnabled: true,
        }));
      }
      throw error;
    }
  })();

  let processed = 0;
  let enqueued = 0;
  let deduped = 0;
  let failed = 0;
  let skipped = 0;
  let warnings: string[] = [];

  for (const salon of salons) {
    const tz = salon.timezone || DEFAULT_SALON_TIMEZONE;

    if (salon.whatsappDayBeforeEnabled !== false) {
      const { startUtc, endUtc } = getTomorrowUtcRangeForTimeZone(tz);
      const appointments = await prisma.appointment.findMany({
        where: {
          salonId: salon.id,
          deletedAt: null,
          stato: "PRENOTATO",
          startAt: { gte: startUtc, lte: endUtc },
          cliente: { telefono: { not: "__NOTE__" } },
        },
        select: {
          id: true,
          startAt: true,
          cliente: { select: { nome: true, cognome: true, telefono: true } },
          cane: { select: { nome: true } },
        },
      });

      for (const appointment of appointments) {
        processed += 1;
        const existing = await prisma.appointmentReminder.findUnique({
          where: {
            appointmentId_kind: {
              appointmentId: appointment.id,
              kind: "DAY_BEFORE_WHATSAPP",
            },
          },
          select: { status: true, attemptCount: true },
        });
        if (existing?.status === "SENT" || (existing && existing.attemptCount >= 3)) {
          skipped += 1;
          continue;
        }

        const queueResult = await enqueueReminderDayBefore({
          id: appointment.id,
          salonId: salon.id,
          startAt: appointment.startAt,
          clientName: `${appointment.cliente.nome} ${appointment.cliente.cognome}`.trim(),
          dogName: appointment.cane.nome,
          phone: appointment.cliente.telefono,
        });
        if (!queueResult.enqueued) {
          failed += 1;
          continue;
        }
        await prisma.appointmentReminder.upsert({
          where: {
            appointmentId_kind: {
              appointmentId: appointment.id,
              kind: "DAY_BEFORE_WHATSAPP",
            },
          },
          update: {
            status: "PENDING",
            errorMessage: null,
          },
          create: {
            appointmentId: appointment.id,
            kind: "DAY_BEFORE_WHATSAPP",
            status: "PENDING",
            attemptCount: 0,
          },
        });
        if (queueResult.dedup) deduped += 1;
        else enqueued += 1;
      }
    }

    if (salon.whatsappBirthdayEnabled !== false) {
      try {
      const todayMd = getMonthDayInTimeZone(new Date(), tz);
      const year = Number(
        new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric" })
          .formatToParts(new Date())
          .find((p) => p.type === "year")?.value || new Date().getUTCFullYear(),
      );
      const dogs = await prisma.dog.findMany({
        where: {
          salonId: salon.id,
          deletedAt: null,
          birthDate: { not: null },
          cliente: { deletedAt: null, telefono: { not: "__NOTE__" } },
        },
        select: {
          id: true,
          nome: true,
          birthDate: true,
          cliente: { select: { nome: true, cognome: true, telefono: true } },
        },
      });

      for (const dog of dogs) {
        if (!dog.birthDate) continue;
        const dogMd = getMonthDayInTimeZone(dog.birthDate, tz);
        if (dogMd !== todayMd) continue;
        processed += 1;

        const existing = await prisma.dogBirthdayGreetingLog.findUnique({
          where: { dogId_year: { dogId: dog.id, year } },
          select: { status: true, attemptCount: true },
        });
        if (existing?.status === "SENT" || (existing && existing.attemptCount >= 3)) {
          skipped += 1;
          continue;
        }

        const result = await enqueueBirthdayGreeting({
          salonId: salon.id,
          dogId: dog.id,
          year,
          phone: dog.cliente.telefono,
          clientName: `${dog.cliente.nome} ${dog.cliente.cognome}`.trim(),
          dogName: dog.nome,
        });
        if (!result.enqueued) {
          failed += 1;
          continue;
        }
        await prisma.dogBirthdayGreetingLog.upsert({
          where: { dogId_year: { dogId: dog.id, year } },
          update: {
            status: "PENDING",
            errorMessage: null,
          },
          create: {
            salonId: salon.id,
            dogId: dog.id,
            year,
            status: "PENDING",
            attemptCount: 0,
          },
        });
        if (result.dedup) deduped += 1;
        else enqueued += 1;
      }
      } catch {
        warnings = [...warnings, "Migration compleanni cane non applicata"];
      }
    }
  }
  const worker = await processWhatsAppQueueBatch({ batchSize: 120, workerId: "cron-day-before" });

  return NextResponse.json({
    ok: true,
    salons: salons.length,
    processed,
    enqueued,
    deduped,
    failed,
    skipped,
    warnings,
    worker,
  });
}
