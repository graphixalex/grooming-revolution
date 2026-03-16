import { NextRequest, NextResponse } from "next/server";
import { AppointmentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { appointmentSchema, transactionSchema } from "@/lib/validators";
import { computeEndAt, hasOverlap, isInsideWorkingHours } from "@/lib/business-rules";

export async function GET(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  const appointments = await prisma.appointment.findMany({
    where: {
      salonId,
      deletedAt: null,
      startAt: from ? { gte: new Date(from) } : undefined,
      endAt: to ? { lte: new Date(to) } : undefined,
    },
    include: {
      cane: true,
      cliente: true,
      trattamentiSelezionati: { include: { treatment: true } },
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

  const parsed = appointmentSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const salon = await prisma.salon.findUnique({ where: { id: salonId }, select: { overlapAllowed: true, workingHoursJson: true } });
  if (!salon) return NextResponse.json({ error: "Salone non trovato" }, { status: 404 });

  const startAt = new Date(parsed.data.startAt);
  const endAt = computeEndAt(startAt, parsed.data.durataMinuti);

  if (!isInsideWorkingHours(salon.workingHoursJson, startAt, endAt)) {
    return NextResponse.json({ error: "Orario fuori fascia lavorativa" }, { status: 400 });
  }

  if (!salon.overlapAllowed && (await hasOverlap(salonId, startAt, endAt))) {
    return NextResponse.json({ error: "Sovrapposizione con altro appuntamento" }, { status: 400 });
  }

  const appointment = await prisma.appointment.create({
    data: {
      salonId,
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
    include: { trattamentiSelezionati: true },
  });

  return NextResponse.json(appointment, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;

  const body = await req.json();
  const appointmentId = body.appointmentId as string | undefined;
  if (!appointmentId) return NextResponse.json({ error: "appointmentId obbligatorio" }, { status: 400 });

  const appointment = await prisma.appointment.findFirst({ where: { id: appointmentId, salonId, deletedAt: null } });
  if (!appointment) return NextResponse.json({ error: "Appuntamento non trovato" }, { status: 404 });

  if (body.transaction) {
    const parsedTx = transactionSchema.safeParse(body.transaction);
    if (!parsedTx.success) return NextResponse.json({ error: parsedTx.error.flatten() }, { status: 400 });

    const amount = new Prisma.Decimal(parsedTx.data.amount);
    const tipAmount = new Prisma.Decimal(parsedTx.data.tipAmount ?? 0);
    const vatRate = new Prisma.Decimal(appointment ? 22 : 22);
    const vatAmount = amount.mul(vatRate).div(new Prisma.Decimal(100).plus(vatRate));
    const netAmount = amount.sub(vatAmount);
    const grossAmount = amount.plus(tipAmount);
    const openCashSession =
      parsedTx.data.method === "CASH"
        ? await prisma.cashSession.findFirst({
            where: { salonId, status: "OPEN" },
            orderBy: { openedAt: "desc" },
            select: { id: true },
          })
        : null;

    const tx = await prisma.transaction.create({
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

    return NextResponse.json(tx);
  }

  const hasStartUpdate = typeof body.startAt !== "undefined";
  const hasDurationUpdate = typeof body.durataMinuti !== "undefined";
  const hasScheduleUpdate = hasStartUpdate || hasDurationUpdate;
  const hasTreatmentsUpdate = Array.isArray(body.trattamentiIds);
  const nextStatus = (body.stato as AppointmentStatus | undefined) ?? appointment.stato;

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

  if (hasScheduleUpdate) {
    const salon = await prisma.salon.findUnique({ where: { id: salonId }, select: { overlapAllowed: true, workingHoursJson: true } });
    if (!salon) return NextResponse.json({ error: "Salone non trovato" }, { status: 404 });

    if (!isInsideWorkingHours(salon.workingHoursJson, startAt, endAt)) {
      return NextResponse.json({ error: "Orario fuori fascia lavorativa" }, { status: 400 });
    }

    if (!salon.overlapAllowed && (await hasOverlap(salonId, startAt, endAt, appointmentId))) {
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
      cane: true,
      cliente: true,
      trattamentiSelezionati: { include: { treatment: true } },
      transactions: true,
    },
  });

  return NextResponse.json(updated);
}

