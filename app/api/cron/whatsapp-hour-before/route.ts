import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertCriticalEnv } from "@/lib/env-security";
import { DEFAULT_WHATSAPP_ONE_HOUR_TEMPLATE } from "@/lib/default-templates";
import { enqueueReminderHourBefore } from "@/lib/whatsapp-automation";
import { processWhatsAppQueueBatch } from "@/lib/whatsapp-queue";

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;
  const alt = req.headers.get("x-cron-secret");
  return token === secret || alt === secret;
}

export async function GET(req: NextRequest) {
  assertCriticalEnv("cron");
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const from = new Date(now.getTime() + 50 * 60 * 1000);
  const to = new Date(now.getTime() + 70 * 60 * 1000);

  const salons = await (async () => {
    try {
      return await prisma.salon.findMany({
        where: { whatsappOneHourEnabled: true },
        select: {
          id: true,
          timezone: true,
          nomeAttivita: true,
          indirizzo: true,
          whatsappOneHourTemplate: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2021" || error.code === "P2022")
      ) {
        const legacy = await prisma.salon.findMany({
          where: { whatsappApiEnabled: true },
          select: { id: true, timezone: true, nomeAttivita: true, indirizzo: true },
        });
        return legacy.map((s) => ({ ...s, whatsappOneHourTemplate: DEFAULT_WHATSAPP_ONE_HOUR_TEMPLATE }));
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
    const appointments = await prisma.appointment.findMany({
      where: {
        salonId: salon.id,
        deletedAt: null,
        stato: "PRENOTATO",
        startAt: { gte: from, lte: to },
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
      let existing: { status: "PENDING" | "SENT" | "FAILED" | "SKIPPED"; attemptCount: number } | null = null;
      try {
        existing = await prisma.appointmentReminder.findUnique({
          where: {
            appointmentId_kind: {
              appointmentId: appointment.id,
              kind: "HOUR_BEFORE_WHATSAPP",
            },
          },
          select: { status: true, attemptCount: true },
        });
      } catch {
        warnings = [...warnings, "Migration reminder 1 ora non applicata"];
        return NextResponse.json({ ok: true, salons: salons.length, processed, enqueued, deduped, failed, skipped, warnings });
      }
      if (existing?.status === "SENT" || (existing && existing.attemptCount >= 3)) {
        skipped += 1;
        continue;
      }

      const result = await enqueueReminderHourBefore({
        id: appointment.id,
        salonId: salon.id,
        startAt: appointment.startAt,
        clientName: `${appointment.cliente.nome} ${appointment.cliente.cognome}`.trim(),
        dogName: appointment.cane.nome,
        phone: appointment.cliente.telefono,
      });
      if (!result.enqueued) {
        failed += 1;
        continue;
      }
      await prisma.appointmentReminder.upsert({
        where: {
          appointmentId_kind: {
            appointmentId: appointment.id,
            kind: "HOUR_BEFORE_WHATSAPP",
          },
        },
        update: {
          status: "PENDING",
          errorMessage: null,
        },
        create: {
          appointmentId: appointment.id,
          kind: "HOUR_BEFORE_WHATSAPP",
          status: "PENDING",
          attemptCount: 0,
        },
      });
      if (result.dedup) deduped += 1;
      else enqueued += 1;
    }
  }
  const worker = await processWhatsAppQueueBatch({ batchSize: 120, workerId: "cron-hour-before" });

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
