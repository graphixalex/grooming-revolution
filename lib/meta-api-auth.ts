import { requireApiSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { assertMetaAccess } from "@/lib/meta-authorization";
import { MetaError } from "@/lib/meta-errors";
export async function requireMetaScope() {
  const auth = await requireApiSession();
  if ("error" in auth) throw new MetaError("meta_unauthorized", 401);
  const { id: userId, salonId } = auth.session.user;
  const [user, salon] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, salonId: true, ruolo: true, canAccessGroupSalons: true, salon: { select: { salonGroupId: true } } } }),
    prisma.salon.findUnique({ where: { id: salonId }, select: { salonGroupId: true } }),
  ]);
  if (!salon) throw new MetaError("meta_forbidden", 403);
  assertMetaAccess(user, salonId, salon.salonGroupId);
  return { userId, salonId };
}
