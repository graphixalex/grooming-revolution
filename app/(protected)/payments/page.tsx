import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/session";
import { PaymentsClient } from "@/components/settings/payments-client";
import { getAccountingScope } from "@/lib/accounting-scope";
import { AccountingScopeSwitcher } from "@/components/accounting/scope-switcher";
import { PERIOD_PRESET_OPTIONS, resolvePeriodRange } from "@/lib/period-range";
import { redirect } from "next/navigation";

export default async function PaymentsPage({
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
    defaultPreset: "all",
  });
  const txDateFilter = periodRange.from || periodRange.to
    ? {
        ...(periodRange.from ? { gte: periodRange.from } : {}),
        ...(periodRange.to ? { lte: periodRange.to } : {}),
      }
    : undefined;
  const rows = await prisma.transaction.findMany({
    where: {
      salonId: { in: accountingScope.salonIds },
      ...(txDateFilter ? { dateTime: txDateFilter } : {}),
    },
    include: { appointment: { include: { cane: true, cliente: true } }, salon: { select: { nomeAttivita: true, nomeSede: true, valuta: true } } },
    orderBy: { dateTime: "desc" },
  });

  const exportParams = new URLSearchParams();
  if (accountingScope.selectedScope) exportParams.set("scope", String(accountingScope.selectedScope));
  if (periodRange.preset) exportParams.set("period", periodRange.preset);
  if (periodRange.fromInput) exportParams.set("from", periodRange.fromInput);
  if (periodRange.toInput) exportParams.set("to", periodRange.toInput);
  const exportHref = `/api/payments/export${exportParams.toString() ? `?${exportParams.toString()}` : ""}`;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Movimenti</h1>
      <AccountingScopeSwitcher basePath="/payments" selectedScope={String(accountingScope.selectedScope)} options={accountingScope.options} extraQuery={{ period: periodRange.preset, from: periodRange.fromInput, to: periodRange.toInput }} />
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
      <PaymentsClient
        initial={rows}
        exportHref={exportHref}
        initialFrom={periodRange.fromInput}
        initialTo={periodRange.toInput}
      />
    </div>
  );
}

