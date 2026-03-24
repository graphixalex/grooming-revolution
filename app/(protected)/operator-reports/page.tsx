import { redirect } from "next/navigation";
import { AccountingScopeSwitcher } from "@/components/accounting/scope-switcher";
import { Card } from "@/components/ui/card";
import { getAccountingScope } from "@/lib/accounting-scope";
import { PERIOD_PRESET_OPTIONS, resolvePeriodRange } from "@/lib/period-range";
import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/session";

type OperatorMetrics = {
  operatorId: string;
  operatorName: string;
  active: boolean;
  currency: string;
  targetRevenue: number;
  targetAppointments: number;
  appointments: number;
  completed: number;
  noShow: number;
  workedMinutes: number;
  plannedMinutes: number;
  revenue: number;
  tips: number;
  workedDays: Set<string>;
};

function toHours(minutes: number) {
  return (minutes / 60).toFixed(1);
}

function toPercent(part: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

export default async function OperatorReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; period?: string; from?: string; to?: string }>;
}) {
  const session = await getRequiredSession();
  if (session.user.role !== "OWNER") {
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

  const salonDateFilter = periodRange.from || periodRange.to
    ? {
        ...(periodRange.from ? { gte: periodRange.from } : {}),
        ...(periodRange.to ? { lte: periodRange.to } : {}),
      }
    : undefined;

  const operators = await prisma.operator.findMany({
    where: { salonId: { in: accountingScope.salonIds } },
    select: {
      id: true,
      nome: true,
      attivo: true,
      kpiTargetRevenue: true,
      kpiTargetAppointments: true,
      salon: { select: { valuta: true } },
    },
    orderBy: [{ attivo: "desc" }, { nome: "asc" }],
  });

  const operatorIds = operators.map((operator) => operator.id);

  const [appointments, transactions] = operatorIds.length
    ? await Promise.all([
        prisma.appointment.findMany({
          where: {
            deletedAt: null,
            operatorId: { in: operatorIds },
            stato: { not: "CANCELLATO" },
            ...(salonDateFilter ? { startAt: salonDateFilter } : {}),
          },
          select: { operatorId: true, durataMinuti: true, stato: true, startAt: true },
        }),
        prisma.transaction.findMany({
          where: {
            salonId: { in: accountingScope.salonIds },
            ...(salonDateFilter ? { dateTime: salonDateFilter } : {}),
          },
          select: {
            grossAmount: true,
            tipAmount: true,
            appointment: { select: { operatorId: true } },
          },
        }),
      ])
    : [[], []];

  const metrics = new Map<string, OperatorMetrics>();
  for (const operator of operators) {
    metrics.set(operator.id, {
      operatorId: operator.id,
      operatorName: operator.nome,
      active: operator.attivo,
      currency: operator.salon.valuta || "EUR",
      targetRevenue: Number(operator.kpiTargetRevenue ?? 0),
      targetAppointments: Number(operator.kpiTargetAppointments ?? 0),
      appointments: 0,
      completed: 0,
      noShow: 0,
      workedMinutes: 0,
      plannedMinutes: 0,
      revenue: 0,
      tips: 0,
      workedDays: new Set<string>(),
    });
  }

  for (const appointment of appointments) {
    if (!appointment.operatorId) continue;
    const row = metrics.get(appointment.operatorId);
    if (!row) continue;

    row.appointments += 1;
    row.plannedMinutes += appointment.durataMinuti;

    if (appointment.stato === "COMPLETATO") {
      row.completed += 1;
      row.workedMinutes += appointment.durataMinuti;
      row.workedDays.add(new Date(appointment.startAt).toLocaleDateString("it-IT"));
    }
    if (appointment.stato === "NO_SHOW") {
      row.noShow += 1;
    }
  }

  for (const transaction of transactions) {
    const operatorId = transaction.appointment.operatorId;
    if (!operatorId) continue;
    const row = metrics.get(operatorId);
    if (!row) continue;
    row.revenue += Number(transaction.grossAmount);
    row.tips += Number(transaction.tipAmount);
  }

  const rows = [...metrics.values()].sort(
    (a, b) => b.revenue - a.revenue || b.workedMinutes - a.workedMinutes || a.operatorName.localeCompare(b.operatorName),
  );

  const totals = rows.reduce(
    (acc, row) => {
      acc.worked += row.workedMinutes;
      acc.planned += row.plannedMinutes;
      acc.appointments += row.appointments;
      acc.completed += row.completed;
      acc.noShow += row.noShow;
      acc.revenue += row.revenue;
      acc.tips += row.tips;
      return acc;
    },
    { worked: 0, planned: 0, appointments: 0, completed: 0, noShow: 0, revenue: 0, tips: 0 },
  );

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Report operatori</h1>
        <p className="text-sm text-zinc-600">KPI team concentrati qui: produttivita, presenze, appuntamenti, incassi e target.</p>
      </div>

      <Card className="space-y-3">
        <AccountingScopeSwitcher basePath="/operator-reports" selectedScope={String(accountingScope.selectedScope)} options={accountingScope.options} extraQuery={{ period: periodRange.preset, from: periodRange.fromInput, to: periodRange.toInput }} />
        <form method="get" className="grid gap-2 md:grid-cols-[1fr_160px_160px_auto] md:items-end">
          {scope ? <input type="hidden" name="scope" value={scope} /> : null}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Periodo</label>
            <select name="period" defaultValue={periodRange.preset} className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm">
              {PERIOD_PRESET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
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
          <button type="submit" className="h-10 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white">Applica</button>
        </form>
        <p className="text-sm text-zinc-600">Periodo analizzato: {periodRange.label}</p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Card><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Operatori in report</p><p className="mt-1 text-2xl font-semibold">{rows.length}</p></Card>
        <Card><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Ore lavorate</p><p className="mt-1 text-2xl font-semibold">{toHours(totals.worked)} h</p></Card>
        <Card><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Appuntamenti</p><p className="mt-1 text-2xl font-semibold">{totals.appointments}</p></Card>
        <Card><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Completati</p><p className="mt-1 text-2xl font-semibold">{totals.completed}</p></Card>
        <Card><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">No-show</p><p className="mt-1 text-2xl font-semibold">{totals.noShow}</p></Card>
        <Card><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Produttivita team</p><p className="mt-1 text-2xl font-semibold">{toPercent(totals.worked, totals.planned)}</p></Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Incassi operatori</p>
          <p className="mt-1 text-2xl font-semibold">EUR {totals.revenue.toFixed(2)}</p>
          <p className="text-xs text-zinc-500">Mance EUR {totals.tips.toFixed(2)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Ore pianificate</p>
          <p className="mt-1 text-2xl font-semibold">{toHours(totals.planned)} h</p>
          <p className="text-xs text-zinc-500">Periodo: {periodRange.label}</p>
        </Card>
      </div>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Ranking operatori</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-500">Nessun operatore trovato per lo scope selezionato.</p>
        ) : (
          <div className="divide-y divide-zinc-100 text-sm">
            {rows.map((row, index) => (
              <div key={row.operatorId} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700">{index + 1}</span>
                  <p className="font-semibold text-zinc-900">{row.operatorName}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${row.active ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-700"}`}>
                    {row.active ? "Attivo" : "Non attivo"}
                  </span>
                </div>
                <p className="text-zinc-600">{row.currency} {row.revenue.toFixed(2)} · {row.appointments} appunt. · No-show {toPercent(row.noShow, row.appointments)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((row) => {
          const revenueTargetPct = row.targetRevenue > 0 ? toPercent(row.revenue, row.targetRevenue) : "-";
          const appointmentsTargetPct = row.targetAppointments > 0 ? toPercent(row.appointments, row.targetAppointments) : "-";
          return (
            <Card key={row.operatorId} className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-zinc-900">{row.operatorName}</h3>
                <span className="text-xs text-zinc-500">Giorni lavorati: {row.workedDays.size}</span>
              </div>

              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p>Ore lavorate: <span className="font-semibold">{toHours(row.workedMinutes)} h</span></p>
                <p>Ore pianificate: <span className="font-semibold">{toHours(row.plannedMinutes)} h</span></p>
                <p>Produttivita: <span className="font-semibold">{toPercent(row.workedMinutes, row.plannedMinutes)}</span></p>
                <p>Appuntamenti: <span className="font-semibold">{row.appointments}</span></p>
                <p>Completati: <span className="font-semibold">{row.completed}</span></p>
                <p>No-show: <span className="font-semibold">{row.noShow}</span></p>
                <p>Incasso: <span className="font-semibold">{row.currency} {row.revenue.toFixed(2)}</span></p>
                <p>Mance: <span className="font-semibold">{row.currency} {row.tips.toFixed(2)}</span></p>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-600">
                Target fatturato: {row.targetRevenue > 0 ? `${row.currency} ${row.targetRevenue.toFixed(2)} (${revenueTargetPct})` : "non impostato"} · Target appuntamenti: {row.targetAppointments > 0 ? `${row.targetAppointments} (${appointmentsTargetPct})` : "non impostato"}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
