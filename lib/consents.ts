import { ConsentKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DefaultTemplate = {
  kind: ConsentKind;
  title: string;
  legalText: string;
};

const DEFAULT_CONSENT_TEMPLATES: DefaultTemplate[] = [
  {
    kind: "DATA_PROCESSING",
    title: "Consenso trattamento dati cliente",
    legalText: `Informativa ai sensi dell'art. 13 GDPR

Titolare del trattamento: la sede presso cui viene raccolto il presente consenso.
finalità: gestione anagrafica cliente, prenotazioni, gestione appuntamenti, comunicazioni operative legate al servizio richiesto.
Dati trattati: dati identificativi e di contatto forniti dal cliente.
Base giuridica: esecuzione del servizio richiesto e consenso dell'interessato ove necessario.
Conservazione: per il tempo necessario alla gestione del rapporto e agli obblighi di legge.
Diritti dell'interessato: accesso, rettifica, cancellazione, limitazione, opposizione, portabilità e reclamo al Garante.

Dichiarazione di consenso:
Dichiaro di aver letto l'informativa e presto il consenso al trattamento dei miei dati personali per le finalità sopra indicate.`,
  },
  {
    kind: "PHOTO_INTERNAL",
    title: "Consenso foto/video per archivio interno",
    legalText: `Consenso specifico per immagini dell'animale - uso interno

Autorizzo la struttura ad acquisire e conservare immagini e/o video del mio animale esclusivamente per finalità interne operative, organizzative e qualitative (es. storico trattamenti, monitoraggio risultati, gestione scheda cliente).

Le immagini non saranno diffuse al pubblico sulla base di questo consenso.
Il consenso è facoltativo e può essere revocato in qualsiasi momento.`,
  },
  {
    kind: "PHOTO_SOCIAL",
    title: "Consenso pubblicazione foto/video su social e web",
    legalText: `Consenso specifico per pubblicazione promozionale

Autorizzo la struttura a pubblicare immagini e/o video del mio animale su canali digitali della struttura (es. social network, sito web, materiali promozionali online/offline), nel rispetto della dignità dell'animale e senza indicare dati personali non necessari.

Il consenso è facoltativo, separato dagli altri consensi e revocabile in qualsiasi momento con effetto per le pubblicazioni future.`,
  },
];

export async function ensureDefaultConsentTemplates(salonId: string) {
  const existing = await prisma.consentTemplate.findMany({
    where: { salonId, isActive: true },
    select: { kind: true, version: true },
  });
  const hasKind = new Set(existing.map((e) => e.kind));

  const missing = DEFAULT_CONSENT_TEMPLATES.filter((template) => !hasKind.has(template.kind));
  if (!missing.length) return;

  await prisma.consentTemplate.createMany({
    data: missing.map((template) => ({
      salonId,
      kind: template.kind,
      title: template.title,
      legalText: template.legalText,
      version: 1,
      isActive: true,
    })),
  });
}

export async function getActiveConsentTemplates(salonId: string) {
  await ensureDefaultConsentTemplates(salonId);
  return prisma.consentTemplate.findMany({
    where: { salonId, isActive: true },
    orderBy: [{ kind: "asc" }, { version: "desc" }],
  });
}

