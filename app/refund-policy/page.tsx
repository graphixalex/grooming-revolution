import { LegalShell } from "@/components/legal/legal-shell";

export default function RefundPolicyPage() {
  return (
    <LegalShell title="Politica di rimborso" updatedAt="24 marzo 2026">
      <div className="space-y-4">
        <p>
          La presente politica definisce le regole di rimborso applicate agli acquisti del servizio SaaS Grooming Revolution,
          erogato da <strong>Cecilia Luxury Grooming</strong>.
        </p>

        <h2 className="text-lg font-semibold">1. Provider pagamenti e policy applicabile</h2>
        <p>
          I pagamenti sono elaborati da Paddle in qualita di merchant of record. Per rimborsi, cancellazioni e diritti del consumatore
          si applica la Refund Policy ufficiale Paddle, oltre agli eventuali diritti inderogabili previsti dalla legge locale.
        </p>
        <p>
          Riferimento: <a className="underline" href="https://www.paddle.com/legal/refund-policy" target="_blank" rel="noreferrer">https://www.paddle.com/legal/refund-policy</a>.
        </p>

        <h2 className="text-lg font-semibold">2. Termine per richiesta rimborso</h2>
        <p>
          Per clienti in UE/SEE/Svizzera/Regno Unito, il termine standard per esercitare il diritto di recesso ove applicabile e di
          <strong> 14 giorni di calendario</strong> dalla data della transazione (o dal primo pagamento di abbonamento, secondo la policy Paddle).
        </p>
        <p>
          Per altri Paesi si applicano i termini specifici indicati nella policy Paddle e nelle norme locali obbligatorie.
        </p>

        <h2 className="text-lg font-semibold">3. Come richiedere il rimborso</h2>
        <p>
          La richiesta puo essere inviata tramite ricevuta Paddle (link “View receipt” o “Manage subscription”) oppure tramite supporto Paddle:
          <a className="underline" href="https://paddle.net" target="_blank" rel="noreferrer"> https://paddle.net</a>.
        </p>

        <h2 className="text-lg font-semibold">4. Cancellazione abbonamento</h2>
        <p>
          La cancellazione dell&apos;abbonamento interrompe i rinnovi futuri. Eventuali rimborsi sono valutati secondo la policy Paddle e i diritti di legge applicabili.
        </p>

        <h2 className="text-lg font-semibold">5. Supporto amministrativo</h2>
        <p>
          Per supporto amministrativo sul servizio: servizioclienti@grooming-revolution.com.
        </p>
      </div>
    </LegalShell>
  );
}


