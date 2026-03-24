import { LegalShell } from "@/components/legal/legal-shell";

export default function RefundPolicyPage() {
  return (
    <LegalShell title="Politica di rimborso" updatedAt="24 marzo 2026">
      <div className="space-y-4">
        <p>
          La presente politica definisce le regole di rimborso per gli abbonamenti al servizio SaaS Grooming Revolution,
          gestito da Cecilia Luxury Grooming.
        </p>

        <h2 className="text-lg font-semibold">1. Natura del servizio</h2>
        <p>
          Grooming Revolution e un servizio software digitale in abbonamento con accesso continuo alla piattaforma durante il periodo pagato.
        </p>

        <h2 className="text-lg font-semibold">2. Canoni gia fatturati</h2>
        <p>
          Salvo obblighi di legge inderogabili, i canoni gia fatturati e relativi a periodi gia iniziati non sono rimborsabili.
        </p>

        <h2 className="text-lg font-semibold">3. Disdetta abbonamento</h2>
        <p>
          La disdetta interrompe i rinnovi futuri. L&apos;accesso al servizio resta disponibile fino alla fine del periodo gia pagato.
        </p>

        <h2 className="text-lg font-semibold">4. Errori di addebito</h2>
        <p>
          In caso di addebito duplicato o errato verificato, il Cliente ha diritto a correzione e rimborso dell&apos;importo non dovuto.
        </p>

        <h2 className="text-lg font-semibold">5. Provider pagamenti</h2>
        <p>
          I pagamenti sono elaborati tramite Paddle. Le contestazioni di pagamento possono essere gestite anche secondo i termini del provider.
        </p>

        <h2 className="text-lg font-semibold">6. Richieste rimborso</h2>
        <p>
          Per richieste amministrative o verifica addebiti contatta: servizioclienti@grooming-revolution.com.
        </p>
      </div>
    </LegalShell>
  );
}
