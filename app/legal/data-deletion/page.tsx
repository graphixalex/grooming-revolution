import { LegalShell } from "@/components/legal/legal-shell";
export default function MetaDataDeletionPage() {
  return <LegalShell title="Cancellazione dati integrazione Meta" updatedAt="28 settembre 2026">
    <div className="space-y-4">
      <p>Il gestionale conserva, per la sede collegata, identificativi WABA e numero, numero visualizzato, versione API, data di collegamento e token cifrato. Sono inoltre presenti dati storici degli invii ed eventi tecnici.</p>
      <h2 className="font-semibold">Disconnessione dal gestionale</h2>
      <p>Quando la funzione Meta sarà resa disponibile, un owner o manager autorizzato potrà usare Scollega Meta nella sezione WhatsApp. In questa release il pannello resta nascosto. La disconnessione richiede che non ci siano messaggi pendenti e rimuove token e identificativi dalla configurazione attiva della sede. Il provider torna a LINKED_SESSION disconnesso; non viene avviata automaticamente una sessione QR.</p>
      <p>Questa operazione non revoca i permessi nell&apos;account Meta, non annulla la subscription dell&apos;app alla WABA e non elimina automaticamente messaggi storici, eventi di audit o copie di backup. Le autorizzazioni Meta vanno gestite nel relativo account.</p>
      <h2 className="font-semibold">Richieste di cancellazione</h2>
      <p>Per richiedere assistenza o cancellazione dei dati scrivere a <a className="underline" href="mailto:servizioclienti@grooming-revolution.com">servizioclienti@grooming-revolution.com</a>, indicando sede ed email dell&apos;account. Non inviare token, password o segreti. Il supporto verifica la richiesta e comunica quali dati possono essere rimossi e quali devono essere conservati.</p>
    </div>
  </LegalShell>;
}
