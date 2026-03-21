import { PublicBookingClient } from "@/components/booking/public-booking-client";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BookingPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const salon = await prisma.salon.findFirst({
    where: {
      bookingSlug: slug,
      bookingEnabled: true,
      subscriptionPlan: { not: "FREE" },
    },
    select: { id: true },
  });

  if (!salon) return notFound();

  return <PublicBookingClient slug={slug} />;
}
