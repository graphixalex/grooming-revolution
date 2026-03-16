import { Card } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <Card className="space-y-3">
        <h1 className="text-2xl font-semibold">Termini di Servizio</h1>
        <p>L&apos;utilizzo del servizio implica accettazione dei presenti termini, incluse policy su accessi, piani e limiti operativi.</p>
        <p>Il piano Free prevede massimo 100 clienti attivi per tenant.</p>
        <p className="text-sm text-zinc-500">Nota: revisione legale consigliata.</p>
      </Card>
    </main>
  );
}

