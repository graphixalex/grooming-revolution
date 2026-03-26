import { getRequiredSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { ProConsentActions } from "@/components/billing/pro-consent-actions";
import { redirect } from "next/navigation";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const session = await getRequiredSession();
  const params = await searchParams;
  const checkoutStatus = String(params?.checkout || "").toLowerCase();
  if (session.user.role === "STAFF") {
    redirect("/planner");
  }

  const salon = await prisma.salon.findUnique({
    where: { id: session.user.salonId },
    select: {
      id: true,
      subscriptionPlan: true,
      vatRate: true,
      billingVatNumber: true,
      billingCountry: true,
    },
  });

  let paddleSubscriptionId: string | null = null;
  try {
    const rows = await prisma.$queryRaw<Array<{ paddleSubscriptionId: string | null }>>`
      SELECT "paddleSubscriptionId"
      FROM "Salon"
      WHERE "id" = ${session.user.salonId}
      LIMIT 1
    `;
    paddleSubscriptionId = rows[0]?.paddleSubscriptionId ?? null;
  } catch {
    paddleSubscriptionId = null;
  }

  const hasPaddleSubscription = Boolean(paddleSubscriptionId);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Billing</h1>
      <Card>
        {checkoutStatus === "closed" ? (
          <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            Checkout chiuso: pagamento non completato. Nessun addebito e stato effettuato.
          </div>
        ) : null}
        {checkoutStatus === "completed" || checkoutStatus === "success" ? (
          <div className="mb-3 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
            Pagamento completato. Stiamo aggiornando lo stato abbonamento via webhook Paddle.
          </div>
        ) : null}
        <p>
          Piano attuale: <strong>{salon?.subscriptionPlan}</strong>
        </p>
        <p className="text-sm text-zinc-600">Trial: fino a 50 clienti inclusi.</p>
        <p className="text-sm text-zinc-600">Piano FULL: a partire da EUR 20,00 / mese.</p>
        <p className="text-sm text-zinc-600">
          Imposte (IVA/VAT/sales tax) calcolate automaticamente da Paddle in base a paese e località del cliente.
        </p>
        <p className="text-sm text-zinc-600">
          Pagamento automatico mensile su carta tramite Paddle, finche non disdici.
        </p>
        <p className="text-sm text-zinc-600">
          Stato addebito automatico: {hasPaddleSubscription ? "ATTIVO" : "NON ATTIVO"}
        </p>
        <p className="text-sm text-zinc-600">
          Nota: importo finale visibile in checkout Paddle prima della conferma pagamento.
        </p>
        <ProConsentActions
          currentPlan={(salon?.subscriptionPlan ?? "FREE") as "FREE" | "PRO"}
          hasPaddleSubscription={hasPaddleSubscription}
        />
      </Card>

      <Card>
        <h2 className="font-semibold">Invoice/Receipt base</h2>
        <p className="text-sm text-zinc-600">
          In MVP: storico ricevute e riepilogo fiscale dell&apos;abbonamento gestito da Paddle.
        </p>
      </Card>
    </div>
  );
}



