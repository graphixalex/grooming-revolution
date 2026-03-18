import { startOfMonth, endOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { getAccountingScope } from "@/lib/accounting-scope";
import { AccountingScopeSwitcher } from "@/components/accounting/scope-switcher";
import { aggregateByCurrency, formatCurrencyTotals } from "@/lib/money";
import { redirect } from "next/navigation";

export default async function DashboardPage({
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

  const from = startOfMonth(new Date());
  const to = endOfMonth(new Date());

  const [tx, appointments] = await Promise.all([
    prisma.transaction.findMany({
      where: { salonId: { in: accountingScope.salonIds }, dateTime: { gte: from, lte: to } },
      include: { salon: { select: { valuta: true } } },
    }),
    prisma.appointment.findMany({ where: { salonId: { in: accountingScope.salonIds }, startAt: { gte: from, lte: to }, deletedAt: null } }),
  ]);

  const totalByCurrency = aggregateByCurrency(tx, (t: any) => t.salon.valuta, (t: any) => Number(t.grossAmount));
  const totalPosByCurrency = aggregateByCurrency(
    (tx as any[]).filter((t: any) => t.method === "POS"),
    (t: any) => t.salon.valuta,
    (t: any) => Number(t.grossAmount),
  );
  const totalCashByCurrency = aggregateByCurrency(
    (tx as any[]).filter((t: any) => t.method === "CASH"),
    (t: any) => t.salon.valuta,
    (t: any) => Number(t.grossAmount),
  );
  const totalTipsByCurrency = aggregateByCurrency(tx, (t: any) => t.salon.valuta, (t: any) => Number(t.tipAmount));

  const completed = (appointments as any[]).filter((a: any) => a.stato === "COMPLETATO");
  const productiveHours = completed.reduce((sum: number, a: any) => sum + a.durataMinuti, 0) / 60;
  const appointmentRows = appointments as any[];
  const prenotatiCount = appointmentRows.filter((a: any) => a.stato === "PRENOTATO").length;
  const completatiCount = appointmentRows.filter((a: any) => a.stato === "COMPLETATO").length;
  const noShowCount = appointmentRows.filter((a: any) => a.stato === "NO_SHOW").length;
  const cancellatiCount = appointmentRows.filter((a: any) => a.stato === "CANCELLATO").length;

  const daysInMonth = new Date(to.getFullYear(), to.getMonth() + 1, 0).getDate();
  const avgDailyByCurrency: Record<string, number> = {};
  for (const [currency, value] of Object.entries(totalByCurrency)) {
    avgDailyByCurrency[currency] = value / daysInMonth;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <AccountingScopeSwitcher basePath="/dashboard" selectedScope={String(accountingScope.selectedScope)} options={accountingScope.options} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card><p className="text-sm text-zinc-500">Entrate totali</p><p className="text-2xl font-semibold">{formatCurrencyTotals(totalByCurrency)}</p></Card>
        <Card><p className="text-sm text-zinc-500">Split POS / Contanti</p><p className="text-2xl font-semibold">{formatCurrencyTotals(totalPosByCurrency)} / {formatCurrencyTotals(totalCashByCurrency)}</p></Card>
        <Card><p className="text-sm text-zinc-500">Mance totali</p><p className="text-2xl font-semibold">{formatCurrencyTotals(totalTipsByCurrency)}</p></Card>
        <Card><p className="text-sm text-zinc-500">Media giornaliera</p><p className="text-2xl font-semibold">{formatCurrencyTotals(avgDailyByCurrency)}</p></Card>
        <Card><p className="text-sm text-zinc-500">Ore produttive</p><p className="text-2xl font-semibold">{productiveHours.toFixed(1)} h</p></Card>
      </div>
      <Card>
        <h2 className="mb-2 text-lg font-semibold">Appuntamenti mese corrente</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <p>Prenotati: {prenotatiCount}</p>
          <p>Completati: {completatiCount}</p>
          <p>No-show: {noShowCount}</p>
          <p>Cancellati: {cancellatiCount}</p>
        </div>
      </Card>
    </div>
  );
}

