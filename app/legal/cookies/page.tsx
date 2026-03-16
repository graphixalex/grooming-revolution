import { Card } from "@/components/ui/card";

export default function CookiesPage() {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <Card className="space-y-3">
        <h1 className="text-2xl font-semibold">Cookie Policy</h1>
        <p>Il servizio utilizza cookie tecnici di sessione per autenticazione e sicurezza. Non sono previsti cookie marketing in MVP.</p>
        <p className="text-sm text-zinc-500">Nota: revisione legale consigliata.</p>
      </Card>
    </main>
  );
}

