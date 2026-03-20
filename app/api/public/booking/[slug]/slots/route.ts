import { NextRequest, NextResponse } from "next/server";
import { DogSize } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getBookingSlotOptions } from "@/lib/booking";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
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
  if (!treatmentId || !["XS", "S", "M", "L", "XL", "XXL"].includes(dogSize)) {
    return NextResponse.json({ error: "Dati servizio/cane non validi" }, { status: 400 });
  }

  const { durationMin, slots } = await getBookingSlotOptions({
    salonId: salon.id,
    treatmentId,
    dogSize,
    dogRazza,
    dogTipoPelo,
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

