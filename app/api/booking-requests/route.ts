import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { isBookingSlotStillAvailable } from "@/lib/booking";

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
  return NextResponse.json(rows);
}

export async function PATCH(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;
  const body = await req.json();
  const requestId = String(body.requestId || "");
  const action = String(body.action || "");
  if (!requestId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  const request = await prisma.bookingRequest.findFirst({
    where: { id: requestId, salonId },
    include: { treatment: true },
  });
  if (!request) return NextResponse.json({ error: "Richiesta non trovata" }, { status: 404 });
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "Richiesta gia processata" }, { status: 400 });
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
      const createdClient = await trx.client.create({
        data: {
          salonId,
          nome: request.clientNome,
          cognome: request.clientCognome,
          telefono: request.clientTelefono,
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

    return trx.bookingRequest.update({
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
  }, {
    isolationLevel: "Serializable",
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("SLOT_UNAVAILABLE")) return null;
    if (message.includes("P2034") || message.toLowerCase().includes("serialize")) return null;
    throw error;
  });

  if (!approved) {
    return NextResponse.json({ error: "Slot non piu disponibile: aggiorna le opzioni o scegli un altro orario." }, { status: 409 });
  }

  return NextResponse.json(approved);
}
