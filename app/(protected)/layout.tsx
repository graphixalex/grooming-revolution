import { Sidebar } from "@/components/layout/sidebar";
import { LogoutButton } from "@/components/layout/logout-button";
import { SalonSwitcher } from "@/components/layout/salon-switcher";
import { getRequiredSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getRequiredSession();
  const currentSalon = await prisma.salon.findUnique({
    where: { id: session.user.salonId },
    select: { salonGroupId: true, nomeAttivita: true, nomeSede: true },
  });
  const switcherOptions =
    (session.user.role === "OWNER" || session.user.canAccessGroupSalons) && currentSalon?.salonGroupId
      ? await prisma.salon.findMany({
          where: { salonGroupId: currentSalon.salonGroupId },
          select: { id: true, nomeAttivita: true, nomeSede: true },
          orderBy: { createdAt: "asc" },
        })
      : [];

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar role={session.user.role} />
      <main className="min-w-0 flex-1 p-3 md:p-6">
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white/95 p-3 shadow-[0_6px_18px_rgba(0,0,0,0.04)] md:mb-6 md:flex-row md:items-center md:justify-between md:p-4">
          <div>
            <p className="text-sm text-zinc-500">{session.user.role}</p>
            <p className="break-all font-medium">{session.user.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {switcherOptions.length > 1 ? (
              <SalonSwitcher
                currentSalonId={session.user.salonId}
                options={switcherOptions.map((s) => ({
                  id: s.id,
                  label: s.nomeSede || "Sede principale",
                }))}
              />
            ) : null}
            <LogoutButton />
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

