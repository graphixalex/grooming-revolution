import { PublicBookingClient } from "@/components/booking/public-booking-client";

export default async function BookingPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicBookingClient slug={slug} />;
}

