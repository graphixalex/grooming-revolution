import { LegalShell } from "@/components/legal/legal-shell";

export default function CookiesPage() {
  return (
    <LegalShell title="Cookie Policy" updatedAt="24 marzo 2026">
      <div className="space-y-4">
        <p>
          La presente Cookie Policy descrive come Grooming Revolution utilizza cookie e tecnologie simili
          sul sito pubblico e nella web app.
        </p>

        <h2 className="text-lg font-semibold">1. Cosa sono i cookie</h2>
        <p>
          I cookie sono file di testo salvati sul dispositivo dell&apos;utente e servono al funzionamento tecnico,
          alla sicurezza e, quando previsto, a funzioni aggiuntive.
        </p>

        <h2 className="text-lg font-semibold">2. Tipologie di cookie</h2>
        <p>
          Cookie necessari: indispensabili per autenticazione, sessione, sicurezza e stabilità del servizio.
        </p>
        <p>
          Cookie funzionali: opzionali, usati per preferenze di interfaccia quando attivati.
        </p>
        <p>
          Cookie analitici: eventualmente utilizzati in forma aggregata per analisi prestazioni,
          senza finalità di profilazione pubblicitaria dei clienti finali.
        </p>

        <h2 className="text-lg font-semibold">3. Base giuridica</h2>
        <p>
          I cookie necessari sono trattati sulla base dell&apos;esecuzione del servizio e del legittimo interesse.
          Per cookie non necessari, ove richiesto, viene raccolto consenso preventivo.
        </p>

        <h2 className="text-lg font-semibold">4. Durata</h2>
        <p>
          Alcuni cookie sono di sessione e scadono alla chiusura del browser; altri possono restare per un periodo limitato,
          proporzionato alla finalità tecnica.
        </p>

        <h2 className="text-lg font-semibold">5. Fornitori terzi</h2>
        <p>
          Alcune componenti tecniche possono coinvolgere provider terzi (es. infrastruttura, autenticazione, pagamenti,
          messaggistica), vincolati da accordi contrattuali e requisiti di sicurezza.
        </p>

        <h2 className="text-lg font-semibold">6. Gestione preferenze</h2>
        <p>
          L&apos;utente può gestire i cookie non necessari tramite browser o strumenti di consenso disponibili.
          La disattivazione dei cookie necessari può compromettere l&apos;uso della piattaforma.
        </p>

        <h2 className="text-lg font-semibold">7. Aggiornamenti</h2>
        <p>
          La policy può essere aggiornata per esigenze tecniche o normative. La versione corrente è pubblicata su questa pagina.
        </p>

        <h2 className="text-lg font-semibold">8. Contatti</h2>
        <p>
          Per richieste su cookie e tracciamenti: servizioclienti@grooming-revolution.com.
        </p>
      </div>
    </LegalShell>
  );
}

