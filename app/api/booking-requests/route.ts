import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { estimateBookingDuration, isBookingSlotStillAvailable } from "@/lib/booking";
import { addMinutes } from "date-fns";
import { normalizePhoneCanonical } from "@/lib/phone";
import { enqueueBookingConfirmationForAppointment } from "@/lib/whatsapp-automation";

function extractDogNodi(note: string | null | undefined): "NESSUNO" | "MODERATI" | "MOLTI" {
  const text = String(note || "").toLowerCase();
  if (text.includes("nodi: molti")) return "MOLTI";
  if (text.includes("nodi: moderati")) return "MODERATI";
  return "NESSUNO";
}

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;

  const rows = await prisma.bookingRequest.findMany({
    where: { salonId },
    include: {
      treatment: { select: { nome: true } },
      proposedOperator: { select: { nome: true } },
      reviewedBy: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const treatments = await prisma.treatment.findMany({
    where: { salonId, attivo: true },
    orderBy: { ordine: "asc" },
    select: { id: true, nome: true },
  });
  return NextResponse.json({ rows, treatments });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;
  const salonMeta = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { paese: true },
  });
  const body = await req.json();
  const requestId = String(body.requestId || "");
  const action = String(body.action || "");
  if (!requestId || !["approve", "reject", "update"].includes(action)) {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  const request = await prisma.bookingRequest.findFirst({
    where: { id: requestId, salonId },
    include: { treatment: true },
  });
  if (!request) return NextResponse.json({ error: "Richiesta non trovata" }, { status: 404 });
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "Richiesta già processata" }, { status: 400 });
  }

  if (action === "update") {
    const treatmentIdRaw = String(body.treatmentId || request.treatmentId);
    const selectedStartAtRaw = String(body.selectedStartAt || request.requestedStartAt.toISOString());
    const selectedOperatorIdRaw = body.selectedOperatorId === null || body.selectedOperatorId === undefined
      ? (request.proposedOperatorId || null)
      : String(body.selectedOperatorId || "");
    const selectedStartAt = new Date(selectedStartAtRaw);
    if (!treatmentIdRaw || Number.isNaN(selectedStartAt.getTime())) {
      return NextResponse.json({ error: "Dati modifica non validi" }, { status: 400 });
    }

    const treatment = await prisma.treatment.findFirst({
      where: { id: treatmentIdRaw, salonId, attivo: true },
      select: { id: true },
    });
    if (!treatment) {
      return NextResponse.json({ error: "Servizio non disponibile" }, { status: 400 });
    }

    const durationMin = await estimateBookingDuration({
      salonId,
      treatmentId: treatmentIdRaw,
      dogSize: request.dogTaglia,
      dogRazza: request.dogRazza,
      dogTipoPelo: request.dogTipoPelo,
      dogNodi: extractDogNodi(request.note),
    });
    const selectedEndAt = addMinutes(selectedStartAt, durationMin);

    const stillAvailable = await isBookingSlotStillAvailable({
      salonId,
      startAt: selectedStartAt,
      endAt: selectedEndAt,
      operatorId: selectedOperatorIdRaw || null,
    });
    if (!stillAvailable) {
      return NextResponse.json({ error: "Slot non disponibile per la nuova durata. Scegli un altro orario." }, { status: 409 });
    }

    const updated = await prisma.bookingRequest.update({
      where: { id: request.id },
      data: {
        treatmentId: treatmentIdRaw,
        proposedOperatorId: selectedOperatorIdRaw || null,
        requestedStartAt: selectedStartAt,
        requestedEndAt: selectedEndAt,
        estimatedDurationMin: durationMin,
      },
      include: {
        treatment: { select: { nome: true } },
        proposedOperator: { select: { nome: true } },
      },
    });
    return NextResponse.json(updated);
  }

  if (action === "reject") {
    const rejected = await prisma.bookingRequest.update({
      where: { id: request.id },
      data: {
        status: "REJECTED",
        reviewedById: auth.session.user.id,
        reviewedAt: new Date(),
      },
    });
    return NextResponse.json(rejected);
  }

  const fallbackCreatedBy = auth.session.user.id;
  const approved = await prisma.$transaction(async (trx) => {
    const stillAvailable = await isBookingSlotStillAvailable({
      salonId,
      startAt: request.requestedStartAt,
      endAt: request.requestedEndAt,
      operatorId: request.proposedOperatorId,
      db: trx,
    });
    if (!stillAvailable) {
      throw new Error("SLOT_UNAVAILABLE");
    }

    let clientId = request.existingClientId;
    if (!clientId) {
      const normalizedPhone = normalizePhoneCanonical(request.clientTelefono, { countryCode: salonMeta?.paese }) || request.clientTelefono;
      const createdClient = await trx.client.create({
        data: {
          salonId,
          nome: request.clientNome,
          cognome: request.clientCognome,
          telefono: normalizedPhone,
          email: request.clientEmail || null,
          consensoPromemoria: true,
          consensoTimestamp: new Date(),
        },
        select: { id: true },
      });
      clientId = createdClient.id;
    }

    let dogId = request.existingDogId;
    if (!dogId) {
      const createdDog = await trx.dog.create({
        data: {
          salonId,
          clienteId: clientId,
          nome: request.dogNome,
          razza: request.dogRazza,
          taglia: request.dogTaglia,
          noteCane: request.dogTipoPelo ? `Tipo pelo: ${request.dogTipoPelo}` : null,
        },
        select: { id: true },
      });
      dogId = createdDog.id;
    }

    const appointment = await trx.appointment.create({
      data: {
        salonId,
        operatorId: request.proposedOperatorId,
        clienteId: clientId,
        caneId: dogId,
        startAt: request.requestedStartAt,
        endAt: request.requestedEndAt,
        durataMinuti: request.estimatedDurationMin,
        noteAppuntamento: request.note,
        createdById: fallbackCreatedBy,
        stato: "PRENOTATO",
        trattamentiSelezionati: {
          create: [{ treatmentId: request.treatmentId }],
        },
      },
      select: { id: true },
    });

    const bookingUpdate = await trx.bookingRequest.update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
        appointmentId: appointment.id,
        existingClientId: clientId,
        existingDogId: dogId,
        reviewedById: auth.session.user.id,
        reviewedAt: new Date(),
      },
    });
    return { bookingUpdate, appointmentId: appointment.id };
  }, {
    isolationLevel: "Serializable",
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("SLOT_UNAVAILABLE")) return null;
    if (message.includes("P2034") || message.toLowerCase().includes("serialize")) return null;
    throw error;
  });

  if (!approved) {
    return NextResponse.json({ error: "Slot non più disponibile: aggiorna le opzioni o scegli un altro orario." }, { status: 409 });
  }

  await enqueueBookingConfirmationForAppointment(approved.appointmentId).catch(() => null);

  return NextResponse.json(approved.bookingUpdate);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;

  const requestId = req.nextUrl.searchParams.get("requestId") || "";
  if (!requestId) {
    return NextResponse.json({ error: "requestId mancante" }, { status: 400 });
  }

  const request = await prisma.bookingRequest.findFirst({
    where: { id: requestId, salonId },
    select: { id: true, status: true },
  });
  if (!request) return NextResponse.json({ error: "Richiesta non trovata" }, { status: 404 });
  if (request.status === "PENDING") {
    return NextResponse.json({ error: "Puoi eliminare solo messaggi già processati." }, { status: 400 });
  }

  await prisma.bookingRequest.delete({ where: { id: request.id } });
  return NextResponse.json({ ok: true });
}

