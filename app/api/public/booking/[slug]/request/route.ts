import { NextRequest, NextResponse } from "next/server";
import { BookingTrustFlag, DogSize } from "@prisma/client";
import { addDays, subMinutes } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getBookingSlotOptions, isBookingSlotStillAvailable } from "@/lib/booking";
import { getClientIp } from "@/lib/request";
import { isRateLimited } from "@/lib/security-controls";
import { assertCriticalEnv } from "@/lib/env-security";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 20;

function normalizePhone(value: string) {
  return value.replace(/\s+/g, "").trim();
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    assertCriticalEnv("rateLimit");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Configurazione sicurezza non valida";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const { slug } = await params;
  const ip = getClientIp(req);
  const ipLimited = await isRateLimited({
    bucket: "booking-request-ip",
    key: `${slug}:${ip}`,
    limit: 12,
    windowSec: 15 * 60,
  });
  if (ipLimited) {
    return NextResponse.json({ error: "Troppi tentativi. Riprova tra qualche minuto." }, { status: 429 });
  }

  const salon = await prisma.salon.findFirst({
    where: { bookingSlug: slug, bookingEnabled: true, subscriptionPlan: { not: "FREE" } },
    select: { id: true },
  });
  if (!salon) return NextResponse.json({ error: "Booking non disponibile" }, { status: 404 });

  const body = await req.json();
  const clientNome = String(body.clientNome || "").trim();
  const clientCognome = String(body.clientCognome || "").trim();
  const clientTelefono = normalizePhone(String(body.clientTelefono || ""));
  const clientEmail = String(body.clientEmail || "").trim() || null;
  const dogNome = String(body.dogNome || "").trim();
  const dogRazza = String(body.dogRazza || "").trim() || null;
  const dogTaglia = String(body.dogTaglia || "") as DogSize;
  const dogTipoPelo = String(body.dogTipoPelo || "").trim() || null;
  const dogNodiRaw = String(body.dogNodi || "NESSUNO").trim().toUpperCase();
  const dogNodi = ["NESSUNO", "MODERATI", "MOLTI"].includes(dogNodiRaw) ? dogNodiRaw : "NESSUNO";
  const note = String(body.note || "").trim() || null;
  const treatmentId = String(body.treatmentId || "").trim();
  const selectedStartAtRaw = String(body.selectedStartAt || "");
  const selectedOperatorIdRaw = body.selectedOperatorId ? String(body.selectedOperatorId) : null;
  const selectedStartAt = new Date(selectedStartAtRaw);

  if (!clientNome || !clientCognome || !clientTelefono || !dogNome || !treatmentId || !selectedStartAtRaw) {
    return NextResponse.json({ error: "Compila tutti i campi obbligatori" }, { status: 400 });
  }
  if (!["XS", "S", "M", "L", "XL", "XXL"].includes(dogTaglia) || Number.isNaN(selectedStartAt.getTime())) {
    return NextResponse.json({ error: "Dati cane/data non validi" }, { status: 400 });
  }
  const phoneLimited = await isRateLimited({
    bucket: "booking-request-phone",
    key: `${slug}:${clientTelefono}`,
    limit: 8,
    windowSec: 15 * 60,
  });
  if (phoneLimited) {
    return NextResponse.json({ error: "Troppi tentativi. Riprova tra qualche minuto." }, { status: 429 });
  }

  const recentByPhone = await prisma.bookingRequest.count({
    where: {
      salonId: salon.id,
      clientTelefono,
      createdAt: { gte: subMinutes(new Date(), RATE_LIMIT_WINDOW_MS / (60 * 1000)) },
    },
  });
  if (recentByPhone >= RATE_LIMIT_MAX) {
    return NextResponse.json({ error: "Troppi tentativi. Riprova tra qualche minuto." }, { status: 429 });
  }
  const recentDuplicate = await prisma.bookingRequest.findFirst({
    where: {
      salonId: salon.id,
      clientTelefono,
      treatmentId,
      requestedStartAt: selectedStartAt,
      createdAt: { gte: subMinutes(new Date(), 5) },
    },
    select: { id: true },
  });
  if (recentDuplicate) {
    return NextResponse.json({ error: "Richiesta già inviata da poco per questo slot." }, { status: 409 });
  }

  const treatment = await prisma.treatment.findFirst({
    where: { id: treatmentId, salonId: salon.id, attivo: true },
    select: { id: true },
  });
  if (!treatment) {
    return NextResponse.json({ error: "Servizio non disponibile" }, { status: 400 });
  }

  const { durationMin, slots } = await getBookingSlotOptions({
    salonId: salon.id,
    treatmentId,
    dogSize: dogTaglia,
    dogRazza,
    dogTipoPelo,
    dogNodi,
    maxOptions: 6,
    startAt: new Date(),
  });
  const matchedSlot = slots.find(
    (s) =>
      s.startAt.toISOString() === selectedStartAt.toISOString() &&
      (s.operatorId || null) === (selectedOperatorIdRaw || null),
  );
  if (!matchedSlot) {
    return NextResponse.json({ error: "Lo slot scelto non e più disponibile. Aggiorna le opzioni." }, { status: 409 });
  }

  const existingClient = await prisma.client.findFirst({
    where: {
      salonId: salon.id,
      deletedAt: null,
      telefono: clientTelefono,
      nome: { equals: clientNome, mode: "insensitive" },
      cognome: { equals: clientCognome, mode: "insensitive" },
    },
    select: { id: true },
  });

  let trustFlag: BookingTrustFlag = "NEW_CLIENT";
  if (existingClient) {
    const latestCompleted = await prisma.appointment.findFirst({
      where: { salonId: salon.id, clienteId: existingClient.id, deletedAt: null, stato: "COMPLETATO" },
      orderBy: { startAt: "desc" },
      select: { startAt: true },
    });
    if (!latestCompleted) {
      trustFlag = "STALE_CLIENT";
    } else {
      const threshold = addDays(new Date(), -60);
      trustFlag = latestCompleted.startAt >= threshold ? "TRUSTED_CLIENT" : "STALE_CLIENT";
    }
  }

  const existingDog = existingClient
    ? await prisma.dog.findFirst({
        where: {
          salonId: salon.id,
          clienteId: existingClient.id,
          deletedAt: null,
          nome: { equals: dogNome, mode: "insensitive" },
        },
        select: { id: true },
      })
    : null;

  const fallbackCreatedBy = await prisma.user.findFirst({
    where: { salonId: salon.id },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!fallbackCreatedBy) {
    return NextResponse.json({ error: "Configurazione non valida: nessun utente in salone" }, { status: 500 });
  }

  const created = await prisma.$transaction(async (trx) => {
    let appointmentId: string | null = null;
    let status: "PENDING" | "AUTO_CONFIRMED" = "PENDING";

    let clientId = existingClient?.id || null;
    let dogId = existingDog?.id || null;

    const composedNote = `${dogNodi === "NESSUNO" ? "Nodi: assenti" : dogNodi === "MODERATI" ? "Nodi: moderati" : "Nodi: molti"}${
      note ? `\n${note}` : ""
    }`;

    if (trustFlag === "TRUSTED_CLIENT") {
      const stillAvailable = await isBookingSlotStillAvailable({
        salonId: salon.id,
        startAt: matchedSlot.startAt,
        endAt: matchedSlot.endAt,
        operatorId: matchedSlot.operatorId,
        db: trx,
      });
      if (!stillAvailable) {
        throw new Error("SLOT_UNAVAILABLE");
      }

      if (!clientId) {
        const c = await trx.client.create({
          data: {
            salonId: salon.id,
            nome: clientNome,
            cognome: clientCognome,
            telefono: clientTelefono,
            email: clientEmail,
            consensoPromemoria: true,
            consensoTimestamp: new Date(),
          },
          select: { id: true },
        });
        clientId = c.id;
      }
      if (!dogId) {
        const d = await trx.dog.create({
          data: {
            salonId: salon.id,
            clienteId: clientId,
            nome: dogNome,
            razza: dogRazza,
            taglia: dogTaglia,
            noteCane: [dogTipoPelo ? `Tipo pelo: ${dogTipoPelo}` : null, `Nodi dichiarati: ${dogNodi.toLowerCase()}`]
              .filter(Boolean)
              .join(" | "),
          },
          select: { id: true },
        });
        dogId = d.id;
      }

      const appointment = await trx.appointment.create({
        data: {
          salonId: salon.id,
          operatorId: matchedSlot.operatorId,
          clienteId: clientId,
          caneId: dogId,
          startAt: matchedSlot.startAt,
          endAt: matchedSlot.endAt,
          durataMinuti: durationMin,
          noteAppuntamento: composedNote,
          createdById: fallbackCreatedBy.id,
          stato: "PRENOTATO",
          trattamentiSelezionati: {
            create: [{ treatmentId }],
          },
        },
        select: { id: true },
      });
      appointmentId = appointment.id;
      status = "AUTO_CONFIRMED";
    }

    const request = await trx.bookingRequest.create({
      data: {
        salonId: salon.id,
        treatmentId,
        existingClientId: clientId,
        existingDogId: dogId,
        proposedOperatorId: matchedSlot.operatorId,
        clientNome,
        clientCognome,
        clientTelefono,
        clientEmail,
        dogNome,
        dogRazza,
        dogTaglia,
        dogTipoPelo,
        note: composedNote,
        estimatedDurationMin: durationMin,
        requestedStartAt: matchedSlot.startAt,
        requestedEndAt: matchedSlot.endAt,
        trustFlag,
        status,
        appointmentId,
      },
      select: { id: true, status: true, trustFlag: true },
    });

    return request;
  }, {
    isolationLevel: "Serializable",
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("SLOT_UNAVAILABLE")) {
      return null;
    }
    if (message.includes("P2034") || message.toLowerCase().includes("serialize")) {
      return null;
    }
    throw error;
  });

  if (!created) {
    return NextResponse.json({ error: "Lo slot scelto non e più disponibile. Aggiorna le opzioni." }, { status: 409 });
  }

  return NextResponse.json({
    ok: true,
    requestId: created.id,
    status: created.status,
    trustFlag: created.trustFlag,
    message:
      created.status === "AUTO_CONFIRMED"
        ? "Prenotazione confermata automaticamente."
        : "Richiesta inviata. Il team ti contatterà per conferma.",
  });
}
