import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTomorrowUtcRangeForTimeZone } from "@/lib/timezone";
import { renderTemplate, reminderVariables } from "@/lib/reminders";
import { sendWhatsAppTextViaApi } from "@/lib/whatsapp";
import { assertCriticalEnv } from "@/lib/env-security";
import {
  DEFAULT_WHATSAPP_BIRTHDAY_TEMPLATE,
  DEFAULT_WHATSAPP_REMINDER_TEMPLATE,
} from "@/lib/default-templates";

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
        where: { whatsappApiEnabled: true },
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
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let warnings: string[] = [];

  for (const salon of salons) {
    const tz = salon.timezone || "Europe/Rome";

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

        const template =
          typeof salon.whatsappTemplate === "string" && salon.whatsappTemplate.trim().length > 0
            ? salon.whatsappTemplate
            : DEFAULT_WHATSAPP_REMINDER_TEMPLATE;
        const text = renderTemplate(
          template,
          reminderVariables({
            nomeCliente: `${appointment.cliente.nome} ${appointment.cliente.cognome}`.trim(),
            nomePet: appointment.cane.nome,
            startAt: appointment.startAt,
            nomeAttivita: salon.nomeAttivita || "",
            indirizzoAttivita: salon.indirizzo || "",
          }),
        );

        const result = await sendWhatsAppTextViaApi({
          salonId: salon.id,
          phone: appointment.cliente.telefono,
          text,
        });
        const nextAttempt = (existing?.attemptCount ?? 0) + 1;
        const now = new Date();
        if (result.ok) {
          sent += 1;
          await prisma.appointmentReminder.upsert({
            where: { appointmentId_kind: { appointmentId: appointment.id, kind: "DAY_BEFORE_WHATSAPP" } },
            update: {
              status: "SENT",
              attemptCount: nextAttempt,
              messageId: result.messageId || null,
              errorMessage: null,
              sentAt: now,
              lastAttemptAt: now,
            },
            create: {
              appointmentId: appointment.id,
              kind: "DAY_BEFORE_WHATSAPP",
              status: "SENT",
              attemptCount: nextAttempt,
              messageId: result.messageId || null,
              sentAt: now,
              lastAttemptAt: now,
            },
          });
        } else {
          failed += 1;
          await prisma.appointmentReminder.upsert({
            where: { appointmentId_kind: { appointmentId: appointment.id, kind: "DAY_BEFORE_WHATSAPP" } },
            update: {
              status: nextAttempt >= 3 ? "SKIPPED" : "FAILED",
              attemptCount: nextAttempt,
              errorMessage: result.error,
              lastAttemptAt: now,
            },
            create: {
              appointmentId: appointment.id,
              kind: "DAY_BEFORE_WHATSAPP",
              status: nextAttempt >= 3 ? "SKIPPED" : "FAILED",
              attemptCount: nextAttempt,
              errorMessage: result.error,
              lastAttemptAt: now,
            },
          });
        }
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

        const template =
          typeof salon.whatsappBirthdayTemplate === "string" && salon.whatsappBirthdayTemplate.trim().length > 0
            ? salon.whatsappBirthdayTemplate
            : DEFAULT_WHATSAPP_BIRTHDAY_TEMPLATE;
        const text = renderTemplate(template, {
          nome_cliente: `${dog.cliente.nome} ${dog.cliente.cognome}`.trim(),
          nome_pet: dog.nome,
          data_appuntamento: "",
          orario_appuntamento: "",
          nome_attivita: salon.nomeAttivita || "",
          indirizzo_attivita: salon.indirizzo || "",
        });

        const result = await sendWhatsAppTextViaApi({
          salonId: salon.id,
          phone: dog.cliente.telefono,
          text,
        });
        const now = new Date();
        const nextAttempt = (existing?.attemptCount ?? 0) + 1;
        if (result.ok) {
          sent += 1;
          await prisma.dogBirthdayGreetingLog.upsert({
            where: { dogId_year: { dogId: dog.id, year } },
            update: {
              status: "SENT",
              attemptCount: nextAttempt,
              messageId: result.messageId || null,
              errorMessage: null,
              sentAt: now,
              lastAttemptAt: now,
            },
            create: {
              salonId: salon.id,
              dogId: dog.id,
              year,
              status: "SENT",
              attemptCount: nextAttempt,
              messageId: result.messageId || null,
              sentAt: now,
              lastAttemptAt: now,
            },
          });
        } else {
          failed += 1;
          await prisma.dogBirthdayGreetingLog.upsert({
            where: { dogId_year: { dogId: dog.id, year } },
            update: {
              status: nextAttempt >= 3 ? "SKIPPED" : "FAILED",
              attemptCount: nextAttempt,
              errorMessage: result.error,
              lastAttemptAt: now,
            },
            create: {
              salonId: salon.id,
              dogId: dog.id,
              year,
              status: nextAttempt >= 3 ? "SKIPPED" : "FAILED",
              attemptCount: nextAttempt,
              errorMessage: result.error,
              lastAttemptAt: now,
            },
          });
        }
      }
      } catch {
        warnings = [...warnings, "Migration compleanni cane non applicata"];
      }
    }
  }

  return NextResponse.json({
    ok: true,
    salons: salons.length,
    processed,
    sent,
    failed,
    skipped,
    warnings,
  });
}
