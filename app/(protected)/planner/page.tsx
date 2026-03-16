import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/session";
import { PlannerClient } from "@/components/planner/planner-client";
import { Prisma } from "@prisma/client";

export default async function PlannerPage() {
  const session = await getRequiredSession();
  const [treatments, salon] = await Promise.all([
    prisma.treatment.findMany({ where: { salonId: session.user.salonId }, orderBy: { ordine: "asc" } }),
    prisma.salon.findUnique({
      where: { id: session.user.salonId },
      select: { workingHoursJson: true, whatsappTemplate: true, nomeAttivita: true, nomeSede: true, indirizzo: true, salonGroupId: true },
    }),
  ]);
  const branches =
    session.user.role === "OWNER" && salon?.salonGroupId
      ? await prisma.salon.findMany({
          where: { salonGroupId: salon.salonGroupId },
          select: { id: true, nomeAttivita: true, nomeSede: true },
          orderBy: { createdAt: "asc" },
        })
      : [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Agenda</h1>
      <PlannerClient
        treatments={treatments}
        workingHoursJson={(salon?.workingHoursJson as Prisma.JsonObject | null) ?? null}
        whatsappConfig={{
          template: salon?.whatsappTemplate || null,
          nomeAttivita: salon?.nomeAttivita || "",
          indirizzoAttivita: salon?.indirizzo || "",
        }}
        branchSwitcher={
          branches.length > 1
            ? {
                currentSalonId: session.user.salonId,
                branches: branches.map((b) => ({
                  id: b.id,
                  label: b.nomeSede || "Sede principale",
                })),
              }
            : null
        }
      />
    </div>
  );
}

