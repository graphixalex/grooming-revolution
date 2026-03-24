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
    select: { id: true, nome: true, attivo: true },
    orderBy: [{ attivo: "desc" }, { nome: "asc" }],
  });

  const operatorIds = operators.map((operator) => operator.id);

  const [appointmentsWeek, appointmentsMonth] = operatorIds.length
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
      ])
    : [[], []];

  const metrics = new Map<string, OperatorMetrics>();
  for (const operator of operators) {
    metrics.set(operator.id, {
      operatorId: operator.id,
      operatorName: operator.nome,
      active: operator.attivo,
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

  const rows = [...metrics.values()].sort(
    (a, b) => b.workedMinutesMonth - a.workedMinutesMonth || b.plannedMinutesMonth - a.plannedMinutesMonth || a.operatorName.localeCompare(b.operatorName),
  );

  const totals = rows.reduce(
    (acc, row) => {
      acc.workedWeek += row.workedMinutesWeek;
      acc.workedMonth += row.workedMinutesMonth;
      acc.plannedMonth += row.plannedMinutesMonth;
      acc.workedDaysMonth += row.workedDaysMonth.size;
      return acc;
    },
    { workedWeek: 0, workedMonth: 0, plannedMonth: 0, workedDaysMonth: 0 },
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Report operatori</h1>
      <AccountingScopeSwitcher
        basePath="/operator-reports"
        selectedScope={String(accountingScope.selectedScope)}
        options={accountingScope.options}
      />
      <p className="text-sm text-zinc-600">
        Settimana corrente: {weekFrom.toLocaleDateString("it-IT")} - {weekTo.toLocaleDateString("it-IT")} | Mese corrente: {monthFrom.toLocaleDateString("it-IT")} - {monthTo.toLocaleDateString("it-IT")}
      </p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card><p className="text-sm text-zinc-500">Operatori in report</p><p className="text-2xl font-semibold">{rows.length}</p></Card>
        <Card><p className="text-sm text-zinc-500">Ore lavorate settimana</p><p className="text-2xl font-semibold">{toHours(totals.workedWeek)} h</p></Card>
        <Card><p className="text-sm text-zinc-500">Ore lavorate mese</p><p className="text-2xl font-semibold">{toHours(totals.workedMonth)} h</p></Card>
        <Card><p className="text-sm text-zinc-500">Ore pianificate mese</p><p className="text-2xl font-semibold">{toHours(totals.plannedMonth)} h</p></Card>
        <Card><p className="text-sm text-zinc-500">Giorni lavorati mese</p><p className="text-2xl font-semibold">{totals.workedDaysMonth}</p></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {rows.length === 0 ? (
          <Card>
            <p className="text-sm text-zinc-500">Nessun operatore trovato per lo scope selezionato.</p>
          </Card>
        ) : (
          rows.map((row) => (
            <Card key={row.operatorId} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{row.operatorName}</h2>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${row.active ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-700"}`}>
                  {row.active ? "Attivo" : "Non attivo"}
                </span>
              </div>

              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p>Giorni lavorati (mese): <span className="font-semibold">{row.workedDaysMonth.size}</span></p>
                <p>Ore lavorate (settimana): <span className="font-semibold">{toHours(row.workedMinutesWeek)} h</span></p>
                <p>Ore lavorate (mese): <span className="font-semibold">{toHours(row.workedMinutesMonth)} h</span></p>
                <p>Ore pianificate (mese): <span className="font-semibold">{toHours(row.plannedMinutesMonth)} h</span></p>
                <p>Appuntamenti (settimana): <span className="font-semibold">{row.appointmentsWeek}</span></p>
                <p>Appuntamenti (mese): <span className="font-semibold">{row.appointmentsMonth}</span></p>
                <p>Completati (mese): <span className="font-semibold">{row.completedMonth}</span></p>
                <p>No-show (mese): <span className="font-semibold">{row.noShowMonth}</span></p>
              </div>

              <div className="text-xs text-zinc-500">
                Produttivita settimana: {toPercent(row.workedMinutesWeek, row.plannedMinutesWeek)} | Produttivita mese: {toPercent(row.workedMinutesMonth, row.plannedMinutesMonth)}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
