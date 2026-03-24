import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { getAccountingScope } from "@/lib/accounting-scope";
import { AccountingScopeSwitcher } from "@/components/accounting/scope-switcher";
import { aggregateByCurrency, formatCurrencyTotals } from "@/lib/money";
import { PERIOD_PRESET_OPTIONS, resolvePeriodRange } from "@/lib/period-range";
import { redirect } from "next/navigation";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; period?: string; from?: string; to?: string }>;
}) {
  const session = await getRequiredSession();
  if (session.user.role === "STAFF") {
    redirect("/planner");
  }
  const { scope, period, from: fromRaw, to: toRaw } = await searchParams;
  const accountingScope = await getAccountingScope(session.user, scope);
  const periodRange = resolvePeriodRange({
    presetRaw: period,
    fromRaw,
    toRaw,
    defaultPreset: "this_month",
  });
  const txDateFilter = periodRange.from || periodRange.to
    ? {
        ...(periodRange.from ? { gte: periodRange.from } : {}),
        ...(periodRange.to ? { lte: periodRange.to } : {}),
      }
    : undefined;

  const [tx, appointments] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        salonId: { in: accountingScope.salonIds },
        ...(txDateFilter ? { dateTime: txDateFilter } : {}),
      },
      include: { salon: { select: { valuta: true } } },
    }),
    prisma.appointment.findMany({
      where: {
        salonId: { in: accountingScope.salonIds },
        ...(txDateFilter ? { startAt: txDateFilter } : {}),
        deletedAt: null,
      },
    }),
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

  const daysInMonth =
    periodRange.from && periodRange.to
      ? Math.max(1, Math.ceil((periodRange.to.getTime() - periodRange.from.getTime()) / (1000 * 60 * 60 * 24)))
      : 30;
  const avgDailyByCurrency: Record<string, number> = {};
  for (const [currency, value] of Object.entries(totalByCurrency)) {
    avgDailyByCurrency[currency] = value / daysInMonth;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <AccountingScopeSwitcher basePath="/dashboard" selectedScope={String(accountingScope.selectedScope)} options={accountingScope.options} extraQuery={{ period: periodRange.preset, from: periodRange.fromInput, to: periodRange.toInput }} />
      <form method="get" className="grid gap-2 rounded-2xl border border-zinc-200 bg-white p-3 md:grid-cols-[1fr_160px_160px_auto] md:items-end">
        {scope ? <input type="hidden" name="scope" value={scope} /> : null}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Periodo</label>
          <select name="period" defaultValue={periodRange.preset} className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm">
            {PERIOD_PRESET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Da</label>
          <input type="date" name="from" defaultValue={periodRange.fromInput} className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">A</label>
          <input type="date" name="to" defaultValue={periodRange.toInput} className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm" />
        </div>
        <button type="submit" className="h-10 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white">
          Applica
        </button>
      </form>
      <p className="text-sm text-zinc-600">Periodo analizzato: {periodRange.label}</p>
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

