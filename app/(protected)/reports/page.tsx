import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { redirect } from "next/navigation";
import { AccountingScopeSwitcher } from "@/components/accounting/scope-switcher";
import { Card } from "@/components/ui/card";
import { buildClientFrequencyProfiles, classifyFrequencyBucket } from "@/lib/client-frequency";
import { getAccountingScope } from "@/lib/accounting-scope";
import { aggregateByCurrency, formatCurrencyTotals } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/session";

type RevenueBySalon = {
  salonId: string;
  name: string;
  total: number;
  currency: string;
  appointments: number;
  noShowRate: number;
};

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
  const salonIds = accountingScope.salonIds;

  const salonsInScope = await prisma.salon.findMany({
    where: { id: { in: salonIds } },
    select: { id: true, nomeSede: true, valuta: true },
  });

  const [appointments, transactions, clients, appointmentTreatments] = await Promise.all([
    prisma.appointment.findMany({
      where: { salonId: { in: salonIds }, startAt: { gte: from, lte: to }, deletedAt: null },
      include: { cliente: { select: { id: true } } },
    }),
    prisma.transaction.findMany({
      where: { salonId: { in: salonIds }, dateTime: { gte: from, lte: to } },
      include: {
        appointment: { select: { id: true, salonId: true, startAt: true, clienteId: true } },
      },
    }),
    prisma.client.findMany({
      where: { salonId: { in: salonIds }, deletedAt: null },
      select: { id: true },
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
  ]);

  const currencyBySalon = new Map(salonsInScope.map((s) => [s.id, s.valuta || "EUR"]));
  const totalRevenue = aggregateByCurrency(transactions, (t) => currencyBySalon.get(t.salonId) ?? "EUR", (t) => Number(t.grossAmount));
  const totalTips = aggregateByCurrency(transactions, (t) => currencyBySalon.get(t.salonId) ?? "EUR", (t) => Number(t.tipAmount));

  const noShowRate = appointments.length
    ? (appointments.filter((a) => a.stato === "NO_SHOW").length / appointments.length) * 100
    : 0;

  const appointmentsByClient = new Map<string, number>();
  const appointmentsDatesByClient = new Map<string, Date[]>();
  for (const appointment of appointments) {
    appointmentsByClient.set(appointment.clienteId, (appointmentsByClient.get(appointment.clienteId) ?? 0) + 1);
    const current = appointmentsDatesByClient.get(appointment.clienteId) ?? [];
    current.push(new Date(appointment.startAt));
    appointmentsDatesByClient.set(appointment.clienteId, current);
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
    ? visitIntervalsInDays.reduce((sum, value) => sum + value, 0) / visitIntervalsInDays.length
    : 0;

  const clientsWithPayments = new Set<string>();
  const revenueByClient: Record<string, number> = {};
  for (const transaction of transactions) {
    const clientId = transaction.appointment.clienteId;
    if (!clientId) continue;
    clientsWithPayments.add(clientId);
    revenueByClient[clientId] = (revenueByClient[clientId] ?? 0) + Number(transaction.grossAmount);
  }
  const avgSpendPerPayingClient = clientsWithPayments.size
    ? Object.values(revenueByClient).reduce((sum, value) => sum + value, 0) / clientsWithPayments.size
    : 0;

  const txByAppointment = new Map<string, number>();
  for (const transaction of transactions) {
    txByAppointment.set(
      transaction.appointmentId,
      (txByAppointment.get(transaction.appointmentId) ?? 0) + Number(transaction.grossAmount),
    );
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
    .slice(0, 8);
  const topService = topServices[0] ?? null;

  const revenueByWeekday = new Map<number, number>();
  const revenueByHour = new Map<number, number>();
  for (const transaction of transactions) {
    const startAt = new Date(transaction.appointment.startAt);
    revenueByWeekday.set(startAt.getDay(), (revenueByWeekday.get(startAt.getDay()) ?? 0) + Number(transaction.grossAmount));
    revenueByHour.set(startAt.getHours(), (revenueByHour.get(startAt.getHours()) ?? 0) + Number(transaction.grossAmount));
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
  const apptToClient = new Map(apptById.map((appointment) => [appointment.id, appointment.clienteId]));

  const ltvClientAgg = new Map<string, Record<string, number>>();
  for (const row of ltvByClient) {
    const clientId = apptToClient.get(row.appointmentId);
    if (!clientId) continue;
    const appt = apptById.find((appointment) => appointment.id === row.appointmentId);
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
      avgLtvByCurrency[currency] /= ltvClientAgg.size;
    }
  }

  const compareBySalon: RevenueBySalon[] = salonsInScope.map((salon) => {
    const salonAppointments = appointments.filter((appointment) => appointment.salonId === salon.id);
    const salonTransactions = transactions.filter((transaction) => transaction.salonId === salon.id);
    const salonRevenue = salonTransactions.reduce((sum, transaction) => sum + Number(transaction.grossAmount), 0);
    const salonNoShow = salonAppointments.length
      ? (salonAppointments.filter((appointment) => appointment.stato === "NO_SHOW").length / salonAppointments.length) * 100
      : 0;

    return {
      salonId: salon.id,
      name: salon.nomeSede || "Sede principale",
      total: salonRevenue,
      currency: salon.valuta || "EUR",
      appointments: salonAppointments.length,
      noShowRate: salonNoShow,
    };
  });

  const frequencyProfiles = await buildClientFrequencyProfiles({
    salonIds,
    marketingOnly: false,
  });

  const frequencyBuckets: Record<
    "RETURN_MAX_5_WEEKS" | "RETURN_MAX_8_WEEKS" | "RETURN_MAX_12_WEEKS" | "INACTIVE_OVER_12_WEEKS",
    typeof frequencyProfiles
  > = {
    RETURN_MAX_5_WEEKS: [],
    RETURN_MAX_8_WEEKS: [],
    RETURN_MAX_12_WEEKS: [],
    INACTIVE_OVER_12_WEEKS: [],
  };

  for (const profile of frequencyProfiles) {
    const bucket = classifyFrequencyBucket(profile);
    if (!bucket) continue;
    frequencyBuckets[bucket].push(profile);
  }

  for (const key of Object.keys(frequencyBuckets) as Array<keyof typeof frequencyBuckets>) {
    frequencyBuckets[key].sort((a, b) => {
      const aTime = a.lastCompletedAt?.getTime() ?? 0;
      const bTime = b.lastCompletedAt?.getTime() ?? 0;
      return bTime - aTime;
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Report avanzati</h1>
        <p className="text-sm text-zinc-600">
          Panoramica business e clienti. Tutte le metriche operatori sono disponibili in <strong>Report operatori</strong>.
        </p>
      </div>

      <Card className="space-y-3">
        <AccountingScopeSwitcher basePath="/reports" selectedScope={String(accountingScope.selectedScope)} options={accountingScope.options} />
        <p className="text-sm text-zinc-600">
          Periodo analizzato: ultimi 3 mesi (da {from.toLocaleDateString("it-IT")} a {to.toLocaleDateString("it-IT")})
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Fatturato periodo</p><p className="mt-1 text-2xl font-semibold">{formatCurrencyTotals(totalRevenue)}</p></Card>
        <Card><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Scontrino medio cliente</p><p className="mt-1 text-2xl font-semibold">EUR {avgSpendPerPayingClient.toFixed(2)}</p></Card>
        <Card><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Frequenza visite</p><p className="mt-1 text-2xl font-semibold">{avgVisitsPerClient.toFixed(1)} visite/cliente</p><p className="text-xs text-zinc-500">{avgDaysBetweenVisits ? `Intervallo medio ${avgDaysBetweenVisits.toFixed(1)} giorni` : "Servono almeno 2 visite per cliente"}</p></Card>
        <Card><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Servizio top</p><p className="mt-1 text-2xl font-semibold">{topService?.name || "-"}</p><p className="text-xs text-zinc-500">{topService ? `${topService.count} esecuzioni` : "Nessun dato"}</p></Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">LTV medio cliente</p><p className="mt-1 text-2xl font-semibold">{formatCurrencyTotals(avgLtvByCurrency)}</p></Card>
        <Card><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Tasso ritorno clienti</p><p className="mt-1 text-2xl font-semibold">{returnRate.toFixed(1)}%</p></Card>
        <Card><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">No-show rate</p><p className="mt-1 text-2xl font-semibold">{noShowRate.toFixed(1)}%</p></Card>
        <Card><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Mance periodo</p><p className="mt-1 text-2xl font-semibold">{formatCurrencyTotals(totalTips)}</p></Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Giorno piu profittevole</p>
          <p className="mt-1 text-2xl font-semibold">{bestWeekdayEntry ? WEEKDAY_LABELS[bestWeekdayEntry[0]] : "-"}</p>
          <p className="text-xs text-zinc-500">{bestWeekdayEntry ? `Importo aggregato EUR ${bestWeekdayEntry[1].toFixed(2)}` : "Nessun incasso nel periodo"}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Ora piu profittevole</p>
          <p className="mt-1 text-2xl font-semibold">{bestHourEntry ? `${String(bestHourEntry[0]).padStart(2, "0")}:00` : "-"}</p>
          <p className="text-xs text-zinc-500">{bestHourEntry ? `Importo aggregato EUR ${bestHourEntry[1].toFixed(2)}` : "Nessun incasso nel periodo"}</p>
        </Card>
      </div>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Top servizi</h2>
        {topServices.length === 0 ? (
          <p className="text-sm text-zinc-500">Nessun dato servizi nel periodo.</p>
        ) : (
          <div className="divide-y divide-zinc-100 text-sm">
            {topServices.map((service) => (
              <div key={service.name} className="flex items-center justify-between gap-3 py-2">
                <p className="font-medium text-zinc-800">{service.name}</p>
                <p className="text-zinc-600">{service.count} appuntamenti · EUR {service.revenue.toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Confronto sedi</h2>
        <p className="text-sm text-zinc-600">
          Sedi analizzate: {salonsInScope.length}. Clienti attivi nel gruppo: {clients.length}
        </p>
        <div className="divide-y divide-zinc-100 text-sm">
          {compareBySalon.map((row) => (
            <div key={row.salonId} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <p className="font-medium text-zinc-800">{row.name}</p>
              <p className="text-zinc-600">
                {row.currency} {row.total.toFixed(2)} · Appuntamenti {row.appointments} · No-show {row.noShowRate.toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Frequenza ritorno clienti</h2>
        <p className="text-sm text-zinc-600">
          Segmentazione su appuntamenti completati: rientro 5/8/12 settimane e clienti assenti da oltre 12 settimane.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-medium text-emerald-800">Ritorno entro 5 settimane</p>
            <p className="text-2xl font-semibold text-emerald-900">{frequencyBuckets.RETURN_MAX_5_WEEKS.length}</p>
          </div>
          <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3">
            <p className="text-xs font-medium text-cyan-800">Ritorno 5-8 settimane</p>
            <p className="text-2xl font-semibold text-cyan-900">{frequencyBuckets.RETURN_MAX_8_WEEKS.length}</p>
          </div>
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
            <p className="text-xs font-medium text-violet-800">Ritorno 8-12 settimane</p>
            <p className="text-2xl font-semibold text-violet-900">{frequencyBuckets.RETURN_MAX_12_WEEKS.length}</p>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
            <p className="text-xs font-medium text-rose-800">Assenti oltre 12 settimane</p>
            <p className="text-2xl font-semibold text-rose-900">{frequencyBuckets.INACTIVE_OVER_12_WEEKS.length}</p>
          </div>
        </div>

        {(
          [
            ["RETURN_MAX_5_WEEKS", "Clienti entro 5 settimane"],
            ["RETURN_MAX_8_WEEKS", "Clienti 5-8 settimane"],
            ["RETURN_MAX_12_WEEKS", "Clienti 8-12 settimane"],
            ["INACTIVE_OVER_12_WEEKS", "Clienti assenti oltre 12 settimane"],
          ] as const
        ).map(([key, label]) => (
          <details key={key} className="rounded-md border border-zinc-200 bg-white p-3">
            <summary className="cursor-pointer text-sm font-semibold text-zinc-900">
              {label}: {frequencyBuckets[key].length}
            </summary>
            <div className="mt-2 space-y-1 text-sm">
              {frequencyBuckets[key].length === 0 ? (
                <p className="text-zinc-500">Nessun cliente in questo segmento.</p>
              ) : (
                frequencyBuckets[key].map((row) => (
                  <p key={row.client.id}>
                    {row.client.nome} {row.client.cognome} - {row.client.telefono} - ultima visita{" "}
                    {row.lastCompletedAt ? new Date(row.lastCompletedAt).toLocaleDateString("it-IT") : "n/d"}
                  </p>
                ))
              )}
            </div>
          </details>
        ))}
      </Card>
    </div>
  );
}

