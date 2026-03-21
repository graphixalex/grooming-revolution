import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { getBookingSlotOptions } from "@/lib/booking";

function extractDogNodi(note: string | null | undefined): "NESSUNO" | "MODERATI" | "MOLTI" {
  const text = String(note || "").toLowerCase();
  if (text.includes("nodi: molti")) return "MOLTI";
  if (text.includes("nodi: moderati")) return "MODERATI";
  return "NESSUNO";
}

export async function GET(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;

  const requestId = req.nextUrl.searchParams.get("requestId") || "";
  const treatmentId = req.nextUrl.searchParams.get("treatmentId") || "";
  if (!requestId) return NextResponse.json({ error: "requestId mancante" }, { status: 400 });

  const request = await prisma.bookingRequest.findFirst({
    where: { id: requestId, salonId, status: "PENDING" },
    select: {
      id: true,
      treatmentId: true,
      dogTaglia: true,
      dogRazza: true,
      dogTipoPelo: true,
      note: true,
    },
  });
  if (!request) return NextResponse.json({ error: "Richiesta non trovata" }, { status: 404 });

  const finalTreatmentId = treatmentId || request.treatmentId;
  const treatment = await prisma.treatment.findFirst({
    where: { id: finalTreatmentId, salonId, attivo: true },
    select: { id: true },
  });
  if (!treatment) return NextResponse.json({ error: "Servizio non disponibile" }, { status: 400 });

  const { durationMin, slots } = await getBookingSlotOptions({
    salonId,
    treatmentId: finalTreatmentId,
    dogSize: request.dogTaglia,
    dogRazza: request.dogRazza,
    dogTipoPelo: request.dogTipoPelo,
    dogNodi: extractDogNodi(request.note),
    maxOptions: 6,
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

