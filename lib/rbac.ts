import { UserRole } from "@prisma/client";

export function ensureOwner(role?: UserRole) {
  if (role !== UserRole.OWNER) {
    throw new Error("Azione consentita solo all'owner");
  }
}

export function canManageSettings(role?: UserRole) {
  return role === UserRole.OWNER || role === UserRole.MANAGER;
}

export function canCloseCashSession(role?: UserRole) {
  return role === UserRole.OWNER || role === UserRole.MANAGER;
}

