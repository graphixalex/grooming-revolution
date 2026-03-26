import { Card } from "@/components/ui/card";

export default function SubprocessorsPage() {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <Card className="space-y-3">
        <h1 className="text-2xl font-semibold">Subprocessors</h1>
        <p>
          Elenco sub-responsabili principali utilizzati per l&apos;erogazione del servizio. Ogni provider opera con accordi
          contrattuali e misure di sicurezza adeguate ai sensi della normativa applicabile.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700">
          <li>Vercel - hosting applicazione web e CDN.</li>
          <li>Neon - database PostgreSQL gestito.</li>
          <li>Resend - invio email transazionali.</li>
          <li>Paddle - gestione pagamenti e fatturazione come merchant of record.</li>
          <li>Meta/WhatsApp Business API (se attivata dal Cliente) - comunicazioni operative.</li>
        </ul>
        <p className="text-sm text-zinc-500">
          Per ruoli, istruzioni e gestione del trattamento conto terzi, consulta anche il{" "}
          <a className="underline" href="/dpa">
            Data Processing Agreement (DPA)
          </a>
          .
        </p>
      </Card>
    </main>
  );
}


