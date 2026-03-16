import { Card } from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <Card className="space-y-3">
        <h1 className="text-2xl font-semibold">Privacy Policy</h1>
        <p>Grooming Revolution tratta dati personali di clienti, cani e appuntamenti esclusivamente per finalità di gestione operativa del salone.</p>
        <p>I dati sono isolati per tenant e conservati con controlli di accesso e audit log base.</p>
        <p className="text-sm text-zinc-500">Nota: revisione legale consigliata.</p>
      </Card>
    </main>
  );
}

