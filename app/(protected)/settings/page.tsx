import { getRequiredSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "@/components/settings/settings-client";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await getRequiredSession();
  if (session.user.role === "STAFF") {
    redirect("/planner");
  }

  const ownerGroup = session.user.role === "OWNER"
    ? await prisma.salon.findUnique({
        where: { id: session.user.salonId },
        select: { salonGroupId: true },
      })
    : null;

  const [salon, tags, treatments, staff, operators, assignableSalons] = await Promise.all([
    prisma.salon.findUnique({
      where: { id: session.user.salonId },
      select: {
        id: true,
        salonGroupId: true,
        nomeAttivita: true,
        nomeSede: true,
        paese: true,
        timezone: true,
        valuta: true,
        vatRate: true,
        vatIncluded: true,
        indirizzo: true,
        telefono: true,
        email: true,
        whatsappTemplate: true,
        emailTemplate: true,
        overlapAllowed: true,
        workingHoursJson: true,
        holidaysJson: true,
        subscriptionPlan: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        billingVatNumber: true,
        billingCountry: true,
        bookingEnabled: true,
        bookingSlug: true,
        bookingDisplayName: true,
        bookingDescription: true,
        bookingLogoUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.quickTag.findMany({ where: { salonId: session.user.salonId }, orderBy: { ordine: "asc" } }),
    prisma.treatment.findMany({ where: { salonId: session.user.salonId }, orderBy: { ordine: "asc" } }),
    session.user.role === "OWNER" && ownerGroup?.salonGroupId
      ? prisma.user.findMany({
          where: { salon: { salonGroupId: ownerGroup.salonGroupId } },
          orderBy: { createdAt: "asc" },
          select: { id: true, email: true, ruolo: true, salon: { select: { id: true, nomeSede: true } } },
        })
      : prisma.user.findMany({
          where: { salonId: session.user.salonId },
          orderBy: { createdAt: "asc" },
          select: { id: true, email: true, ruolo: true, salon: { select: { id: true, nomeSede: true } } },
        }),
    prisma.operator.findMany({ where: { salonId: session.user.salonId }, orderBy: { ordine: "asc" } }),
    session.user.role === "OWNER" && ownerGroup?.salonGroupId
      ? prisma.salon.findMany({
          where: { salonGroupId: ownerGroup.salonGroupId },
          select: { id: true, nomeSede: true },
          orderBy: { createdAt: "asc" },
        })
      : prisma.salon.findMany({
          where: { id: session.user.salonId },
          select: { id: true, nomeSede: true },
        }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Impostazioni</h1>
      <SettingsClient initial={{ salon, tags, treatments, staff, operators, assignableSalons, role: session.user.role }} />
    </div>
  );
}

