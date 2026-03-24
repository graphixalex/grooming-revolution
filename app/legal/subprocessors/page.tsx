import { Card } from "@/components/ui/card";

export default function SubprocessorsPage() {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <Card className="space-y-3">
        <h1 className="text-2xl font-semibold">Subprocessors</h1>
        <p>Provider infrastrutturali previsti: hosting cloud, database PostgreSQL gestito, Payrexx per billing.</p>
        <p>Ogni provider opera come sub-responsabile ai sensi della normativa applicabile.</p>
        <p className="text-sm text-zinc-500">Nota: revisione legale consigliata.</p>
      </Card>
    </main>
  );
}

