import { getRequiredSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export default async function BillingPage() {
  const session = await getRequiredSession();
  if (session.user.role === "STAFF") {
    redirect("/planner");
  }
  const salon = await prisma.salon.findUnique({ where: { id: session.user.salonId } });
  const monthlyNet = 20;
  const vatPercent = Number(salon?.vatRate ?? 22);
  const monthlyGross = monthlyNet * (1 + vatPercent / 100);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Billing</h1>
      <Card>
        <p>Piano attuale: <strong>{salon?.subscriptionPlan}</strong></p>
        <p className="text-sm text-zinc-600">Trial: fino a 100 clienti inclusi.</p>
        <p className="text-sm text-zinc-600">Piano FULL: EUR 20,00 / mese + IVA ({vatPercent}%).</p>
        <p className="text-sm text-zinc-600">Totale indicativo mensile: EUR {monthlyGross.toFixed(2)} IVA inclusa.</p>
        <p className="text-sm text-zinc-600">Pagamento automatico mensile su carta tramite Stripe, finche non disdici.</p>
        <p className="text-sm text-zinc-600">
          Stato addebito automatico: {salon?.stripeSubscriptionId ? "ATTIVO" : "NON ATTIVO"}
        </p>
        <p className="text-sm text-zinc-600">VAT: {salon?.billingVatNumber || "non impostata"} - Paese: {salon?.billingCountry || "-"}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Button className="h-auto whitespace-normal py-3 text-center leading-tight">
            Attiva FULL (addebito automatico)
          </Button>
          <Button variant="outline" className="h-auto whitespace-normal py-3 text-center leading-tight">
            Gestisci o annulla abbonamento
          </Button>
        </div>
      </Card>
      <Card>
        <h2 className="font-semibold">Invoice/Receipt base</h2>
        <p className="text-sm text-zinc-600">In MVP: riepilogo fiscale per transazione con VAT inclusa e dati attività.</p>
      </Card>
    </div>
  );
}

