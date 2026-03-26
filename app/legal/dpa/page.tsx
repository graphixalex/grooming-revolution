import { LegalShell } from "@/components/legal/legal-shell";

export default function DpaPage() {
  return (
    <LegalShell title="Data Processing Agreement (DPA)" updatedAt="26 marzo 2026">
      <div className="space-y-4">
        <p>
          Il presente Data Processing Agreement disciplina il trattamento dei dati personali effettuato da Cecilia Luxury Grooming
          (Fornitore) per conto del Cliente che utilizza Grooming Revolution.
        </p>

        <h2 className="text-lg font-semibold">1. Ruoli delle parti</h2>
        <p>
          Il Cliente agisce come Titolare del trattamento per i dati dei propri clienti finali e collaboratori.
          Il Fornitore agisce come Responsabile del trattamento ai sensi della normativa applicabile.
        </p>

        <h2 className="text-lg font-semibold">2. Oggetto e finalità del trattamento</h2>
        <p>
          Il trattamento è limitato all&apos;erogazione del servizio SaaS, alla sicurezza, al supporto tecnico,
          alla manutenzione, al monitoraggio operativo e agli adempimenti legali collegati al servizio.
        </p>

        <h2 className="text-lg font-semibold">3. Categorie di dati e interessati</h2>
        <p>
          Dati account utenti del Cliente, dati anagrafici e di contatto dei clienti finali, dati pet, appuntamenti,
          dati operativi e log tecnici di sicurezza.
        </p>

        <h2 className="text-lg font-semibold">4. Istruzioni documentate del Cliente</h2>
        <p>
          Il Fornitore tratta i dati esclusivamente secondo le istruzioni documentate del Cliente, come risultanti da contratto,
          configurazioni attive in piattaforma e richieste supporto formalizzate.
        </p>

        <h2 className="text-lg font-semibold">5. Misure tecniche e organizzative</h2>
        <p>
          Il Fornitore adotta misure adeguate in rapporto ai rischi: autenticazione e controllo accessi,
          segregazione logica dei tenant, logging e monitoraggio, backup e procedure di gestione incidenti.
        </p>

        <h2 className="text-lg font-semibold">6. Sub-responsabili</h2>
        <p>
          Il Fornitore può avvalersi di sub-responsabili qualificati per infrastruttura, email, pagamenti e servizi tecnici.
          L&apos;elenco aggiornato e disponibile nella pagina{" "}
          <a className="underline" href="/legal/subprocessors">
            Subprocessors
          </a>
          .
        </p>

        <h2 className="text-lg font-semibold">7. Trasferimenti internazionali</h2>
        <p>
          Se necessari, i trasferimenti internazionali avvengono con garanzie adeguate previste dalla normativa applicabile,
          incluse clausole contrattuali standard o meccanismi equivalenti.
        </p>

        <h2 className="text-lg font-semibold">8. Assistenza ai diritti degli interessati</h2>
        <p>
          Il Fornitore assiste il Cliente, per quanto ragionevolmente possibile, nella gestione di richieste di accesso, rettifica,
          cancellazione, limitazione, opposizione e portabilità.
        </p>

        <h2 className="text-lg font-semibold">9. Data breach</h2>
        <p>
          In caso di violazione dei dati personali, il Fornitore attiva le procedure di contenimento e analisi e,
          quando applicabile, informa il Cliente senza ingiustificato ritardo con informazioni utili alla gestione dell&apos;evento.
        </p>

        <h2 className="text-lg font-semibold">10. Restituzione e cancellazione dati</h2>
        <p>
          Alla cessazione del servizio, il Cliente può richiedere esportazione dei dati disponibili entro un periodo tecnico ragionevole.
          Trascorso tale periodo, i dati possono essere cancellati o anonimizzati, salvo obblighi legali di conservazione.
        </p>

        <h2 className="text-lg font-semibold">11. Audit e verifiche</h2>
        <p>
          Il Cliente può richiedere informazioni ragionevoli sulle misure di sicurezza applicate.
          Eventuali audit specifici sono soggetti a pianificazione, riservatezza e limiti tecnici/organizzativi.
        </p>

        <h2 className="text-lg font-semibold">12. Prevalenza e aggiornamenti</h2>
        <p>
          Questo DPA integra Termini di Servizio e Privacy Policy. In caso di conflitto sui temi privacy,
          prevalgono le disposizioni del DPA per il trattamento conto terzi.
        </p>
      </div>
    </LegalShell>
  );
}


