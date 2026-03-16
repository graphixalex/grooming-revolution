import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/session";
import { CashClient } from "@/components/cash/cash-client";

export default async function CashPage() {
  const session = await getRequiredSession();
  const rows = await prisma.cashSession.findMany({
    where: { salonId: session.user.salonId },
    include: {
      openedBy: { select: { email: true } },
      closedBy: { select: { email: true } },
      transactions: { select: { id: true, grossAmount: true } },
    },
    orderBy: { openedAt: "desc" },
    take: 30,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Cassa giornaliera</h1>
      <CashClient initial={rows as any[]} canManage={session.user.role !== "STAFF"} />
    </div>
  );
}
