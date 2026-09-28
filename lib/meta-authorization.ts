import type { UserRole } from "@prisma/client";
import { canManageSettings } from "@/lib/rbac";
import { MetaError } from "@/lib/meta-errors";
export type MetaUser = { id: string; salonId: string; ruolo: UserRole; canAccessGroupSalons: boolean; salon: { salonGroupId: string | null } };
export function assertMetaAccess(user: MetaUser | null, salonId: string, salonGroupId: string | null) {
  if (!user || !canManageSettings(user.ruolo)) throw new MetaError("meta_forbidden", 403);
  if (user.salonId === salonId) return;
  if ((user.ruolo !== "OWNER" && !user.canAccessGroupSalons) || !salonGroupId || user.salon.salonGroupId !== salonGroupId)
    throw new MetaError("meta_forbidden", 403);
}
