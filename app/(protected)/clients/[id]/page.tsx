import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/session";
import { notFound } from "next/navigation";
import { ClientDetailClient } from "@/components/clients/client-detail-client";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getRequiredSession();
  const { id } = await params;

  const [client, quickTags] = await Promise.all([
    prisma.client.findFirst({
      where: { id, salonId: session.user.salonId, deletedAt: null },
      include: { dogs: { where: { deletedAt: null }, include: { tagRapidi: { include: { quickTag: true } } } } },
    }),
    prisma.quickTag.findMany({ where: { salonId: session.user.salonId }, orderBy: { ordine: "asc" } }),
  ]);

  if (!client) return notFound();

  return <ClientDetailClient client={client} quickTags={quickTags} />;
}

