import { Card } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <Card className="space-y-4">
        <h1 className="text-2xl font-semibold">Termini di Servizio</h1>
        <p>Ultimo aggiornamento: 21 marzo 2026.</p>
        <p>
          I presenti Termini disciplinano l&apos;uso della piattaforma SaaS Grooming Revolution da parte di professionisti della
          toelettatura e relative organizzazioni. L&apos;accesso e l&apos;uso del servizio implicano accettazione integrale dei presenti Termini.
        </p>

        <h2 className="text-lg font-semibold">1. Oggetto del servizio</h2>
        <p>
          Il servizio fornisce strumenti software per gestione agenda, clienti, animali, operatori, reportistica, comunicazioni WhatsApp,
          prenotazioni online e funzionalità correlate. Il Fornitore può aggiornare il servizio per ragioni tecniche, normative e di sicurezza.
        </p>

        <h2 className="text-lg font-semibold">2. Account, accessi e sicurezza</h2>
        <p>
          Il Cliente è responsabile della custodia delle credenziali, della corretta assegnazione dei ruoli utente e di ogni attività svolta
          tramite il proprio account. Eventuali accessi non autorizzati devono essere comunicati senza ritardo.
        </p>

        <h2 className="text-lg font-semibold">3. Piani, limiti e pagamenti</h2>
        <p>
          Il piano Free consente fino a 50 clienti. Il piano Pro/FULL prevede rinnovo periodico salvo disdetta, secondo i termini economici
          mostrati nella sezione Billing al momento dell&apos;attivazione.
        </p>
        <p>
          Attivando un piano a pagamento, il Cliente autorizza l&apos;addebito periodico sul metodo di pagamento indicato fino a revoca o cessazione.
        </p>

        <h2 className="text-lg font-semibold">4. Uso consentito e divieti</h2>
        <p>
          È vietato usare la piattaforma per attività illecite, spam, invii non autorizzati, accessi abusivi, reverse engineering,
          diffusione malware o uso contrario alla normativa applicabile (incluse privacy e comunicazioni commerciali).
        </p>

        <h2 className="text-lg font-semibold">5. Dati personali e ruoli privacy</h2>
        <p>
          Salvo diverso accordo scritto, il salone Cliente opera come Titolare del trattamento dei dati dei propri clienti finali; Grooming Revolution
          opera come fornitore tecnico/Responsabile del trattamento, secondo istruzioni del Cliente e norme applicabili.
        </p>

        <h2 className="text-lg font-semibold">6. Conformità WhatsApp e canali terzi</h2>
        <p>
          Il Cliente è responsabile di contenuti, destinatari, basi giuridiche e consensi necessari per i messaggi inviati tramite WhatsApp
          (manuale o API), nonché del rispetto delle policy Meta/WhatsApp e di eventuali provider terzi.
        </p>

        <h2 className="text-lg font-semibold">7. Disponibilità e manutenzione</h2>
        <p>
          Il Fornitore adotta misure tecniche e organizzative ragionevoli per continuità, integrità e sicurezza del servizio, senza garanzia
          di disponibilità ininterrotta. Possono verificarsi sospensioni per manutenzione, aggiornamenti o cause di forza maggiore.
        </p>

        <h2 className="text-lg font-semibold">8. Proprietà intellettuale</h2>
        <p>
          Software, marchi, layout, documentazione e contenuti del servizio restano di proprietà del Fornitore o dei rispettivi titolari.
          È concessa al Cliente licenza d&apos;uso non esclusiva, non trasferibile e limitata alla durata del rapporto contrattuale.
        </p>

        <h2 className="text-lg font-semibold">9. Limitazione di responsabilità</h2>
        <p>
          Nei limiti consentiti dalla legge, la responsabilità complessiva del Fornitore per danni diretti è limitata ai corrispettivi pagati
          dal Cliente nei 12 mesi precedenti l&apos;evento dannoso. Restano esclusi danni indiretti, perdita di profitto, avviamento, dati o opportunità,
          salvo dolo o colpa grave ove inderogabile.
        </p>

        <h2 className="text-lg font-semibold">10. Sospensione e risoluzione</h2>
        <p>
          Il Fornitore può sospendere o terminare l&apos;accesso in caso di violazioni rilevanti, rischi di sicurezza, uso illecito o mancato pagamento.
          Il Cliente può cessare il servizio secondo le modalità previste nella sezione Billing.
        </p>

        <h2 className="text-lg font-semibold">11. Legge applicabile e foro</h2>
        <p>
          Salvo norme imperative diverse, i presenti Termini sono regolati dal diritto svizzero. Foro competente: Svizzera, presso la sede del Fornitore,
          fatto salvo quanto inderogabilmente previsto dalla legge applicabile.
        </p>

        <h2 className="text-lg font-semibold">12. Modifiche ai termini</h2>
        <p>
          Il Fornitore può aggiornare i presenti Termini per esigenze tecniche, legali o organizzative. Le modifiche rilevanti vengono pubblicate con data
          di aggiornamento; l&apos;uso continuato del servizio dopo la pubblicazione costituisce accettazione dei nuovi termini.
        </p>
      </Card>
    </main>
  );
}

