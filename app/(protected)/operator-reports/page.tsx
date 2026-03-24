import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { redirect } from "next/navigation";
import { AccountingScopeSwitcher } from "@/components/accounting/scope-switcher";
import { Card } from "@/components/ui/card";
import { getAccountingScope } from "@/lib/accounting-scope";
import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/session";

type OperatorMetrics = {
  operatorId: string;
  operatorName: string;
  active: boolean;
  currency: string;
  targetRevenue: number;
  targetAppointments: number;
  appointmentsWeek: number;
  appointmentsMonth: number;
  completedWeek: number;
  completedMonth: number;
  noShowWeek: number;
  noShowMonth: number;
  workedMinutesWeek: number;
  workedMinutesMonth: number;
  plannedMinutesWeek: number;
  plannedMinutesMonth: number;
  revenueMonth: number;
  tipsMonth: number;
  workedDaysMonth: Set<string>;
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
  searchParams: Promise<{ scope?: string }>;
}) {
  const session = await getRequiredSession();
  if (session.user.role !== "OWNER") {
    redirect("/planner");
  }

  const { scope } = await searchParams;
  const accountingScope = await getAccountingScope(session.user, scope);

  const now = new Date();
  const weekFrom = startOfWeek(now, { weekStartsOn: 1 });
  const weekTo = endOfWeek(now, { weekStartsOn: 1 });
  const monthFrom = startOfMonth(now);
  const monthTo = endOfMonth(now);

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

  const [appointmentsWeek, appointmentsMonth, monthTransactions] = operatorIds.length
    ? await Promise.all([
        prisma.appointment.findMany({
          where: {
            deletedAt: null,
            operatorId: { in: operatorIds },
            startAt: { gte: weekFrom, lte: weekTo },
            stato: { not: "CANCELLATO" },
          },
          select: { operatorId: true, durataMinuti: true, stato: true, startAt: true },
        }),
        prisma.appointment.findMany({
          where: {
            deletedAt: null,
            operatorId: { in: operatorIds },
            startAt: { gte: monthFrom, lte: monthTo },
            stato: { not: "CANCELLATO" },
          },
          select: { operatorId: true, durataMinuti: true, stato: true, startAt: true },
        }),
        prisma.transaction.findMany({
          where: {
            salonId: { in: accountingScope.salonIds },
            dateTime: { gte: monthFrom, lte: monthTo },
          },
          select: {
            grossAmount: true,
            tipAmount: true,
            appointment: { select: { operatorId: true } },
          },
        }),
      ])
    : [[], [], []];

  const metrics = new Map<string, OperatorMetrics>();
  for (const operator of operators) {
    metrics.set(operator.id, {
      operatorId: operator.id,
      operatorName: operator.nome,
      active: operator.attivo,
      currency: operator.salon.valuta || "EUR",
      targetRevenue: Number(operator.kpiTargetRevenue ?? 0),
      targetAppointments: Number(operator.kpiTargetAppointments ?? 0),
      appointmentsWeek: 0,
      appointmentsMonth: 0,
      completedWeek: 0,
      completedMonth: 0,
      noShowWeek: 0,
      noShowMonth: 0,
      workedMinutesWeek: 0,
      workedMinutesMonth: 0,
      plannedMinutesWeek: 0,
      plannedMinutesMonth: 0,
      revenueMonth: 0,
      tipsMonth: 0,
      workedDaysMonth: new Set<string>(),
    });
  }

  for (const appointment of appointmentsWeek) {
    if (!appointment.operatorId) continue;
    const row = metrics.get(appointment.operatorId);
    if (!row) continue;

    row.appointmentsWeek += 1;
    row.plannedMinutesWeek += appointment.durataMinuti;

    if (appointment.stato === "COMPLETATO") {
      row.completedWeek += 1;
      row.workedMinutesWeek += appointment.durataMinuti;
    }
    if (appointment.stato === "NO_SHOW") {
      row.noShowWeek += 1;
    }
  }

  for (const appointment of appointmentsMonth) {
    if (!appointment.operatorId) continue;
    const row = metrics.get(appointment.operatorId);
    if (!row) continue;

    row.appointmentsMonth += 1;
    row.plannedMinutesMonth += appointment.durataMinuti;

    if (appointment.stato === "COMPLETATO") {
      row.completedMonth += 1;
      row.workedMinutesMonth += appointment.durataMinuti;
      row.workedDaysMonth.add(new Date(appointment.startAt).toLocaleDateString("it-IT"));
    }
    if (appointment.stato === "NO_SHOW") {
      row.noShowMonth += 1;
    }
  }

  for (const transaction of monthTransactions) {
    const operatorId = transaction.appointment.operatorId;
    if (!operatorId) continue;
    const row = metrics.get(operatorId);
    if (!row) continue;
    row.revenueMonth += Number(transaction.grossAmount);
    row.tipsMonth += Number(transaction.tipAmount);
  }

  const rows = [...metrics.values()].sort(
    (a, b) => b.revenueMonth - a.revenueMonth || b.workedMinutesMonth - a.workedMinutesMonth || a.operatorName.localeCompare(b.operatorName),
  );

  const totals = rows.reduce(
    (acc, row) => {
      acc.workedWeek += row.workedMinutesWeek;
      acc.workedMonth += row.workedMinutesMonth;
      acc.plannedMonth += row.plannedMinutesMonth;
      acc.appointmentsMonth += row.appointmentsMonth;
      acc.completedMonth += row.completedMonth;
      acc.noShowMonth += row.noShowMonth;
      acc.revenueMonth += row.revenueMonth;
      acc.tipsMonth += row.tipsMonth;
      return acc;
    },
    {
      workedWeek: 0,
      workedMonth: 0,
      plannedMonth: 0,
      appointmentsMonth: 0,
      completedMonth: 0,
      noShowMonth: 0,
      revenueMonth: 0,
      tipsMonth: 0,
    },
  );

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Report operatori</h1>
        <p className="text-sm text-zinc-600">
          Tutti i KPI team concentrati qui: produttivita, presenze, appuntamenti, incassi e target.
        </p>
      </div>

      <Card className="space-y-3">
        <AccountingScopeSwitcher
          basePath="/operator-reports"
          selectedScope={String(accountingScope.selectedScope)}
          options={accountingScope.options}
        />
        <p className="text-sm text-zinc-600">
          Settimana corrente: {weekFrom.toLocaleDateString("it-IT")} - {weekTo.toLocaleDateString("it-IT")} | Mese corrente: {monthFrom.toLocaleDateString("it-IT")} - {monthTo.toLocaleDateString("it-IT")}
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Card><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Operatori in report</p><p className="mt-1 text-2xl font-semibold">{rows.length}</p></Card>
        <Card><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Ore lavorate settimana</p><p className="mt-1 text-2xl font-semibold">{toHours(totals.workedWeek)} h</p></Card>
        <Card><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Ore lavorate mese</p><p className="mt-1 text-2xl font-semibold">{toHours(totals.workedMonth)} h</p></Card>
        <Card><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Appuntamenti mese</p><p className="mt-1 text-2xl font-semibold">{totals.appointmentsMonth}</p></Card>
        <Card><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Completati mese</p><p className="mt-1 text-2xl font-semibold">{totals.completedMonth}</p></Card>
        <Card><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">No-show mese</p><p className="mt-1 text-2xl font-semibold">{totals.noShowMonth}</p></Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Incassi operatori (mese)</p>
          <p className="mt-1 text-2xl font-semibold">EUR {totals.revenueMonth.toFixed(2)}</p>
          <p className="text-xs text-zinc-500">Mance EUR {totals.tipsMonth.toFixed(2)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Produttivita team (mese)</p>
          <p className="mt-1 text-2xl font-semibold">{toPercent(totals.workedMonth, totals.plannedMonth)}</p>
          <p className="text-xs text-zinc-500">Ore pianificate {toHours(totals.plannedMonth)} h</p>
        </Card>
      </div>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Ranking operatori (mese)</h2>
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
                <p className="text-zinc-600">
                  {row.currency} {row.revenueMonth.toFixed(2)} · {row.appointmentsMonth} appunt. · No-show {toPercent(row.noShowMonth, row.appointmentsMonth)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((row) => {
          const revenueTargetPct = row.targetRevenue > 0 ? toPercent(row.revenueMonth, row.targetRevenue) : "-";
          const appointmentsTargetPct = row.targetAppointments > 0 ? toPercent(row.appointmentsMonth, row.targetAppointments) : "-";
          return (
            <Card key={row.operatorId} className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-zinc-900">{row.operatorName}</h3>
                <span className="text-xs text-zinc-500">Giorni lavorati mese: {row.workedDaysMonth.size}</span>
              </div>

              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p>Ore lavorate settimana: <span className="font-semibold">{toHours(row.workedMinutesWeek)} h</span></p>
                <p>Ore lavorate mese: <span className="font-semibold">{toHours(row.workedMinutesMonth)} h</span></p>
                <p>Ore pianificate mese: <span className="font-semibold">{toHours(row.plannedMinutesMonth)} h</span></p>
                <p>Produttivita mese: <span className="font-semibold">{toPercent(row.workedMinutesMonth, row.plannedMinutesMonth)}</span></p>
                <p>Appuntamenti settimana: <span className="font-semibold">{row.appointmentsWeek}</span></p>
                <p>Appuntamenti mese: <span className="font-semibold">{row.appointmentsMonth}</span></p>
                <p>Completati mese: <span className="font-semibold">{row.completedMonth}</span></p>
                <p>No-show mese: <span className="font-semibold">{row.noShowMonth}</span></p>
                <p>Incasso mese: <span className="font-semibold">{row.currency} {row.revenueMonth.toFixed(2)}</span></p>
                <p>Mance mese: <span className="font-semibold">{row.currency} {row.tipsMonth.toFixed(2)}</span></p>
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

