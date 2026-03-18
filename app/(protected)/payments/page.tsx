import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/session";
import { PaymentsClient } from "@/components/settings/payments-client";
import { getAccountingScope } from "@/lib/accounting-scope";
import { AccountingScopeSwitcher } from "@/components/accounting/scope-switcher";
import { redirect } from "next/navigation";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const session = await getRequiredSession();
  if (session.user.role === "STAFF") {
    redirect("/planner");
  }
  const { scope } = await searchParams;
  const accountingScope = await getAccountingScope(session.user, scope);
  const rows = await prisma.transaction.findMany({
    where: { salonId: { in: accountingScope.salonIds } },
    include: { appointment: { include: { cane: true, cliente: true } }, salon: { select: { nomeAttivita: true, nomeSede: true, valuta: true } } },
    orderBy: { dateTime: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Movimenti</h1>
      <AccountingScopeSwitcher basePath="/payments" selectedScope={String(accountingScope.selectedScope)} options={accountingScope.options} />
      <PaymentsClient initial={rows} exportHref={`/api/payments/export${accountingScope.selectedScope ? `?scope=${encodeURIComponent(String(accountingScope.selectedScope))}` : ""}`} />
    </div>
  );
}

