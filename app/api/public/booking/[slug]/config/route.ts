import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
      timezone: true,
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
    return NextResponse.json(
      { error: "Booking non disponibile" },
      { status: 404, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
    );
  }

  return NextResponse.json(
    {
      salonId: salon.id,
      displayName: salon.bookingDisplayName || salon.nomeAttivita,
      timeZone: salon.timezone || "Europe/Zurich",
      description: salon.bookingDescription || "",
      logoUrl: salon.bookingLogoUrl || "",
      address: salon.indirizzo || "",
      phone: salon.telefono || "",
      treatments: salon.treatments,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
