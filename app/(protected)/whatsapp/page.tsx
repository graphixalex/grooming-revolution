import { redirect } from "next/navigation";
import { getRequiredSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { WhatsAppClient } from "@/components/whatsapp/whatsapp-client";

export default async function WhatsAppPage() {
  const session = await getRequiredSession();
  if (session.user.role === "STAFF") {
    redirect("/planner");
  }

  const salon = await prisma.salon.findUnique({
    where: { id: session.user.salonId },
    select: {
      id: true,
      whatsappTemplate: true,
      whatsappApiEnabled: true,
      whatsappApiPhoneNumberId: true,
      whatsappApiVersion: true,
    },
  });

  const initialSalon = {
    ...(salon || {}),
    whatsappApiAccessToken: "",
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">WhatsApp</h1>
      <p className="text-sm text-zinc-600">
        Gestisca in un unico punto template promemoria, API Meta e campagne WhatsApp.
      </p>
      <WhatsAppClient initialSalon={initialSalon} />
    </div>
  );
}
