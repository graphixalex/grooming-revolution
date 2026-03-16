import { prisma } from "@/lib/prisma";

type UserCtx = {
  salonId: string;
  role: "OWNER" | "MANAGER" | "STAFF";
};

export async function getAccountingScope(user: UserCtx, scopeParam?: string) {
  const currentSalon = await prisma.salon.findUnique({
    where: { id: user.salonId },
    select: { id: true, nomeAttivita: true, nomeSede: true, salonGroupId: true },
  });
  if (!currentSalon) {
    return {
      salonIds: [user.salonId],
      selectedScope: "single",
      options: [] as Array<{ value: string; label: string }>,
    };
  }

  if (user.role !== "OWNER" || !currentSalon.salonGroupId) {
    return {
      salonIds: [currentSalon.id],
      selectedScope: "single",
      options: [{ value: currentSalon.id, label: currentSalon.nomeSede || "Sede principale" }],
    };
  }

  const branches = await prisma.salon.findMany({
    where: { salonGroupId: currentSalon.salonGroupId },
    select: { id: true, nomeAttivita: true, nomeSede: true },
    orderBy: { createdAt: "asc" },
  });

  const branchIds = new Set(branches.map((b) => b.id));
  const isAll = scopeParam === "all";
  const selectedBranchId = typeof scopeParam === "string" && branchIds.has(scopeParam) ? scopeParam : currentSalon.id;

  return {
    salonIds: isAll ? branches.map((b) => b.id) : [selectedBranchId],
    selectedScope: isAll ? "all" : selectedBranchId,
    options: [
      { value: "all", label: "Tutte le sedi" },
      ...branches.map((b) => ({
        value: b.id,
        label: b.nomeSede || "Sede principale",
      })),
    ],
  };
}
