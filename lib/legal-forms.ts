import type { Salon } from "@prisma/client";

type SalonLegalSource = Pick<
  Salon,
  "nomeAttivita" | "nomeSede" | "indirizzo" | "email" | "telefono" | "billingVatNumber" | "paese"
>;

export function buildControllerBlock(salon: SalonLegalSource) {
  const lines = [
    `Titolare del trattamento: ${salon.nomeAttivita}${salon.nomeSede ? ` - ${salon.nomeSede}` : ""}`,
    `Indirizzo: ${salon.indirizzo || "non disponibile"}`,
    `Email: ${salon.email || "non disponibile"}`,
    `Telefono: ${salon.telefono || "non disponibile"}`,
    `P.IVA: ${salon.billingVatNumber || "non disponibile"}`,
    `Paese: ${salon.paese || "non disponibile"}`,
  ];
  return lines.join("\n");
}

const COMMON_LEGAL_FRAME = [
  "Riferimenti normativi principali:",
  "- Regolamento (UE) 2016/679 (GDPR), art. 5, 6, 7, 13 e 32.",
  "- D.lgs. 196/2003 e s.m.i. (Codice Privacy).",
  "- Linee guida EDPB e provvedimenti del Garante Privacy applicabili.",
].join("\n");

export function enrichLegalText(baseText: string, salon: SalonLegalSource) {
  return `${baseText.trim()}\n\n${buildControllerBlock(salon)}\n\n${COMMON_LEGAL_FRAME}`;
}
