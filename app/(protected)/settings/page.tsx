import { getRequiredSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const session = await getRequiredSession();
  const [salon, tags, treatments, staff] = await Promise.all([
    prisma.salon.findUnique({ where: { id: session.user.salonId } }),
    prisma.quickTag.findMany({ where: { salonId: session.user.salonId }, orderBy: { ordine: "asc" } }),
    prisma.treatment.findMany({ where: { salonId: session.user.salonId }, orderBy: { ordine: "asc" } }),
    prisma.user.findMany({ where: { salonId: session.user.salonId }, select: { id: true, email: true, ruolo: true } }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Impostazioni</h1>
      <SettingsClient initial={{ salon, tags, treatments, staff }} />
    </div>
  );
}

