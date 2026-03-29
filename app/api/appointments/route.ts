import { NextRequest, NextResponse } from "next/server";
import { AppointmentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { appointmentSchema, transactionSchema } from "@/lib/validators";
import { computeEndAt, hasOverlap, isInsideWorkingHours } from "@/lib/business-rules";
import { enqueueBookingConfirmationForAppointment } from "@/lib/whatsapp-automation";

const INTERNAL_NOTE_PHONE = "__NOTE__";
const INTERNAL_NOTE_EMAIL = "note@sistema.local";
const INTERNAL_NOTE_CLIENT_NAME = "Nota";
const INTERNAL_NOTE_CLIENT_SURNAME = "Personale";
const INTERNAL_NOTE_DOG_NAME = "Nota personale";
const MAX_BULK_APPOINTMENTS = 24;

async function ensurePersonalNoteEntities(salonId: string) {
  let client = await prisma.client.findFirst({
    where: {
      salonId,
      deletedAt: null,
      telefono: INTERNAL_NOTE_PHONE,
    },
  });

  if (!client) {
    client = await prisma.client.create({
      data: {
        salonId,
        nome: INTERNAL_NOTE_CLIENT_NAME,
        cognome: INTERNAL_NOTE_CLIENT_SURNAME,
        telefono: INTERNAL_NOTE_PHONE,
        email: INTERNAL_NOTE_EMAIL,
        consensoPromemoria: false,
      },
    });
  }

  let dog = await prisma.dog.findFirst({
    where: {
      salonId,
      clienteId: client.id,
      deletedAt: null,
      nome: INTERNAL_NOTE_DOG_NAME,
    },
  });

  if (!dog) {
    dog = await prisma.dog.create({
      data: {
        salonId,
        clienteId: client.id,
        nome: INTERNAL_NOTE_DOG_NAME,
        taglia: "M",
      },
    });
  }

  return { clientId: client.id, dogId: dog.id };
}

export async function GET(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const operatorId = req.nextUrl.searchParams.get("operatorId");

  const appointments = await prisma.appointment.findMany({
    where: {
      salonId,
      deletedAt: null,
      operatorId: operatorId || undefined,
      startAt: from ? { gte: new Date(from) } : undefined,
      endAt: to ? { lte: new Date(to) } : undefined,
    },
    include: {
      operator: { select: { id: true, nome: true, color: true } },
      cane: true,
      cliente: true,
      trattamentiSelezionati: { include: { treatment: { select: { id: true, nome: true } } } },
      transactions: true,
    },
    orderBy: { startAt: "asc" },
  });

  return NextResponse.json(appointments);
}

export async function POST(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;

  const body = await req.json();
  const allowOverlap = body.allowOverlap === true;
  const activeOperatorsCount = await prisma.operator.count({ where: { salonId, attivo: true } });

  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { overlapAllowed: true, workingHoursJson: true, timezone: true },
  });
  if (!salon) return NextResponse.json({ error: "Salone non trovato" }, { status: 404 });
  const salonTimeZone = salon.timezone || "Europe/Zurich";

  if (body.modalita === "NOTE") {
    const startAt = new Date(String(body.startAt || ""));
    const durataMinuti = Number(body.durataMinuti);
    const noteAppuntamento = String(body.noteAppuntamento || "").trim();

    if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(durataMinuti) || durataMinuti < 15 || durataMinuti > 300 || durataMinuti % 15 !== 0) {
      return NextResponse.json({ error: "Dati nota non validi" }, { status: 400 });
    }
    if (!noteAppuntamento) {
      return NextResponse.json({ error: "Inserisci il testo della nota" }, { status: 400 });
    }

    const endAt = computeEndAt(startAt, durataMinuti);
    const operatorId = typeof body.operatorId === "string" && body.operatorId ? body.operatorId : null;
    const operator = operatorId
      ? await prisma.operator.findFirst({
          where: { id: operatorId, salonId, attivo: true },
          select: { id: true, workingHoursJson: true },
        })
      : null;
    if (operatorId && !operator) {
      return NextResponse.json({ error: "Operatore non valido" }, { status: 400 });
    }

    const useSalonHoursCheck = !operatorId;
    if (useSalonHoursCheck && !isInsideWorkingHours(salon.workingHoursJson, startAt, endAt, salonTimeZone)) {
      return NextResponse.json({ error: "Orario fuori fascia lavorativa sede" }, { status: 400 });
    }
    if (operator?.workingHoursJson && !isInsideWorkingHours(operator.workingHoursJson, startAt, endAt, salonTimeZone)) {
      return NextResponse.json({ error: "Orario fuori disponibilità operatore" }, { status: 400 });
    }

    if (!allowOverlap && !salon.overlapAllowed && (await hasOverlap(salonId, startAt, endAt, undefined, body.operatorId || null))) {
      return NextResponse.json({ error: "Sovrapposizione con altro appuntamento" }, { status: 400 });
    }

    const entities = await ensurePersonalNoteEntities(salonId);
    const appointment = await prisma.appointment.create({
      data: {
        salonId,
        operatorId: operatorId || null,
        clienteId: entities.clientId,
        caneId: entities.dogId,
        startAt,
        endAt,
        durataMinuti,
        noteAppuntamento,
        createdById: auth.session.user.id,
      },
      include: { trattamentiSelezionati: true },
    });
    await enqueueBookingConfirmationForAppointment(appointment.id).catch(() => null);

    return NextResponse.json(appointment, { status: 201 });
  }

  if (body.modalita === "BULK_APPOINTMENT") {
    const dryRun = body.dryRun === true;
    const sequenceItemsRaw: Array<{ rowId?: unknown; startAt: unknown; trattamentiIds?: unknown; operatorId?: unknown }> = Array.isArray(body.sequenceItems)
      ? body.sequenceItems
      : [];
    const normalizedSequenceItems = sequenceItemsRaw
      .map((item) => {
        const parsedStartAt = new Date(String(item.startAt));
        if (!Number.isFinite(parsedStartAt.getTime())) return null;
        const rawTreatments = Array.isArray(item.trattamentiIds) ? item.trattamentiIds : [];
        const normalizedTreatments = rawTreatments.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
        const operatorId = typeof item.operatorId === "string" && item.operatorId ? item.operatorId : null;
        const rowId = typeof item.rowId === "string" && item.rowId ? item.rowId : parsedStartAt.toISOString();
        return { rowId, startAt: parsedStartAt, trattamentiIds: normalizedTreatments, operatorId };
      })
      .filter((item): item is { rowId: string; startAt: Date; trattamentiIds: string[]; operatorId: string | null } => Boolean(item))
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

    const startAtListRaw: unknown[] = Array.isArray(body.startsAt) ? body.startsAt : [];
    const fallbackStartAtList = startAtListRaw
      .map((value: unknown) => new Date(String(value)))
      .filter((value: Date) => Number.isFinite(value.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    const fallbackOperatorId = typeof body.operatorId === "string" && body.operatorId ? body.operatorId : null;
    const sourceItems = normalizedSequenceItems.length
      ? normalizedSequenceItems
      : fallbackStartAtList.map((startAt) => ({
          rowId: startAt.toISOString(),
          startAt,
          trattamentiIds: [] as string[],
          operatorId: fallbackOperatorId,
        }));

    if (!sourceItems.length) {
      return NextResponse.json({ error: "Seleziona almeno una data/ora valida per la sequenza" }, { status: 400 });
    }
    if (sourceItems.length > MAX_BULK_APPOINTMENTS) {
      return NextResponse.json({ error: `Puoi creare al massimo ${MAX_BULK_APPOINTMENTS} appuntamenti in sequenza` }, { status: 400 });
    }

    const uniqueStartAtMap = new Map<string, { rowId: string; startAt: Date; trattamentiIds: string[]; operatorId: string | null }>();
    for (const item of sourceItems) {
      uniqueStartAtMap.set(item.startAt.toISOString(), item);
    }
    const uniqueSequenceItems = Array.from(uniqueStartAtMap.values()).sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

    const parsed = appointmentSchema.safeParse({
      clienteId: body.clienteId,
      caneId: body.caneId,
      startAt: uniqueSequenceItems[0].startAt.toISOString(),
      durataMinuti: body.durataMinuti,
      noteAppuntamento: body.noteAppuntamento,
      trattamentiIds: body.trattamentiIds,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const operators = await prisma.operator.findMany({
      where: { salonId, attivo: true },
      select: { id: true, workingHoursJson: true },
    });
    const operatorMap = new Map(operators.map((op) => [op.id, op]));
    const useSalonHoursCheck = activeOperatorsCount === 0;

    const slotRanges = uniqueSequenceItems.map((item) => ({
      startAt: item.startAt,
      endAt: computeEndAt(item.startAt, parsed.data.durataMinuti),
      trattamentiIds: item.trattamentiIds,
      operatorId: item.operatorId,
      rowId: item.rowId,
    }));

    const validationResults: Array<{
      rowId: string;
      startAt: string;
      operatorId: string | null;
      available: boolean;
      reasons: string[];
    }> = [];

    for (const range of slotRanges) {
      const reasons: string[] = [];
      const rowOperator = range.operatorId ? operatorMap.get(range.operatorId) : null;

      if (activeOperatorsCount > 0 && !range.operatorId) {
        reasons.push("Operatore obbligatorio");
      }
      if (range.operatorId && !rowOperator) {
        reasons.push("Operatore non valido");
      }
      if (useSalonHoursCheck && !isInsideWorkingHours(salon.workingHoursJson, range.startAt, range.endAt, salonTimeZone)) {
        reasons.push("Fuori orario sede");
      }
      if (rowOperator?.workingHoursJson && !isInsideWorkingHours(rowOperator.workingHoursJson, range.startAt, range.endAt, salonTimeZone)) {
        reasons.push("Fuori disponibilita operatore");
      }
      if (!allowOverlap && !salon.overlapAllowed && (await hasOverlap(salonId, range.startAt, range.endAt, undefined, range.operatorId))) {
        reasons.push("Sovrapposto con appuntamento esistente");
      }

      validationResults.push({
        rowId: range.rowId,
        startAt: range.startAt.toISOString(),
        operatorId: range.operatorId,
        available: reasons.length === 0,
        reasons,
      });
    }

    for (let i = 0; i < slotRanges.length; i += 1) {
      for (let j = i + 1; j < slotRanges.length; j += 1) {
        const sameOperator = (slotRanges[i].operatorId || null) === (slotRanges[j].operatorId || null);
        if (!sameOperator) continue;
        if (slotRanges[i].startAt < slotRanges[j].endAt && slotRanges[i].endAt > slotRanges[j].startAt) {
          const result = validationResults.find((row) => row.rowId === slotRanges[j].rowId);
          if (result) {
            result.available = false;
            result.reasons.push("Sovrapposto con un'altra riga della sequenza");
          }
        }
      }
    }

    const hasErrors = validationResults.some((row) => !row.available);
    if (dryRun) {
      return NextResponse.json({ ok: !hasErrors, results: validationResults });
    }
    if (hasErrors) {
      const first = validationResults.find((row) => !row.available)!;
      return NextResponse.json({ error: `${new Date(first.startAt).toLocaleString("it-IT")}: ${first.reasons.join(", ")}` }, { status: 400 });
    }

    const createdIds = await prisma.$transaction(async (trx) => {
      const ids: string[] = [];
      for (const range of slotRanges) {
        const treatmentIdsForRow = range.trattamentiIds.length ? range.trattamentiIds : parsed.data.trattamentiIds;
        const created = await trx.appointment.create({
          data: {
            salonId,
            operatorId: range.operatorId,
            clienteId: parsed.data.clienteId,
            caneId: parsed.data.caneId,
            startAt: range.startAt,
            endAt: range.endAt,
            durataMinuti: parsed.data.durataMinuti,
            noteAppuntamento: parsed.data.noteAppuntamento || null,
            createdById: auth.session.user.id,
            trattamentiSelezionati: {
              create: treatmentIdsForRow.map((treatmentId) => ({ treatmentId })),
            },
          },
          select: { id: true },
        });
        ids.push(created.id);
      }
      return ids;
    });
    await Promise.all(
      createdIds.map((id) => enqueueBookingConfirmationForAppointment(id).catch(() => null)),
    );

    return NextResponse.json({ createdCount: createdIds.length, ids: createdIds }, { status: 201 });
  }

  const parsed = appointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const operatorId = typeof body.operatorId === "string" && body.operatorId ? body.operatorId : null;
  if (!operatorId && activeOperatorsCount > 0) {
    return NextResponse.json({ error: "Seleziona un operatore" }, { status: 400 });
  }
  const operator = operatorId
    ? await prisma.operator.findFirst({
        where: { id: operatorId, salonId, attivo: true },
        select: { id: true, workingHoursJson: true },
      })
    : null;
  if (operatorId && !operator) return NextResponse.json({ error: "Operatore non valido" }, { status: 400 });

  const startAt = new Date(parsed.data.startAt);
  const endAt = computeEndAt(startAt, parsed.data.durataMinuti);

  const useSalonHoursCheck = !operatorId && activeOperatorsCount === 0;
  if (useSalonHoursCheck && !isInsideWorkingHours(salon.workingHoursJson, startAt, endAt, salonTimeZone)) {
    return NextResponse.json({ error: "Orario fuori fascia lavorativa sede" }, { status: 400 });
  }
  if (operator?.workingHoursJson && !isInsideWorkingHours(operator.workingHoursJson, startAt, endAt, salonTimeZone)) {
    return NextResponse.json({ error: "Orario fuori disponibilità operatore" }, { status: 400 });
  }

  if (!allowOverlap && !salon.overlapAllowed && (await hasOverlap(salonId, startAt, endAt, undefined, operatorId))) {
    return NextResponse.json({ error: "Sovrapposizione con altro appuntamento" }, { status: 400 });
  }

  const appointment = await prisma.appointment.create({
    data: {
      salonId,
      operatorId,
      clienteId: parsed.data.clienteId,
      caneId: parsed.data.caneId,
      startAt,
      endAt,
      durataMinuti: parsed.data.durataMinuti,
      noteAppuntamento: parsed.data.noteAppuntamento || null,
      createdById: auth.session.user.id,
      trattamentiSelezionati: {
        create: parsed.data.trattamentiIds.map((treatmentId) => ({ treatmentId })),
      },
    },
    include: { operator: true, trattamentiSelezionati: true },
  });
  await enqueueBookingConfirmationForAppointment(appointment.id).catch(() => null);

  return NextResponse.json(appointment, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;

  const body = await req.json();
  const allowOverlap = body.allowOverlap === true;
  const appointmentId = body.appointmentId as string | undefined;
  if (!appointmentId) return NextResponse.json({ error: "appointmentId obbligatorio" }, { status: 400 });

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, salonId, deletedAt: null },
    include: {
      salon: {
        select: {
          vatRate: true,
          vatIncluded: true,
        },
      },
    },
  });
  if (!appointment) return NextResponse.json({ error: "Appuntamento non trovato" }, { status: 404 });

  if (body.transaction) {
    const parsedTx = transactionSchema.safeParse(body.transaction);
    if (!parsedTx.success) return NextResponse.json({ error: parsedTx.error.flatten() }, { status: 400 });

    const amount = new Prisma.Decimal(parsedTx.data.amount);
    const tipAmount = new Prisma.Decimal(parsedTx.data.tipAmount ?? 0);
    const vatRate = new Prisma.Decimal(appointment.salon.vatRate);
    const vatAmount = appointment.salon.vatIncluded
      ? amount.mul(vatRate).div(new Prisma.Decimal(100).plus(vatRate))
      : amount.mul(vatRate).div(new Prisma.Decimal(100));
    const netAmount = appointment.salon.vatIncluded ? amount.sub(vatAmount) : amount;
    const grossAmount = appointment.salon.vatIncluded ? amount.plus(tipAmount) : amount.plus(vatAmount).plus(tipAmount);
    const openCashSession =
      parsedTx.data.method === "CASH"
        ? await prisma.cashSession.findFirst({
            where: { salonId, status: "OPEN" },
            orderBy: { openedAt: "desc" },
            select: { id: true },
          })
        : null;

    const tx = await prisma.$transaction(async (trx) => {
      const alreadyPaid = await trx.transaction.findFirst({
        where: { salonId, appointmentId },
        select: { id: true },
      });
      if (alreadyPaid) {
        throw new Error("APPOINTMENT_ALREADY_PAID");
      }

      const created = await trx.transaction.create({
        data: {
          salonId,
          appointmentId,
          cashSessionId: openCashSession?.id ?? null,
          amount,
          tipAmount,
          method: parsedTx.data.method,
          vatRate,
          vatAmount,
          netAmount,
          grossAmount,
          dateTime: new Date(),
          note: parsedTx.data.note || null,
          createdById: auth.session.user.id,
        },
      });

      await trx.appointment.update({
        where: { id: appointmentId },
        data: { stato: "COMPLETATO" },
      });

      return created;
    }, {
      isolationLevel: "Serializable",
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("APPOINTMENT_ALREADY_PAID")) {
        return null;
      }
      if (message.includes("P2034") || message.toLowerCase().includes("serialize")) {
        return null;
      }
      throw error;
    });

    if (!tx) {
      return NextResponse.json({ error: "Incasso già registrato per questo appuntamento" }, { status: 409 });
    }

    return NextResponse.json(tx);
  }

  const hasStartUpdate = typeof body.startAt !== "undefined";
  const hasDurationUpdate = typeof body.durataMinuti !== "undefined";
  const hasScheduleUpdate = hasStartUpdate || hasDurationUpdate;
  const hasTreatmentsUpdate = Array.isArray(body.trattamentiIds);
  const hasOperatorUpdate = typeof body.operatorId !== "undefined";
  const needsAvailabilityChecks = hasScheduleUpdate || hasOperatorUpdate;
  const nextStatus = (body.stato as AppointmentStatus | undefined) ?? appointment.stato;

  if (hasOperatorUpdate && body.operatorId) {
    const exists = await prisma.operator.findFirst({
      where: { id: String(body.operatorId), salonId, attivo: true },
      select: { id: true },
    });
    if (!exists) return NextResponse.json({ error: "Operatore non valido" }, { status: 400 });
  }

  if (nextStatus === "CANCELLATO") {
    const transactionsCount = await prisma.transaction.count({
      where: { salonId, appointmentId },
    });
    if (transactionsCount > 0) {
      return NextResponse.json({ error: "Impossibile cancellare un appuntamento con incasso registrato" }, { status: 400 });
    }
  }

  const durata = Number(hasDurationUpdate ? body.durataMinuti : appointment.durataMinuti);
  const startAt = hasStartUpdate ? new Date(body.startAt as string) : appointment.startAt;
  const endAt = computeEndAt(startAt, durata);

  if (needsAvailabilityChecks) {
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { overlapAllowed: true, workingHoursJson: true, timezone: true },
    });
    if (!salon) return NextResponse.json({ error: "Salone non trovato" }, { status: 404 });
    const salonTimeZone = salon.timezone || "Europe/Zurich";

    const candidateOperatorId =
      typeof body.operatorId !== "undefined" ? (body.operatorId || null) : appointment.operatorId;
    const candidateOperator = candidateOperatorId
      ? await prisma.operator.findFirst({
          where: { id: candidateOperatorId, salonId, attivo: true },
          select: { id: true, workingHoursJson: true },
        })
      : null;
    if (candidateOperatorId && !candidateOperator) {
      return NextResponse.json({ error: "Operatore non valido" }, { status: 400 });
    }

    const activeOperatorsCount = await prisma.operator.count({ where: { salonId, attivo: true } });
    const useSalonHoursCheck = !candidateOperatorId && activeOperatorsCount === 0;
    if (useSalonHoursCheck && !isInsideWorkingHours(salon.workingHoursJson, startAt, endAt, salonTimeZone)) {
      return NextResponse.json({ error: "Orario fuori fascia lavorativa sede" }, { status: 400 });
    }
    if (
      candidateOperator?.workingHoursJson &&
      !isInsideWorkingHours(candidateOperator.workingHoursJson, startAt, endAt, salonTimeZone)
    ) {
      return NextResponse.json({ error: "Orario fuori disponibilità operatore" }, { status: 400 });
    }

    if (!allowOverlap && !salon.overlapAllowed && (await hasOverlap(salonId, startAt, endAt, appointmentId, candidateOperatorId))) {
      return NextResponse.json({ error: "Sovrapposizione con altro appuntamento" }, { status: 400 });
    }
  }

  if (hasTreatmentsUpdate) {
    await prisma.appointmentTreatment.deleteMany({ where: { appointmentId } });
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      startAt,
      endAt,
      durataMinuti: durata,
      operatorId: hasOperatorUpdate ? (body.operatorId || null) : appointment.operatorId,
      noteAppuntamento: body.noteAppuntamento ?? appointment.noteAppuntamento,
      stato: nextStatus,
      deletedAt: nextStatus === "CANCELLATO" ? new Date() : appointment.deletedAt,
      trattamentiSelezionati: hasTreatmentsUpdate
        ? {
            create: (body.trattamentiIds as string[]).map((treatmentId) => ({ treatmentId })),
          }
        : undefined,
    },
    include: {
      operator: { select: { id: true, nome: true, color: true } },
      cane: true,
      cliente: true,
      trattamentiSelezionati: { include: { treatment: { select: { id: true, nome: true } } } },
      transactions: true,
    },
  });

  const startChanged = hasStartUpdate && appointment.startAt.getTime() !== startAt.getTime();
  if (startChanged) {
    await prisma.appointmentReminder.deleteMany({
      where: {
        appointmentId,
        kind: { in: ["DAY_BEFORE_WHATSAPP", "HOUR_BEFORE_WHATSAPP"] },
      },
    });
    if (nextStatus === "PRENOTATO") {
      await enqueueBookingConfirmationForAppointment(appointmentId).catch(() => null);
    }
  }

  if (nextStatus === "CANCELLATO") {
    await prisma.whatsAppOutboundMessage.updateMany({
      where: {
        appointmentId,
        status: { in: ["QUEUED", "LOCKED", "SENDING", "RETRY_SCHEDULED"] },
        kind: { in: ["BOOKING_CONFIRM", "REMINDER_DAY_BEFORE", "REMINDER_HOUR_BEFORE"] },
      },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        lockExpiresAt: null,
        lockedAt: null,
        lockedBy: null,
        lastErrorCode: "APPOINTMENT_CANCELLED",
        lastErrorMessage: "Appuntamento cancellato prima dell'invio",
      },
    });
  }

  return NextResponse.json(updated);
}


