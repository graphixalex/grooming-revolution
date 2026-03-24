import { prisma } from "@/lib/prisma";

export const INTERNAL_NOTE_PHONE = "__NOTE__";

export type CampaignAudienceSegment =
  | "ALL_RECENT"
  | "RETURN_MAX_5_WEEKS"
  | "RETURN_MAX_8_WEEKS"
  | "RETURN_MAX_12_WEEKS"
  | "INACTIVE_OVER_12_WEEKS";

export type ClientFrequencyProfile = {
  client: {
    id: string;
    nome: string;
    cognome: string;
    telefono: string;
    salonId: string;
    createdAt: Date;
  };
  lastCompletedAt: Date | null;
  avgIntervalDays: number | null;
  intervalsCount: number;
};

function daysBetween(a: Date, b: Date) {
  return (a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

export function classifyFrequencyBucket(
  profile: ClientFrequencyProfile,
  now = new Date(),
): Exclude<CampaignAudienceSegment, "ALL_RECENT"> | null {
  if (!profile.lastCompletedAt) return null;
  const daysSinceLast = daysBetween(now, profile.lastCompletedAt);
  if (daysSinceLast > 84) return "INACTIVE_OVER_12_WEEKS";
  if (profile.avgIntervalDays == null) return null;
  if (profile.avgIntervalDays <= 35) return "RETURN_MAX_5_WEEKS";
  if (profile.avgIntervalDays <= 56) return "RETURN_MAX_8_WEEKS";
  if (profile.avgIntervalDays <= 84) return "RETURN_MAX_12_WEEKS";
  return null;
}

export async function buildClientFrequencyProfiles(params: {
  salonIds: string[];
  marketingOnly: boolean;
}) {
  if (!params.salonIds.length) return [] as ClientFrequencyProfile[];

  const clients = await prisma.client.findMany({
    where: {
      salonId: { in: params.salonIds },
      deletedAt: null,
      telefono: { not: INTERNAL_NOTE_PHONE },
      ...(params.marketingOnly ? { consensoPromemoria: true } : {}),
    },
    select: {
      id: true,
      nome: true,
      cognome: true,
      telefono: true,
      salonId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!clients.length) return [] as ClientFrequencyProfile[];

  const appointments = await prisma.appointment.findMany({
    where: {
      salonId: { in: params.salonIds },
      clienteId: { in: clients.map((c) => c.id) },
      deletedAt: null,
      stato: "COMPLETATO",
    },
    select: {
      clienteId: true,
      startAt: true,
    },
    orderBy: { startAt: "asc" },
  });

  const visitsByClient = new Map<string, Date[]>();
  for (const row of appointments) {
    const current = visitsByClient.get(row.clienteId) ?? [];
    current.push(new Date(row.startAt));
    visitsByClient.set(row.clienteId, current);
  }

  return clients.map((client) => {
    const visits = visitsByClient.get(client.id) ?? [];
    const lastCompletedAt = visits.length ? visits[visits.length - 1] : null;
    let avgIntervalDays: number | null = null;
    let intervalsCount = 0;
    if (visits.length >= 2) {
      let total = 0;
      for (let i = 1; i < visits.length; i += 1) {
        total += daysBetween(visits[i], visits[i - 1]);
      }
      intervalsCount = visits.length - 1;
      avgIntervalDays = total / intervalsCount;
    }
    return {
      client,
      lastCompletedAt,
      avgIntervalDays,
      intervalsCount,
    };
  });
}

export async function listCampaignAudienceRecipients(params: {
  salonId: string;
  type: "MARKETING" | "SERVICE";
  segment: CampaignAudienceSegment;
  monthsBack: number;
}) {
  if (params.segment === "ALL_RECENT") {
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - params.monthsBack);
    return prisma.client.findMany({
      where: {
        salonId: params.salonId,
        deletedAt: null,
        createdAt: { gte: fromDate },
        telefono: { not: INTERNAL_NOTE_PHONE },
        ...(params.type === "MARKETING" ? { consensoPromemoria: true } : {}),
      },
      select: { id: true, nome: true, cognome: true, telefono: true },
      orderBy: { createdAt: "desc" },
    });
  }

  const profiles = await buildClientFrequencyProfiles({
    salonIds: [params.salonId],
    marketingOnly: params.type === "MARKETING",
  });

  return profiles
    .filter((p) => classifyFrequencyBucket(p) === params.segment)
    .sort((a, b) => {
      const aTime = a.lastCompletedAt?.getTime() ?? 0;
      const bTime = b.lastCompletedAt?.getTime() ?? 0;
      return bTime - aTime;
    })
    .map((p) => ({
      id: p.client.id,
      nome: p.client.nome,
      cognome: p.client.cognome,
      telefono: p.client.telefono,
    }));
}
