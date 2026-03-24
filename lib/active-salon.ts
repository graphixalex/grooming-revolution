import { prisma } from "@/lib/prisma";

export async function resolveActiveSalonId(
  user: { salonId: string; role: "OWNER" | "MANAGER" | "STAFF"; canAccessGroupSalons?: boolean },
  requestedSalonId?: string | null,
) {
  if (!requestedSalonId || requestedSalonId === user.salonId) {
    return user.salonId;
  }

  if (user.role !== "OWNER" && !user.canAccessGroupSalons) {
    return user.salonId;
  }

  const [currentSalon, requestedSalon] = await Promise.all([
    prisma.salon.findUnique({ where: { id: user.salonId }, select: { salonGroupId: true } }),
    prisma.salon.findUnique({ where: { id: requestedSalonId }, select: { salonGroupId: true } }),
  ]);

  if (!currentSalon?.salonGroupId || !requestedSalon?.salonGroupId) {
    return user.salonId;
  }

  if (currentSalon.salonGroupId !== requestedSalon.salonGroupId) {
    return user.salonId;
  }

  return requestedSalonId;
}
