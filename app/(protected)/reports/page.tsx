import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { getAccountingScope } from "@/lib/accounting-scope";
import { AccountingScopeSwitcher } from "@/components/accounting/scope-switcher";
import { aggregateByCurrency, formatCurrencyTotals } from "@/lib/money";
import { redirect } from "next/navigation";

type RevenueBySalon = { salonId: string; name: string; total: number; currency: string; appointments: number; noShowRate: number };

const WEEKDAY_LABELS = ["Domenica", "Lunedi", "Martedi", "Mercoledi", "Giovedi", "Venerdi", "Sabato"];

export default async function ReportsPage({
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
  const from = startOfMonth(subMonths(new Date(), 2));
  const to = endOfMonth(new Date());
  const salonsInScope = await prisma.salon.findMany({
    where: { id: { in: accountingScope.salonIds } },
    select: { id: true, nomeAttivita: true, nomeSede: true, valuta: true },
  });
  const salonIds = accountingScope.salonIds;

  const [appointments, transactions, clients, appointmentTreatments, operators] = await Promise.all([
    prisma.appointment.findMany({
      where: { salonId: { in: salonIds }, startAt: { gte: from, lte: to }, deletedAt: null },
      include: { cliente: { select: { id: true } }, operator: { select: { id: true, nome: true } } },
    }),
    prisma.transaction.findMany({
      where: { salonId: { in: salonIds }, dateTime: { gte: from, lte: to } },
      include: {
        appointment: { select: { id: true, salonId: true, createdById: true, operatorId: true, startAt: true, clienteId: true } },
        createdBy: { select: { email: true } },
      },
    }),
    prisma.client.findMany({
      where: { salonId: { in: salonIds }, deletedAt: null },
      select: { id: true, salonId: true },
    }),
    prisma.appointmentTreatment.findMany({
      where: {
        appointment: {
          salonId: { in: salonIds },
          startAt: { gte: from, lte: to },
          deletedAt: null,
        },
      },
      include: { treatment: { select: { nome: true } }, appointment: { select: { id: true } } },
    }),
    prisma.operator.findMany({
      where: { salonId: { in: salonIds } },
      select: { id: true, nome: true, kpiTargetRevenue: true, kpiTargetAppointments: true, salonId: true },
    }),
  ]);

  const currencyBySalon = new Map(salonsInScope.map((s) => [s.id, s.valuta || "EUR"]));
  const totalRevenue = aggregateByCurrency(transactions, (t) => currencyBySalon.get(t.salonId) ?? "EUR", (t) => Number(t.grossAmount));
  const totalTips = aggregateByCurrency(transactions, (t) => currencyBySalon.get(t.salonId) ?? "EUR", (t) => Number(t.tipAmount));
  const noShowRate = appointments.length ? (appointments.filter((a) => a.stato === "NO_SHOW").length / appointments.length) * 100 : 0;

  const appointmentsByClient = new Map<string, number>();
  const appointmentsDatesByClient = new Map<string, Date[]>();
  for (const a of appointments) {
    appointmentsByClient.set(a.clienteId, (appointmentsByClient.get(a.clienteId) ?? 0) + 1);
    const current = appointmentsDatesByClient.get(a.clienteId) ?? [];
    current.push(new Date(a.startAt));
    appointmentsDatesByClient.set(a.clienteId, current);
  }
  const returningClients = [...appointmentsByClient.values()].filter((count) => count >= 2).length;
  const returnRate = appointmentsByClient.size ? (returningClients / appointmentsByClient.size) * 100 : 0;
  const avgVisitsPerClient = appointmentsByClient.size ? appointments.length / appointmentsByClient.size : 0;

  const visitIntervalsInDays: number[] = [];
  for (const dates of appointmentsDatesByClient.values()) {
    if (dates.length < 2) continue;
    const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
    for (let i = 1; i < sorted.length; i += 1) {
      const deltaMs = sorted[i].getTime() - sorted[i - 1].getTime();
      visitIntervalsInDays.push(deltaMs / (1000 * 60 * 60 * 24));
    }
  }
  const avgDaysBetweenVisits = visitIntervalsInDays.length
    ? visitIntervalsInDays.reduce((sum, v) => sum + v, 0) / visitIntervalsInDays.length
    : 0;

  const clientsWithPayments = new Set<string>();
  const revenueByClient: Record<string, number> = {};
  for (const t of transactions) {
    const clientId = t.appointment.clienteId;
    if (!clientId) continue;
    clientsWithPayments.add(clientId);
    revenueByClient[clientId] = (revenueByClient[clientId] ?? 0) + Number(t.grossAmount);
  }
  const avgSpendPerPayingClient = clientsWithPayments.size
    ? Object.values(revenueByClient).reduce((sum, v) => sum + v, 0) / clientsWithPayments.size
    : 0;

  const txByAppointment = new Map<string, number>();
  for (const t of transactions) {
    txByAppointment.set(t.appointmentId, (txByAppointment.get(t.appointmentId) ?? 0) + Number(t.grossAmount));
  }

  const serviceAgg = new Map<string, { count: number; revenue: number }>();
  for (const row of appointmentTreatments) {
    const revenue = txByAppointment.get(row.appointmentId) ?? 0;
    const key = row.treatment.nome;
    const item = serviceAgg.get(key) ?? { count: 0, revenue: 0 };
    item.count += 1;
    item.revenue += revenue;
    serviceAgg.set(key, item);
  }
  const topServices = [...serviceAgg.entries()]
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const topService = topServices[0] ?? null;

  const staffAgg = new Map<string, number>();
  for (const t of transactions) {
    const key = t.createdBy.email;
    staffAgg.set(key, (staffAgg.get(key) ?? 0) + Number(t.grossAmount));
  }
  const topStaff = [...staffAgg.entries()]
    .map(([email, revenue]) => ({ email, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const operatorAgg = new Map<
    string,
    { name: string; revenue: number; tips: number; appointments: number; noShow: number; currency: string; targetRevenue: number; targetAppointments: number }
  >();
  for (const op of operators) {
    operatorAgg.set(op.id, {
      name: op.nome,
      revenue: 0,
      tips: 0,
      appointments: 0,
      noShow: 0,
      currency: currencyBySalon.get(op.salonId) ?? "EUR",
      targetRevenue: Number(op.kpiTargetRevenue ?? 0),
      targetAppointments: Number(op.kpiTargetAppointments ?? 0),
    });
  }
  for (const a of appointments) {
    if (!a.operator?.id) continue;
    const row = operatorAgg.get(a.operator.id);
    if (!row) continue;
    row.appointments += 1;
    if (a.stato === "NO_SHOW") row.noShow += 1;
  }
  for (const t of transactions) {
    const operatorId = t.appointment.operatorId;
    if (!operatorId) continue;
    const row = operatorAgg.get(operatorId);
    if (!row) continue;
    row.revenue += Number(t.grossAmount);
    row.tips += Number(t.tipAmount);
  }
  const operatorRows = [...operatorAgg.entries()].map(([id, row]) => ({
    id,
    ...row,
    noShowRate: row.appointments ? (row.noShow / row.appointments) * 100 : 0,
    targetRevenuePct: row.targetRevenue > 0 ? (row.revenue / row.targetRevenue) * 100 : null,
    targetAppointmentsPct: row.targetAppointments > 0 ? (row.appointments / row.targetAppointments) * 100 : null,
  }));
  const topOperator = [...operatorRows]
    .sort((a, b) => b.revenue - a.revenue || b.appointments - a.appointments)[0] ?? null;

  const revenueByWeekday = new Map<number, number>();
  const revenueByHour = new Map<number, number>();
  for (const t of transactions) {
    const startAt = new Date(t.appointment.startAt);
    const weekday = startAt.getDay();
    const hour = startAt.getHours();
    revenueByWeekday.set(weekday, (revenueByWeekday.get(weekday) ?? 0) + Number(t.grossAmount));
    revenueByHour.set(hour, (revenueByHour.get(hour) ?? 0) + Number(t.grossAmount));
  }
  const bestWeekdayEntry = [...revenueByWeekday.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  const bestHourEntry = [...revenueByHour.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

  const ltvByClient = await prisma.transaction.groupBy({
    by: ["appointmentId"],
    where: { salonId: { in: salonIds } },
    _sum: { grossAmount: true },
  });
  const apptById = await prisma.appointment.findMany({
    where: { id: { in: ltvByClient.map((x) => x.appointmentId) } },
    select: { id: true, clienteId: true, salonId: true },
  });
  const apptToClient = new Map(apptById.map((a) => [a.id, a.clienteId]));
  const ltvClientAgg = new Map<string, Record<string, number>>();
  for (const row of ltvByClient) {
    const clientId = apptToClient.get(row.appointmentId);
    if (!clientId) continue;
    const appt = apptById.find((a) => a.id === row.appointmentId);
    const currency = currencyBySalon.get(appt?.salonId || "") ?? "EUR";
    const existing = ltvClientAgg.get(clientId) ?? {};
    existing[currency] = (existing[currency] ?? 0) + Number(row._sum.grossAmount ?? 0);
    ltvClientAgg.set(clientId, existing);
  }
  const avgLtvByCurrency: Record<string, number> = {};
  for (const row of ltvClientAgg.values()) {
    for (const [currency, value] of Object.entries(row)) {
      avgLtvByCurrency[currency] = (avgLtvByCurrency[currency] ?? 0) + value;
    }
  }
  if (ltvClientAgg.size > 0) {
    for (const currency of Object.keys(avgLtvByCurrency)) {
      avgLtvByCurrency[currency] = avgLtvByCurrency[currency] / ltvClientAgg.size;
    }
  }

  const compareBySalon: RevenueBySalon[] = salonsInScope.map((s) => {
    const salonAppts = appointments.filter((a) => a.salonId === s.id);
    const salonTx = transactions.filter((t) => t.salonId === s.id);
    const salonRevenue = salonTx.reduce((sum, t) => sum + Number(t.grossAmount), 0);
    const salonNoShow = salonAppts.length ? (salonAppts.filter((a) => a.stato === "NO_SHOW").length / salonAppts.length) * 100 : 0;
    return {
      salonId: s.id,
      name: s.nomeSede || "Sede principale",
      total: salonRevenue,
      currency: s.valuta || "EUR",
      appointments: salonAppts.length,
      noShowRate: salonNoShow,
    };
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Report avanzati</h1>
      <AccountingScopeSwitcher basePath="/reports" selectedScope={String(accountingScope.selectedScope)} options={accountingScope.options} />
      <p className="text-sm text-zinc-600">Periodo analizzato: ultimi 3 mesi (da {from.toLocaleDateString("it-IT")} a {to.toLocaleDateString("it-IT")})</p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card><p className="text-sm text-zinc-500">Fatturato periodo</p><p className="text-2xl font-semibold">{formatCurrencyTotals(totalRevenue)}</p></Card>
        <Card><p className="text-sm text-zinc-500">Cliente medio quanto spende</p><p className="text-2xl font-semibold">EUR {avgSpendPerPayingClient.toFixed(2)}</p></Card>
        <Card><p className="text-sm text-zinc-500">Frequenza visite</p><p className="text-2xl font-semibold">{avgVisitsPerClient.toFixed(1)} visite/cliente</p><p className="text-xs text-zinc-500">{avgDaysBetweenVisits ? `Intervallo medio ${avgDaysBetweenVisits.toFixed(1)} giorni` : "Servono almeno 2 visite per cliente"}</p></Card>
        <Card><p className="text-sm text-zinc-500">Servizio piu richiesto</p><p className="text-2xl font-semibold">{topService ? topService.name : "-"}</p><p className="text-xs text-zinc-500">{topService ? `${topService.count} esecuzioni` : "Nessun dato"}</p></Card>
        <Card><p className="text-sm text-zinc-500">Operatore piu performante</p><p className="text-2xl font-semibold">{topOperator ? topOperator.name : "-"}</p><p className="text-xs text-zinc-500">{topOperator ? `EUR ${topOperator.revenue.toFixed(2)} | ${topOperator.appointments} appuntamenti` : "Nessun dato"}</p></Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="text-sm text-zinc-500">Giorno piu profittevole</p>
          <p className="text-2xl font-semibold">{bestWeekdayEntry ? WEEKDAY_LABELS[bestWeekdayEntry[0]] : "-"}</p>
          <p className="text-xs text-zinc-500">{bestWeekdayEntry ? `Importo aggregato EUR ${bestWeekdayEntry[1].toFixed(2)}` : "Nessun incasso nel periodo"}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Ora piu profittevole</p>
          <p className="text-2xl font-semibold">{bestHourEntry ? `${String(bestHourEntry[0]).padStart(2, "0")}:00` : "-"}</p>
          <p className="text-xs text-zinc-500">{bestHourEntry ? `Importo aggregato EUR ${bestHourEntry[1].toFixed(2)}` : "Nessun incasso nel periodo"}</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><p className="text-sm text-zinc-500">LTV medio cliente</p><p className="text-2xl font-semibold">{formatCurrencyTotals(avgLtvByCurrency)}</p></Card>
        <Card><p className="text-sm text-zinc-500">Tasso ritorno clienti</p><p className="text-2xl font-semibold">{returnRate.toFixed(1)}%</p></Card>
        <Card><p className="text-sm text-zinc-500">No-show rate</p><p className="text-2xl font-semibold">{noShowRate.toFixed(1)}%</p></Card>
        <Card><p className="text-sm text-zinc-500">Mance periodo</p><p className="text-2xl font-semibold">{formatCurrencyTotals(totalTips)}</p></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-semibold">Top servizi</h2>
          <div className="space-y-2 text-sm">
            {topServices.map((s) => (
              <p key={s.name}>
                {s.name}: {s.count} appuntamenti - importo aggregato {s.revenue.toFixed(2)}
              </p>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="mb-2 font-semibold">Top staff per fatturato</h2>
          <div className="space-y-2 text-sm">
            {topStaff.map((s) => (
              <p key={s.email}>
                {s.email}: importo aggregato {s.revenue.toFixed(2)}
              </p>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-2 font-semibold">Confronto sedi</h2>
        <p className="mb-2 text-sm text-zinc-600">
          Sedi analizzate: {salonsInScope.length}. Clienti attivi nel gruppo: {clients.length}
        </p>
        <div className="space-y-2 text-sm">
          {compareBySalon.map((row) => (
            <p key={row.salonId}>
              {row.name}: {row.currency} {row.total.toFixed(2)} | Appuntamenti {row.appointments} | No-show {row.noShowRate.toFixed(1)}%
            </p>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">KPI operatori</h2>
        <div className="space-y-2 text-sm">
          {operatorRows.length === 0 ? (
            <p className="text-zinc-500">Nessun operatore configurato.</p>
          ) : (
            operatorRows.map((row) => (
              <p key={row.id}>
                {row.name}: {row.currency} {row.revenue.toFixed(2)} ({row.targetRevenuePct ? `${row.targetRevenuePct.toFixed(0)}% target` : "target non impostato"}) | Appuntamenti {row.appointments} ({row.targetAppointmentsPct ? `${row.targetAppointmentsPct.toFixed(0)}% target` : "target non impostato"}) | No-show {row.noShowRate.toFixed(1)}% | Mance {row.tips.toFixed(2)}
              </p>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
