import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/session";
import { PricingClient } from "@/components/pricing/pricing-client";

export default async function PricingPage() {
  const session = await getRequiredSession();
  const salonId = session.user.salonId;

  const [salon, treatments, rules] = await Promise.all([
    prisma.salon.findUnique({ where: { id: salonId }, select: { valuta: true } }),
    prisma.treatment.findMany({ where: { salonId }, orderBy: { ordine: "asc" }, select: { id: true, nome: true } }),
    prisma.servicePriceRule.findMany({
      where: { salonId },
      include: { treatment: { select: { nome: true } } },
      orderBy: [{ attiva: "desc" }, { validoDa: "desc" }],
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Listino intelligente</h1>
      <PricingClient
        initialRules={rules as any[]}
        treatments={treatments}
        canEdit={session.user.role !== "STAFF"}
        currency={salon?.valuta || "EUR"}
      />
    </div>
  );
}
