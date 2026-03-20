import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { it as dateFnsIt } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { getTomorrowUtcRangeForTimeZone } from "@/lib/timezone";
import { sendWhatsAppTextViaApi } from "@/lib/whatsapp";

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;
  const alt = req.headers.get("x-cron-secret");
  return token === secret || alt === secret;
}

function renderReminderText(input: {
  clientName: string;
  petName: string;
  startAt: Date;
  salonName: string;
  salonPhone?: string | null;
}) {
  const dateLabel = format(input.startAt, "EEEE dd/MM", { locale: dateFnsIt });
  const timeLabel = format(input.startAt, "HH:mm");
  const phonePart = input.salonPhone ? ` o chiamarci al ${input.salonPhone}` : "";
  return (
    `Buongiorno ${input.clientName}, ` +
    `le ricordiamo l'appuntamento di ${input.petName} previsto per domani (${dateLabel}) alle ${timeLabel} presso ${input.salonName}. ` +
    `Se desidera disdire o riprogrammare, la preghiamo di rispondere a questo messaggio${phonePart}. ` +
    `Grazie.`
  );
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const salons = await prisma.salon.findMany({
    where: { whatsappApiEnabled: true },
    select: {
      id: true,
      timezone: true,
      nomeAttivita: true,
      telefono: true,
    },
  });

  let processed = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const salon of salons) {
    const { startUtc, endUtc } = getTomorrowUtcRangeForTimeZone(salon.timezone || "Europe/Rome");

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

      if (existing?.status === "SENT") {
        skipped += 1;
        continue;
      }
      if (existing && existing.attemptCount >= 3) {
        skipped += 1;
        continue;
      }

      const message = renderReminderText({
        clientName: `${appointment.cliente.nome} ${appointment.cliente.cognome}`.trim(),
        petName: appointment.cane.nome,
        startAt: appointment.startAt,
        salonName: salon.nomeAttivita,
        salonPhone: salon.telefono,
      });

      const result = await sendWhatsAppTextViaApi({
        salonId: salon.id,
        phone: appointment.cliente.telefono,
        text: message,
      });

      const nextAttempt = (existing?.attemptCount ?? 0) + 1;
      const now = new Date();

      if (result.ok) {
        sent += 1;
        await prisma.appointmentReminder.upsert({
          where: {
            appointmentId_kind: {
              appointmentId: appointment.id,
              kind: "DAY_BEFORE_WHATSAPP",
            },
          },
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
          where: {
            appointmentId_kind: {
              appointmentId: appointment.id,
              kind: "DAY_BEFORE_WHATSAPP",
            },
          },
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

  return NextResponse.json({
    ok: true,
    salons: salons.length,
    processed,
    sent,
    failed,
    skipped,
  });
}
