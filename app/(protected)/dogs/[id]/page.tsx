import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/session";
import { notFound } from "next/navigation";
import { DogDetailClient } from "@/components/clients/dog-detail-client";

export default async function DogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getRequiredSession();
  const { id } = await params;

  const [payload, salon] = await Promise.all([
    (async () => {
      const dog = await prisma.dog.findFirst({
        where: { id, salonId: session.user.salonId, deletedAt: null },
        include: { cliente: true, tagRapidi: { include: { quickTag: true } } },
      });
      if (!dog) return null;

      const page = 1;
      const pageSize = 10;
      const history = await prisma.appointment.findMany({
        where: { salonId: session.user.salonId, caneId: id, deletedAt: null },
        include: { trattamentiSelezionati: { include: { treatment: true } }, transactions: true },
        orderBy: { startAt: "desc" },
        take: pageSize,
      });
      const total = await prisma.appointment.count({ where: { salonId: session.user.salonId, caneId: id, deletedAt: null } });

      return { dog, history, total, page, pageSize };
    })(),
    prisma.salon.findUnique({ where: { id: session.user.salonId } }),
  ]);

  if (!payload || !salon) return notFound();

  return <DogDetailClient payload={payload} salon={salon} />;
}

