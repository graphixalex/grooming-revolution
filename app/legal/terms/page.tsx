import { LegalShell } from "@/components/legal/legal-shell";

export default function TermsPage() {
  return (
    <LegalShell title="Termini di Servizio" updatedAt="24 marzo 2026">
      <div className="space-y-4">
        <p>
          I presenti Termini disciplinano l&apos;uso della piattaforma SaaS Grooming Revolution da parte di professionisti della toelettatura
          e relative organizzazioni. Grooming Revolution e un prodotto software di
          <strong> Cecilia Luxury Grooming</strong>.
        </p>

        <h2 className="text-lg font-semibold">1. Oggetto del servizio</h2>
        <p>
          Il servizio include gestione agenda, clienti e cani, operatori, report, booking online, comunicazioni operative e funzioni di
          amministrazione del salone. Il Fornitore puo aggiornare il software per motivi tecnici, di sicurezza, normativi o di miglioramento prodotto.
        </p>

        <h2 className="text-lg font-semibold">2. Account, ruoli e sicurezza</h2>
        <p>
          Il Cliente e responsabile della custodia delle credenziali, della corretta assegnazione dei ruoli utente e dell&apos;uso del servizio
          da parte dei propri collaboratori. In caso di accessi non autorizzati, il Cliente deve avvisare immediatamente il supporto.
        </p>

        <h2 className="text-lg font-semibold">3. Piani, abbonamento e pagamenti</h2>
        <p>
          Il piano Free prevede limiti operativi pubblicati in app. I piani a pagamento sono in abbonamento con rinnovo periodico fino a disdetta.
        </p>
        <p>
          La gestione degli incassi del canone avviene tramite Paddle (provider di pagamento terzo). Il Cliente autorizza gli addebiti ricorrenti
          secondo il piano scelto e le condizioni mostrate nella sezione Billing.
        </p>
        <p>
          Rimborsi, cancellazioni e diritti di recesso applicabili sono gestiti in coerenza con la policy Paddle:
          <a className="underline" href="https://www.paddle.com/legal/refund-policy" target="_blank" rel="noreferrer"> https://www.paddle.com/legal/refund-policy</a>.
        </p>

        <h2 className="text-lg font-semibold">4. Uso consentito e divieti</h2>
        <p>
          E vietato usare la piattaforma per attivita illecite, invii non autorizzati, trattamenti dati contrari alla normativa, accessi abusivi,
          reverse engineering o compromissione dell&apos;integrita del servizio.
        </p>

        <h2 className="text-lg font-semibold">5. Dati personali e ruoli privacy</h2>
        <p>
          Salvo diverso accordo scritto, il salone Cliente agisce come Titolare del trattamento verso i propri clienti finali.
          Cecilia Luxury Grooming agisce come fornitore tecnico e Responsabile del trattamento.
        </p>
        <p>
          Le condizioni operative del trattamento per conto del Cliente sono disciplinate anche dal{" "}
          <a className="underline" href="/dpa">
            Data Processing Agreement (DPA)
          </a>
          .
        </p>

        <h2 className="text-lg font-semibold">6. Proprieta dei dati del Cliente</h2>
        <p>
          Tutti i dati inseriti dal Cliente nella piattaforma (anagrafiche, appuntamenti, storico operazioni, configurazioni e contenuti)
          restano di proprieta esclusiva del Cliente. Il Fornitore non acquisisce alcun diritto di proprieta su tali dati.
        </p>

        <h2 className="text-lg font-semibold">7. Portabilita ed esportazione dati</h2>
        <p>
          Il Cliente puo esportare i propri dati in formato leggibile secondo le funzionalita disponibili in piattaforma
          (ad esempio CSV o formati equivalenti), durante il rapporto contrattuale.
        </p>

        <h2 className="text-lg font-semibold">8. Cessazione servizio e cancellazione dati</h2>
        <p>
          Alla cessazione del servizio, il Cliente puo richiedere esportazione finale dei dati entro un periodo tecnico ragionevole.
          Decorso tale periodo, i dati possono essere cancellati o anonimizzati, salvo obblighi legali di conservazione.
        </p>

        <h2 className="text-lg font-semibold">9. Servizi e provider terzi</h2>
        <p>
          Alcune funzionalita dipendono da provider terzi (es. infrastruttura cloud, invio email, pagamenti, canali di messaggistica).
          Il Cliente resta responsabile dell&apos;uso conforme di tali canali e del rispetto delle policy dei singoli provider.
        </p>

        <h2 className="text-lg font-semibold">10. Disponibilita e manutenzione</h2>
        <p>
          Il Fornitore adotta misure ragionevoli per continuita e sicurezza del servizio, senza garanzia di disponibilita ininterrotta.
          Possono verificarsi sospensioni per manutenzione, aggiornamenti o cause di forza maggiore.
        </p>

        <h2 className="text-lg font-semibold">11. Proprieta intellettuale</h2>
        <p>
          Codice, interfaccia, marchio Grooming Revolution, documentazione e contenuti restano di proprieta di
          Cecilia Luxury Grooming
          o dei rispettivi titolari. Al Cliente e concessa una licenza d&apos;uso non esclusiva, non trasferibile e limitata alla durata del rapporto.
        </p>

        <h2 className="text-lg font-semibold">12. Limitazione di responsabilita</h2>
        <p>
          Nei limiti di legge, la responsabilita complessiva del Fornitore per danni diretti e limitata ai canoni corrisposti dal Cliente
          nei 12 mesi precedenti l&apos;evento. Restano esclusi, ove consentito, danni indiretti e perdita di profitto o opportunita.
        </p>

        <h2 className="text-lg font-semibold">13. Sospensione e risoluzione</h2>
        <p>
          Il Fornitore puo sospendere o risolvere l&apos;accesso in caso di violazioni rilevanti, rischio sicurezza o mancato pagamento.
          Il Cliente puo disdire secondo le modalita indicate nella sezione Billing.
        </p>

        <h2 className="text-lg font-semibold">14. Legge applicabile e foro competente</h2>
        <p>
          I presenti Termini sono regolati dal diritto svizzero, salvo norme imperative diverse. Foro competente: Svizzera,
          salva diversa inderogabile previsione di legge.
        </p>

        <h2 className="text-lg font-semibold">15. Modifiche ai Termini</h2>
        <p>
          I Termini possono essere aggiornati per esigenze tecniche, legali o organizzative. La versione vigente e sempre pubblicata
          su questa pagina con data di aggiornamento.
        </p>
      </div>
    </LegalShell>
  );
}



