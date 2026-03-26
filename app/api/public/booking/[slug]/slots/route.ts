import { NextRequest, NextResponse } from "next/server";
import { DogSize } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getBookingSlotOptions } from "@/lib/booking";
import { getClientIp } from "@/lib/request";
import { isRateLimited } from "@/lib/security-controls";
import { assertCriticalEnv } from "@/lib/env-security";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    assertCriticalEnv("rateLimit");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Configurazione sicurezza non valida";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const { slug } = await params;
  const ip = getClientIp(req);
  const limited = await isRateLimited({
    bucket: "booking-slots",
    key: `${slug}:${ip}`,
    limit: 60,
    windowSec: 15 * 60,
  });
  if (limited) {
    return NextResponse.json({ error: "Troppe richieste. Riprova tra qualche minuto." }, { status: 429 });
  }

  const salon = await prisma.salon.findFirst({
    where: {
      bookingSlug: slug,
      bookingEnabled: true,
      subscriptionPlan: { not: "FREE" },
    },
    select: { id: true },
  });
  if (!salon) return NextResponse.json({ error: "Booking non disponibile" }, { status: 404 });

  const body = await req.json();
  const treatmentId = String(body.treatmentId || "");
  const dogSize = String(body.dogSize || "") as DogSize;
  const dogRazza = String(body.dogRazza || "");
  const dogTipoPelo = String(body.dogTipoPelo || "");
  const dogNodiRaw = String(body.dogNodi || "NESSUNO").trim().toUpperCase();
  const dogNodi = ["NESSUNO", "MODERATI", "MOLTI"].includes(dogNodiRaw) ? dogNodiRaw : "NESSUNO";
  const startAtRaw = body.startAt ? String(body.startAt) : "";
  const startAt = startAtRaw ? new Date(startAtRaw) : new Date();
  if (Number.isNaN(startAt.getTime())) {
    return NextResponse.json({ error: "Data di ricerca non valida" }, { status: 400 });
  }
  if (!treatmentId || !["XS", "S", "M", "L", "XL", "XXL"].includes(dogSize)) {
    return NextResponse.json({ error: "Dati servizio/cane non validi" }, { status: 400 });
  }

  const { durationMin, slots } = await getBookingSlotOptions({
    salonId: salon.id,
    treatmentId,
    dogSize,
    dogRazza,
    dogTipoPelo,
    dogNodi,
    maxOptions: 6,
    startAt,
  });

  return NextResponse.json({
    estimatedDurationMin: durationMin,
    slots: slots.map((s) => ({
      startAt: s.startAt.toISOString(),
      endAt: s.endAt.toISOString(),
      operatorId: s.operatorId,
      operatorName: s.operatorName,
    })),
  });
}
