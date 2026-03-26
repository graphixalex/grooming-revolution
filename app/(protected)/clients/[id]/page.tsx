import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/session";
import { notFound } from "next/navigation";
import { ClientDetailClient } from "@/components/clients/client-detail-client";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getRequiredSession();
  const { id } = await params;

  const [client, quickTags, paymentHistory] = await Promise.all([
    prisma.client.findFirst({
      where: { id, salonId: session.user.salonId, deletedAt: null },
      include: { dogs: { where: { deletedAt: null }, include: { tagRapidi: { include: { quickTag: true } } } } },
    }),
    prisma.quickTag.findMany({ where: { salonId: session.user.salonId }, orderBy: { ordine: "asc" } }),
    prisma.appointment.findMany({
      where: {
        salonId: session.user.salonId,
        clienteId: id,
        deletedAt: null,
        transactions: { some: {} },
      },
      include: {
        cane: true,
        transactions: {
          orderBy: { createdAt: "desc" },
        },
        trattamentiSelezionati: {
          include: { treatment: true },
        },
      },
      orderBy: { startAt: "desc" },
      take: 50,
    }),
  ]);

  if (!client) return notFound();

  return <ClientDetailClient client={client} quickTags={quickTags} paymentHistory={paymentHistory} />;
}

