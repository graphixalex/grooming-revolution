import { prisma } from "@/lib/prisma";

type DefaultTemplate = {
  title: string;
  legalText: string;
};

const DEFAULT_FIRST_VISIT_TEMPLATE: DefaultTemplate = {
  title: "Modulo anamnesi prima volta",
  legalText: `Modulo prima volta - dichiarazioni del proprietario

1) Dichiaro che eventuali informazioni non corrette sul carattere dell'animale, sulla sua mordacita e sul livello di sopportazione delle fasi di toelettatura (lavaggio, asciugatura e taglio) possono causare danni all'animale, al personale e alle cose.

2) La toelettatura non e normalmente rischiosa per l'animale e per il toelettatore se eseguita con cadenza regolare su un animale abituato, tranquillo e con uno stato del pelo non preoccupante. In questo caso la toelettatura viene definita "normale".

3) Se lo stato dell'animale e diverso da quanto indicato sopra, la probabilita di irritazioni o abrasioni puo aumentare. In questo caso la toelettatura e considerata "critica" e il proprietario viene informato dei rischi. L'accettazione della prestazione avviene solo con consenso scritto del proprietario sui rischi connessi.

4) La toelettatura puo rifiutare la presa in carico dell'animale in qualsiasi momento, senza obbligo di motivazione.

5) La toelettatura puo interrompere il servizio in qualsiasi momento, senza obbligo di motivazione, riconsegnando l'animale nello stato in cui si trova al momento dell'interruzione e addebitando il costo proporzionale al lavoro svolto.

6) Eventuali contestazioni relative a tagli o salute dell'animale devono essere presentate entro 48 ore dalla toelettatura.

Dichiarazione finale:
Confermo di aver letto e compreso integralmente il presente modulo anamnesi prima volta e di accettarne i contenuti.`,
};

export async function ensureDefaultFirstVisitAnamnesisTemplate(salonId: string) {
  const existing = await prisma.firstVisitAnamnesisTemplate.findFirst({
    where: { salonId, isActive: true },
    select: { id: true },
  });

  if (existing) return;

  await prisma.firstVisitAnamnesisTemplate.create({
    data: {
      salonId,
      title: DEFAULT_FIRST_VISIT_TEMPLATE.title,
      legalText: DEFAULT_FIRST_VISIT_TEMPLATE.legalText,
      version: 1,
      isActive: true,
    },
  });
}

export async function getActiveFirstVisitAnamnesisTemplate(salonId: string) {
  await ensureDefaultFirstVisitAnamnesisTemplate(salonId);

  return prisma.firstVisitAnamnesisTemplate.findFirst({
    where: { salonId, isActive: true },
    orderBy: [{ version: "desc" }, { createdAt: "desc" }],
  });
}
