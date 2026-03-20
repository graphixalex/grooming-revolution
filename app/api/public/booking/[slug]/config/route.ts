import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const salon = await prisma.salon.findFirst({
    where: {
      bookingSlug: slug,
      bookingEnabled: true,
      subscriptionPlan: { not: "FREE" },
    },
    select: {
      id: true,
      nomeAttivita: true,
      indirizzo: true,
      telefono: true,
      bookingDisplayName: true,
      bookingDescription: true,
      bookingLogoUrl: true,
      treatments: {
        where: { attivo: true },
        orderBy: { ordine: "asc" },
        select: { id: true, nome: true },
      },
    },
  });

  if (!salon) {
    return NextResponse.json({ error: "Booking non disponibile" }, { status: 404 });
  }

  return NextResponse.json({
    salonId: salon.id,
    displayName: salon.bookingDisplayName || salon.nomeAttivita,
    description: salon.bookingDescription || "",
    logoUrl: salon.bookingLogoUrl || "",
    address: salon.indirizzo || "",
    phone: salon.telefono || "",
    treatments: salon.treatments,
  });
}

