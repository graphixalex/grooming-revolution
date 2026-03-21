import { Card } from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <Card className="space-y-4">
        <h1 className="text-2xl font-semibold">Privacy Policy</h1>
        <p>Ultimo aggiornamento: 21 marzo 2026.</p>
        <p>
          La presente informativa descrive come Grooming Revolution tratta i dati personali in qualità di fornitore software.
          Per i dati caricati dai saloni (clienti finali, animali, appuntamenti), il salone opera normalmente come Titolare del trattamento.
        </p>

        <h2 className="text-lg font-semibold">1. Quadro normativo</h2>
        <p>
          Il trattamento è svolto nel rispetto della normativa applicabile, incluse GDPR (UE/SEE), LPD/FADP Svizzera e, ove pertinenti,
          altre norme locali in materia di protezione dei dati.
        </p>

        <h2 className="text-lg font-semibold">2. Categorie di dati trattati</h2>
        <p>
          Dati account (email, password hash, ruoli), dati salone, dati clienti finali, recapiti telefonici, dati animali domestici,
          agenda appuntamenti, dati operativi su pagamenti/incassi, log tecnici e dati di sicurezza.
        </p>

        <h2 className="text-lg font-semibold">3. Finalità e basi giuridiche</h2>
        <p>
          Esecuzione del contratto, erogazione del servizio, sicurezza, prevenzione frodi/abusi, supporto tecnico, adempimenti legali/fiscali,
          miglioramento del prodotto. La base giuridica dipende dal contesto: esecuzione contrattuale, obbligo legale, legittimo interesse
          o consenso quando richiesto dalla legge.
        </p>

        <h2 className="text-lg font-semibold">4. Ruoli del trattamento</h2>
        <p>
          Per i dati dei clienti finali inseriti nel gestionale, il salone determina finalità e mezzi del trattamento (Titolare).
          Grooming Revolution tratta tali dati come Responsabile/fornitore tecnico secondo istruzioni documentate del Titolare.
        </p>

        <h2 className="text-lg font-semibold">5. Conservazione dei dati</h2>
        <p>
          I dati sono conservati per il tempo necessario alle finalità contrattuali e agli obblighi di legge. Alla cessazione del rapporto,
          i dati vengono cancellati o anonimizzati secondo policy interne e tempi tecnici ragionevoli, salvo obblighi di conservazione.
        </p>

        <h2 className="text-lg font-semibold">6. Sicurezza</h2>
        <p>
          Sono adottate misure tecniche e organizzative adeguate, tra cui controllo accessi, segregazione logica dei tenant, audit log,
          protezione delle credenziali, monitoraggio e aggiornamenti di sicurezza.
        </p>

        <h2 className="text-lg font-semibold">7. Comunicazione a terzi e subprocessori</h2>
        <p>
          I dati possono essere trattati da fornitori terzi indispensabili al servizio (es. cloud hosting, database, pagamenti, messaggistica),
          vincolati da accordi contrattuali e standard di sicurezza adeguati.
        </p>

        <h2 className="text-lg font-semibold">8. Trasferimenti internazionali</h2>
        <p>
          Se i dati sono trasferiti fuori dalla giurisdizione dell&apos;utente, il trasferimento avviene con garanzie adeguate previste dalla legge
          (es. clausole contrattuali standard o meccanismi equivalenti).
        </p>

        <h2 className="text-lg font-semibold">9. Diritti degli interessati</h2>
        <p>
          Nei limiti di legge, gli interessati possono richiedere accesso, rettifica, cancellazione, limitazione, opposizione e portabilità.
          Le richieste sui dati dei clienti finali vanno rivolte prima al salone Titolare.
        </p>

        <h2 className="text-lg font-semibold">10. Violazioni dei dati (data breach)</h2>
        <p>
          In caso di violazione dei dati personali, Grooming Revolution applica procedure interne di gestione incidente, mitigazione,
          registrazione e notifica secondo i requisiti normativi applicabili.
        </p>

        <h2 className="text-lg font-semibold">11. Modifiche alla presente informativa</h2>
        <p>
          La Privacy Policy può essere aggiornata per esigenze tecniche, legali o organizzative. La versione più recente è pubblicata
          su questa pagina con indicazione della data di aggiornamento.
        </p>
      </Card>
    </main>
  );
}

