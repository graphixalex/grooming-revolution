import { Card } from "@/components/ui/card";
import { getRequiredSession } from "@/lib/session";

const SUPPORT_EMAIL = "servizioclienti@grooming-revolution.com";

export default async function SupportPage() {
  await getRequiredSession();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Supporto</h1>

      <Card className="space-y-2">
        <p className="text-sm text-zinc-600">
          Per assistenza tecnica, onboarding, richieste commerciali o chiarimenti amministrativi, contatta il servizio clienti ufficiale.
        </p>
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-base font-semibold text-cyan-700 hover:text-cyan-800">
          {SUPPORT_EMAIL}
        </a>
      </Card>

      <Card className="space-y-2 text-sm text-zinc-700">
        <p className="font-semibold text-zinc-900">Cosa includere nella richiesta</p>
        <p>- Nome salone e sede coinvolta</p>
        <p>- Pagina/funzione interessata (agenda, report, billing, ecc.)</p>
        <p>- Breve descrizione del problema o della richiesta</p>
        <p>- Screenshot o dati utili, se disponibili</p>
      </Card>

      <Card className="space-y-2 text-sm text-zinc-700">
        <p className="font-semibold text-zinc-900">Riferimenti legali</p>
        <p>
          Consulta le pagine <a href="/legal/privacy" className="text-cyan-700 hover:text-cyan-800">Privacy Policy</a>,{" "}
          <a href="/legal/terms" className="text-cyan-700 hover:text-cyan-800">Termini di Servizio</a> e{" "}
          <a href="/legal/cookies" className="text-cyan-700 hover:text-cyan-800">Cookie Policy</a>.
        </p>
      </Card>
    </div>
  );
}
