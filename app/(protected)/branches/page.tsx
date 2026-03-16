import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/session";
import { BranchesClient } from "@/components/branches/branches-client";

export default async function BranchesPage() {
  const session = await getRequiredSession();
  const salon = await prisma.salon.findUnique({
    where: { id: session.user.salonId },
    select: { id: true, nomeAttivita: true, nomeSede: true, indirizzo: true, paese: true, valuta: true, timezone: true, salonGroupId: true },
  });

  const rows = salon?.salonGroupId
    ? await prisma.salon.findMany({
        where: { salonGroupId: salon.salonGroupId },
        select: {
          id: true,
          nomeAttivita: true,
          nomeSede: true,
          indirizzo: true,
          paese: true,
          valuta: true,
          timezone: true,
        },
        orderBy: { createdAt: "asc" },
      })
    : salon
      ? [
          {
            id: salon.id,
            nomeAttivita: salon.nomeAttivita,
            nomeSede: salon.nomeSede,
            indirizzo: salon.indirizzo,
            paese: salon.paese,
            valuta: salon.valuta,
            timezone: salon.timezone,
          },
        ]
      : [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Multi-sede</h1>
      <BranchesClient initial={rows as any[]} canCreate={session.user.role === "OWNER"} currentSalonId={session.user.salonId} />
    </div>
  );
}
