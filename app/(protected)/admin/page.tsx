import { subDays, startOfDay, startOfMonth, startOfYear } from "date-fns";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getRequiredSession } from "@/lib/session";
import { isPlatformAdminEmail } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

function pct(part: number, total: number) {
  if (!total) return "0.0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

function euro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function AdminPage() {
  const session = await getRequiredSession();
  if (!isPlatformAdminEmail(session.user.email)) {
    redirect("/dashboard");
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);
  const last30Start = subDays(now, 30);
  const last14Start = startOfDay(subDays(now, 13));

  const [visitsToday, visitsMonth, visitsYear, clicksMonth, clicksYear, uniqueVisitors30Rows] = await Promise.all([
    prisma.publicAnalyticsEvent.count({
      where: { eventType: "homepage_view", createdAt: { gte: todayStart } },
    }),
    prisma.publicAnalyticsEvent.count({
      where: { eventType: "homepage_view", createdAt: { gte: monthStart } },
    }),
    prisma.publicAnalyticsEvent.count({
      where: { eventType: "homepage_view", createdAt: { gte: yearStart } },
    }),
    prisma.publicAnalyticsEvent.count({
      where: { eventType: "register_click", createdAt: { gte: monthStart } },
    }),
    prisma.publicAnalyticsEvent.count({
      where: { eventType: "register_click", createdAt: { gte: yearStart } },
    }),
    prisma.publicAnalyticsEvent.findMany({
      where: { eventType: "homepage_view", createdAt: { gte: last30Start }, sessionId: { not: null } },
      select: { sessionId: true },
      distinct: ["sessionId"],
    }),
  ]);

  const [registrationsToday, registrationsMonth, registrationsYear, latestSalons] = await Promise.all([
    prisma.salon.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.salon.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.salon.count({ where: { createdAt: { gte: yearStart } } }),
    prisma.salon.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        nomeAttivita: true,
        nomeSede: true,
        email: true,
        createdAt: true,
        subscriptionPlan: true,
        paddleSubscriptionId: true,
      },
    }),
  ]);

  const [totalSalons, payingSalons, freeSalons] = await Promise.all([
    prisma.salon.count(),
    prisma.salon.count({
      where: {
        OR: [{ subscriptionPlan: "PRO" }, { paddleSubscriptionId: { not: null } }],
      },
    }),
    prisma.salon.count({
      where: {
        AND: [{ subscriptionPlan: "FREE" }, { paddleSubscriptionId: null }],
      },
    }),
  ]);

  const [revDayAgg, revMonthAgg, revYearAgg, recentPayments] = await Promise.all([
    prisma.subscriptionPayment.aggregate({
      _sum: { grossAmount: true },
      where: { paidAt: { gte: todayStart } },
    }),
    prisma.subscriptionPayment.aggregate({
      _sum: { grossAmount: true },
      where: { paidAt: { gte: monthStart } },
    }),
    prisma.subscriptionPayment.aggregate({
      _sum: { grossAmount: true },
      where: { paidAt: { gte: yearStart } },
    }),
    prisma.subscriptionPayment.findMany({
      where: { paidAt: { gte: last14Start } },
      orderBy: { paidAt: "asc" },
      select: { paidAt: true, grossAmount: true, currency: true },
    }),
  ]);

  const monthlyRecurringEstimate = payingSalons * 20;
  const annualRecurringEstimate = monthlyRecurringEstimate * 12;
  const visitsToClickRate = pct(clicksMonth, visitsMonth);
  const clickToSignupRate = pct(registrationsMonth, clicksMonth);
  const visitsToSignupRate = pct(registrationsMonth, visitsMonth);

  const revDay = Number(revDayAgg._sum.grossAmount || 0);
  const revMonth = Number(revMonthAgg._sum.grossAmount || 0);
  const revYear = Number(revYearAgg._sum.grossAmount || 0);

  const paymentsByDay = new Map<string, number>();
  for (const item of recentPayments) {
    const key = item.paidAt.toISOString().slice(0, 10);
    paymentsByDay.set(key, (paymentsByDay.get(key) || 0) + Number(item.grossAmount));
  }

  const series: Array<{ date: string; total: number }> = [];
  for (let i = 13; i >= 0; i -= 1) {
    const date = startOfDay(subDays(now, i));
    const key = date.toISOString().slice(0, 10);
    series.push({ date: key, total: paymentsByDay.get(key) || 0 });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin piattaforma</h1>
      <p className="text-sm text-zinc-600">KPI acquisizione, conversione, abbonamenti e ricavi.</p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-zinc-500">Visite homepage</p>
          <p className="text-2xl font-semibold">{visitsToday}</p>
          <p className="text-xs text-zinc-500">Oggi</p>
          <p className="mt-2 text-sm text-zinc-600">Mese: {visitsMonth} | Anno: {visitsYear}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Click su Registrati</p>
          <p className="text-2xl font-semibold">{clicksMonth}</p>
          <p className="text-xs text-zinc-500">Mese corrente</p>
          <p className="text-xs text-zinc-500">Anno: {clicksYear}</p>
          <p className="mt-2 text-sm text-zinc-600">CTR visite{"->"}click: {visitsToClickRate}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Nuove registrazioni</p>
          <p className="text-2xl font-semibold">{registrationsMonth}</p>
          <p className="text-xs text-zinc-500">Mese corrente</p>
          <p className="mt-2 text-sm text-zinc-600">
            Click{"->"}signup: {clickToSignupRate} | Visite{"->"}signup: {visitsToSignupRate}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Visitatori unici (30 gg)</p>
          <p className="text-2xl font-semibold">{uniqueVisitors30Rows.length}</p>
          <p className="text-xs text-zinc-500">Sessioni uniche con visita homepage</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-zinc-500">Clienti paganti</p>
          <p className="text-2xl font-semibold">{payingSalons}</p>
          <p className="text-sm text-zinc-600">Non paganti: {freeSalons}</p>
          <p className="text-xs text-zinc-500">Totale account: {totalSalons}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">MRR stimato (EUR 20)</p>
          <p className="text-2xl font-semibold">{euro(monthlyRecurringEstimate)}</p>
          <p className="text-xs text-zinc-500">Stima su account paganti attivi</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">ARR stimato</p>
          <p className="text-2xl font-semibold">{euro(annualRecurringEstimate)}</p>
          <p className="text-xs text-zinc-500">MRR x 12</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Incasso Paddle reale</p>
          <p className="text-2xl font-semibold">{euro(revMonth)}</p>
          <p className="text-sm text-zinc-600">Oggi: {euro(revDay)}</p>
          <p className="text-xs text-zinc-500">Anno: {euro(revYear)}</p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Nuovi account (ultimi 20)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-500">
                  <th className="py-2 pr-3">Data</th>
                  <th className="py-2 pr-3">Attività</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Piano</th>
                  <th className="py-2">Stato pagamento</th>
                </tr>
              </thead>
              <tbody>
                {latestSalons.map((s) => {
                  const paid = s.subscriptionPlan === "PRO" || Boolean(s.paddleSubscriptionId);
                  return (
                    <tr key={s.id} className="border-b border-zinc-100">
                      <td className="py-2 pr-3">{s.createdAt.toLocaleDateString("it-IT")}</td>
                      <td className="py-2 pr-3">{s.nomeAttivita}</td>
                      <td className="py-2 pr-3">{s.email || "-"}</td>
                      <td className="py-2 pr-3">{s.subscriptionPlan}</td>
                      <td className="py-2">
                        {paid ? <span className="text-emerald-700">Pagante</span> : <span className="text-zinc-500">Non pagante</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Registrazioni: oggi {registrationsToday}, mese {registrationsMonth}, anno {registrationsYear}
          </p>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold">Incassi abbonamenti (ultimi 14 giorni)</h2>
          <div className="space-y-2">
            {series.map((row) => (
              <div key={row.date} className="flex items-center justify-between rounded-md border border-zinc-100 px-3 py-2 text-sm">
                <span>{row.date}</span>
                <span className="font-medium">{euro(row.total)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
