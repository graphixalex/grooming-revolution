import { LegalShell } from "@/components/legal/legal-shell";

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updatedAt="24 marzo 2026">
      <div className="space-y-4">
        <p>
          La presente informativa descrive il trattamento dei dati personali nell&apos;uso del servizio Grooming Revolution,
          prodotto e gestito da Cecilia Luxury Grooming.
        </p>

        <h2 className="text-lg font-semibold">1. Ruoli privacy</h2>
        <p>
          Per i dati dei clienti finali inseriti dai saloni, il salone Cliente agisce di norma come Titolare del trattamento.
          Cecilia Luxury Grooming agisce come fornitore tecnico e Responsabile del trattamento per conto del Cliente.
        </p>
        <p>
          Per dettagli operativi (istruzioni, misure, sub-responsabili, assistenza ai diritti), si applica il{" "}
          <a className="underline" href="/dpa">
            Data Processing Agreement (DPA)
          </a>
          .
        </p>

        <h2 className="text-lg font-semibold">2. Categorie di dati trattati</h2>
        <p>
          Dati account utenti, dati anagrafici clienti, dati cani e preferenze, appuntamenti, dati transazionali,
          log tecnici e dati di sicurezza necessari all&apos;erogazione del servizio.
        </p>

        <h2 className="text-lg font-semibold">3. Finalita e basi giuridiche</h2>
        <p>
          Erogazione del servizio, sicurezza, supporto, prevenzione abusi, adempimenti legali e fiscali,
          miglioramento della piattaforma. Le basi giuridiche includono esecuzione contrattuale, obbligo legale,
          legittimo interesse e consenso quando richiesto.
        </p>

        <h2 className="text-lg font-semibold">4. Conservazione dei dati</h2>
        <p>
          I dati sono conservati per il tempo necessario alle finalita contrattuali e agli obblighi normativi.
          In caso di cessazione, i dati vengono cancellati o anonimizzati entro tempi tecnici ragionevoli,
          salvo obblighi legali di conservazione.
        </p>
        <p>
          Durante la durata del servizio, il Cliente puo esportare i dati disponibili tramite le funzioni di portabilita presenti in piattaforma.
        </p>

        <h2 className="text-lg font-semibold">5. Sub-responsabili e terze parti</h2>
        <p>
          Il servizio puo coinvolgere fornitori terzi qualificati (hosting, email, pagamenti, messaggistica, infrastruttura).
          Tali fornitori operano con accordi contrattuali, istruzioni documentate e misure di sicurezza adeguate.
        </p>

        <h2 className="text-lg font-semibold">6. Pagamenti abbonamento</h2>
        <p>
          Per la gestione del canone in abbonamento viene utilizzato il provider Paddle. I dati di pagamento sono trattati
          secondo le policy del provider e i rapporti contrattuali applicabili.
        </p>

        <h2 className="text-lg font-semibold">7. Trasferimenti internazionali</h2>
        <p>
          Quando necessari, eventuali trasferimenti internazionali avvengono con garanzie adeguate previste dalla normativa
          applicabile (es. clausole contrattuali standard o meccanismi equivalenti).
        </p>

        <h2 className="text-lg font-semibold">8. Sicurezza</h2>
        <p>
          Sono adottate misure tecniche e organizzative adeguate, incluse autenticazione, controllo accessi, segregazione logica,
          audit log, monitoraggio e procedure di gestione incidente.
        </p>

        <h2 className="text-lg font-semibold">9. Diritti degli interessati</h2>
        <p>
          Nei limiti di legge, gli interessati possono esercitare i diritti di accesso, rettifica, cancellazione, limitazione,
          opposizione e portabilita. Per i dati dei clienti finali, la richiesta va presentata in prima istanza al salone Titolare.
        </p>

        <h2 className="text-lg font-semibold">10. Data breach</h2>
        <p>
          In caso di violazione dei dati personali, vengono attivate procedure interne di contenimento, analisi, documentazione
          e notifica secondo la normativa applicabile.
        </p>

        <h2 className="text-lg font-semibold">11. Aggiornamenti della policy</h2>
        <p>
          Questa informativa puo essere aggiornata per esigenze tecniche, legali o organizzative. La versione aggiornata
          e sempre pubblicata su questa pagina con data di revisione.
        </p>
      </div>
    </LegalShell>
  );
}



