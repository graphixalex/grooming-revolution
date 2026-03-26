import { LegalShell } from "@/components/legal/legal-shell";

export default function RefundPolicyPage() {
  return (
    <LegalShell title="Politica di rimborso" updatedAt="24 marzo 2026">
      <div className="space-y-4">
        <p>
          La presente Politica di Rimborso regola in modo dettagliato le condizioni di recesso, cancellazione e rimborso per gli acquisti
          del servizio SaaS Grooming Revolution, erogato da <strong>Cecilia Luxury Grooming</strong>.
        </p>

        <h2 className="text-lg font-semibold">1. Ambito di applicazione</h2>
        <p>Questa policy si applica a:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>abbonamenti ricorrenti (mensili o annuali);</li>
          <li>eventuali transazioni una tantum legate al servizio digitale;</li>
          <li>acquisti completati tramite Paddle come merchant of record.</li>
        </ul>
        <p>
          La policy riguarda sia clienti consumatori sia clienti business, fermo restando che i diritti inderogabili del consumatore
          previsti dalla normativa locale prevalgono sempre.
        </p>

        <h2 className="text-lg font-semibold">2. Ruolo di Paddle e fonti applicabili</h2>
        <p>
          I pagamenti sono gestiti da Paddle, che processa le transazioni, emette documentazione di acquisto e gestisce la parte
          operativa del rimborso sui metodi di pagamento originali.
        </p>
        <p>
          Le richieste sono valutate in base a normativa locale applicabile, termini contrattuali dell&apos;acquisto,
          stato di utilizzo del servizio e policy del provider pagamenti.
        </p>
        <p>
          Riferimenti Paddle:{" "}
          <a className="underline" href="https://www.paddle.com/legal/refund-policy" target="_blank" rel="noreferrer">
            Refund Policy
          </a>{" "}
          e{" "}
          <a className="underline" href="https://www.paddle.com/legal/invoiced-consumer-terms" target="_blank" rel="noreferrer">
            Invoiced Consumer Terms
          </a>
          .
        </p>

        <h2 className="text-lg font-semibold">3. Regola generale sui rimborsi</h2>
        <p>
          Salvo quanto previsto dai diritti obbligatori di legge, i corrispettivi per servizi digitali già erogati o già fruiti
          non sono di norma rimborsabili. Rimangono comunque possibili rimborsi nei casi previsti dalle sezioni successive
          o quando richiesto dalla normativa.
        </p>

        <h2 className="text-lg font-semibold">4. Diritto di recesso e finestre temporali</h2>
        <p>
          Per i clienti consumatori in UE/SEE/Svizzera/Regno Unito, il periodo standard per richiedere il recesso, ove applicabile,
          è di <strong>14 giorni di calendario</strong> dalla transazione.
        </p>
        <p>Per abbonamenti:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>la finestra si applica al primo pagamento dell&apos;abbonamento;</li>
          <li>in presenza di prova gratuita, la finestra può decorrere dal primo addebito successivo alla trial;</li>
          <li>i rinnovi successivi seguono le regole previste da legge applicabile e termini di acquisto.</li>
        </ul>
        <p>
          In alcuni Paesi extra-UE possono valere finestre diverse (ad esempio 5 o 7 giorni). In caso di dubbio, viene applicato il livello
          di tutela più favorevole richiesto dalle norme obbligatorie.
        </p>

        <h2 className="text-lg font-semibold">5. Eccezioni al recesso per contenuti digitali già fruiti</h2>
        <p>
          Quando il servizio digitale e già stato attivato e utilizzato con consenso espresso all&apos;esecuzione immediata,
          il diritto di recesso può risultare limitato o non applicabile, salvo diversi obblighi di legge locale.
        </p>
        <p>
          L&apos;avvio del servizio e l&apos;uso effettivo delle funzionalità SaaS possono costituire inizio dell&apos;esecuzione del contratto
          digitale ai sensi della normativa applicabile.
        </p>

        <h2 className="text-lg font-semibold">6. Casi in cui il rimborso può essere riconosciuto</h2>
        <p>Il rimborso può essere riconosciuto, anche oltre i casi di recesso, ad esempio quando:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>si verifica addebito duplicato o importo non dovuto;</li>
          <li>e riscontrato un errore tecnico materiale che impedisce l&apos;uso del servizio in modo sostanziale;</li>
          <li>la transazione risulta non autorizzata, previa verifica documentale;</li>
          <li>la legge impone il rimborso, totale o parziale.</li>
        </ul>

        <h2 className="text-lg font-semibold">7. Come richiedere il rimborso</h2>
        <p>La richiesta può essere inoltrata con uno dei seguenti canali:</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>link “View receipt” o “Manage subscription” presenti nella ricevuta di pagamento;</li>
          <li>pagina assistenza Paddle su paddle.net con opzione di richiesta rimborso;</li>
          <li>supporto amministrativo del servizio: servizioclienti@grooming-revolution.com.</li>
        </ol>
        <p>
          Per accelerare la verifica, consigliamo di indicare: email d&apos;acquisto, data approssimativa addebito, importo, motivo della richiesta,
          ed eventuali prove del problema tecnico.
        </p>

        <h2 className="text-lg font-semibold">8. Valutazione della richiesta</h2>
        <p>
          Ogni richiesta viene valutata caso per caso. Possono essere considerati: data della transazione, tipologia di piano,
          storico utilizzo, natura della contestazione, esiti delle verifiche tecniche e diritti inderogabili applicabili.
        </p>
        <p>
          L&apos;accoglimento può essere totale, parziale oppure negato con motivazione. L&apos;eventuale rimborso discrezionale non costituisce
          un precedente vincolante per richieste future.
        </p>

        <h2 className="text-lg font-semibold">9. Tempi e modalita di accredito</h2>
        <p>
          Se approvato, il rimborso viene disposto verso lo stesso metodo di pagamento originario, quando tecnicamente possibile.
          I tempi di contabilizzazione dipendono dal circuito bancario o dal provider carta e possono richiedere diversi giorni lavorativi.
        </p>

        <h2 className="text-lg font-semibold">10. Effetti del rimborso sul servizio</h2>
        <p>
          In caso di rimborso approvato, l&apos;accesso al piano rimborsato può essere sospeso o terminato.
          Eventuali funzionalità premium vengono disattivate alla data di efficacia del rimborso.
        </p>

        <h2 className="text-lg font-semibold">11. Cancellazione abbonamento e non rinnovo</h2>
        <p>
          La cancellazione interrompe i rinnovi futuri. L&apos;accesso resta attivo fino alla fine del periodo già pagato,
          salvo diversa disposizione di legge.
        </p>
        <p>La cancellazione dell&apos;abbonamento non equivale automaticamente a rimborso per periodi già addebitati.</p>

        <h2 className="text-lg font-semibold">12. Chargeback e contestazioni bancarie</h2>
        <p>
          Prima di avviare un chargeback, raccomandiamo di aprire una richiesta diretta di supporto/rimborso.
          In caso di contestazione bancaria attiva, l&apos;accesso al servizio può essere temporaneamente limitato fino alla chiusura verifica.
        </p>

        <h2 className="text-lg font-semibold">13. Aggiornamenti della policy</h2>
        <p>
          Questa policy può essere aggiornata per esigenze operative, normative o contrattuali.
          La versione valida per ciascuna transazione e quella pubblicata al momento dell&apos;acquisto.
        </p>

        <h2 className="text-lg font-semibold">14. Contatti</h2>
        <p>
          Per supporto amministrativo o chiarimenti sulla presente policy:{" "}
          <a className="underline" href="mailto:servizioclienti@grooming-revolution.com">
            servizioclienti@grooming-revolution.com
          </a>
          .
        </p>
      </div>
    </LegalShell>
  );
}

