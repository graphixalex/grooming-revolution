import { LegalShell } from "@/components/legal/legal-shell";

export default function CookiesPage() {
  return (
    <LegalShell title="Cookie Policy" updatedAt="21 marzo 2026">
      <div className="space-y-4">
        <p>
          La presente Cookie Policy spiega come Grooming Revolution utilizza cookie e tecnologie simili sul sito pubblico,
          nella web app e nelle aree autenticazione. L&apos;uso della piattaforma implica presa visione della presente informativa.
        </p>

        <h2 className="text-lg font-semibold">1. Cosa sono i cookie</h2>
        <p>
          I cookie sono piccoli file di testo salvati sul dispositivo dell&apos;utente. Permettono il funzionamento tecnico del servizio,
          il mantenimento della sessione, la protezione di sicurezza e, quando previsto, funzionalità aggiuntive.
        </p>

        <h2 className="text-lg font-semibold">2. Tipologie utilizzate</h2>
        <p>
          Cookie strettamente necessari: sempre attivi, indispensabili per login, sessione, sicurezza, bilanciamento e prevenzione abusi.
          Senza questi cookie la piattaforma non può funzionare correttamente.
        </p>
        <p>
          Cookie funzionali: opzionali, usati per memorizzare preferenze non essenziali (es. lingua, impostazioni interfaccia) se abilitati.
        </p>
        <p>
          Cookie analitici: usati solo se configurati, in forma aggregata e con minimizzazione dati, per misurare performance e stabilità.
          Non sono usati per profilazione pubblicitaria del cliente finale.
        </p>

        <h2 className="text-lg font-semibold">3. Base giuridica</h2>
        <p>
          I cookie strettamente necessari sono trattati sulla base del legittimo interesse e dell&apos;esecuzione del servizio richiesto.
          Per cookie non necessari, ove richiesto dalla legge applicabile (es. UE/SEE), viene richiesto consenso preventivo.
        </p>

        <h2 className="text-lg font-semibold">4. Durata</h2>
        <p>
          Alcuni cookie sono di sessione e vengono eliminati alla chiusura del browser; altri persistono per un periodo limitato,
          proporzionato alla finalità tecnica o funzionale.
        </p>

        <h2 className="text-lg font-semibold">5. Terze parti</h2>
        <p>
          Alcune funzionalità possono coinvolgere fornitori terzi (es. infrastruttura cloud, autenticazione, pagamenti, messaggistica).
          Tali fornitori operano secondo accordi contrattuali e misure di sicurezza adeguate.
        </p>

        <h2 className="text-lg font-semibold">6. Gestione preferenze cookie</h2>
        <p>
          L&apos;utente può gestire o bloccare cookie non necessari tramite impostazioni browser o strumenti di consenso, quando presenti.
          La disattivazione dei cookie necessari può compromettere accesso e operatività della piattaforma.
        </p>

        <h2 className="text-lg font-semibold">7. Trasferimenti internazionali</h2>
        <p>
          Se i fornitori tecnici operano fuori dal paese dell&apos;utente, eventuali trasferimenti di dati avvengono con garanzie adeguate
          previste dalla normativa applicabile (es. clausole contrattuali standard o meccanismi equivalenti).
        </p>

        <h2 className="text-lg font-semibold">8. Modifiche alla Cookie Policy</h2>
        <p>
          La policy può essere aggiornata per evoluzioni tecniche, normative o organizzative. La versione più recente è sempre pubblicata
          su questa pagina con data di aggiornamento.
        </p>

        <h2 className="text-lg font-semibold">9. Contatti</h2>
        <p>
          Per richieste su cookie e tracciamenti: usa i canali ufficiali indicati nel footer e nella documentazione legale del servizio.
        </p>
      </div>
    </LegalShell>
  );
}

