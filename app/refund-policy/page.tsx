import { LegalShell } from "@/components/legal/legal-shell";

export default function RefundPolicyPage() {
  return (
    <LegalShell title="Politica di rimborso" updatedAt="24 marzo 2026">
      <div className="space-y-4">
        <p>
          La presente Politica di Rimborso disciplina i rimborsi relativi al servizio SaaS Grooming Revolution,
          fornito da <strong>Cecilia Luxury Grooming</strong>.
        </p>

        <h2 className="text-lg font-semibold">1. Ambito e riferimento pagamenti</h2>
        <p>
          I pagamenti sono gestiti tramite Paddle, che opera come merchant of record.
          Le richieste di rimborso sono valutate nel rispetto delle regole del circuito di pagamento
          e delle norme imperative applicabili al Paese del cliente.
        </p>

        <h2 className="text-lg font-semibold">2. Termine per richiedere il rimborso</h2>
        <p>
          Salvo diritti inderogabili eventualmente piu favorevoli previsti dalla legge locale,
          il cliente puo richiedere il rimborso entro <strong>14 giorni di calendario</strong> dalla data della transazione
          (o dal primo pagamento dell&apos;abbonamento, quando applicabile).
        </p>
        <p>
          Decorso tale termine, il rimborso non e normalmente previsto, salvo errori di addebito o obblighi di legge.
        </p>

        <h2 className="text-lg font-semibold">3. Casi in cui il rimborso puo essere riconosciuto</h2>
        <p>
          Il rimborso puo essere riconosciuto, a titolo esemplificativo, nei seguenti casi:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>addebito duplicato o importo errato;</li>
          <li>pagamento non autorizzato, previa verifica;</li>
          <li>casi in cui la normativa applicabile impone il rimborso.</li>
        </ul>

        <h2 className="text-lg font-semibold">4. Come richiedere il rimborso</h2>
        <p>
          La richiesta puo essere inviata tramite i link presenti nella ricevuta di pagamento
          (es. gestione acquisto/abbonamento) oppure contattando l&apos;assistenza amministrativa indicata sotto.
        </p>

        <h2 className="text-lg font-semibold">5. Cancellazione abbonamento</h2>
        <p>
          La cancellazione interrompe i rinnovi futuri. L&apos;accesso resta attivo fino alla fine del periodo gia pagato,
          salvo diversa disposizione di legge.
        </p>

        <h2 className="text-lg font-semibold">6. Supporto amministrativo</h2>
        <p>
          Per supporto amministrativo sul servizio: servizioclienti@grooming-revolution.com.
        </p>
      </div>
    </LegalShell>
  );
}


