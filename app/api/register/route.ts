import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { getCountryMeta } from "@/lib/geo";

const defaultTreatments = [
  "Bagno",
  "Tosatura",
  "Taglio macchinetta e forbice",
  "Taglio a forbice",
  "Stripping",
  "Slanatura",
  "Snodatura",
  "Antiparassitario",
  "Spa",
  "Trattamento Dermatologico",
];

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati registrazione non validi" }, { status: 400 });
  }

  const { nomeAttivita, nomeSede, indirizzo, paese, timezone, email, password } = parsed.data;
  const countryMeta = getCountryMeta(paese);
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findFirst({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "Email gia registrata" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.salon.create({
    data: {
      salonGroup: {
        create: { nome: `${nomeAttivita} Group` },
      },
      nomeAttivita,
      nomeSede: nomeSede.trim(),
      indirizzo: indirizzo.trim(),
      paese: countryMeta.code,
      timezone: timezone || countryMeta.defaultTimezone,
      valuta: countryMeta.currency,
      vatRate: 22,
      vatIncluded: true,
      workingHoursJson: {
        mon: { enabled: true, start: "09:00", end: "18:00", breaks: [] },
        tue: { enabled: true, start: "09:00", end: "18:00", breaks: [] },
        wed: { enabled: true, start: "09:00", end: "18:00", breaks: [] },
        thu: { enabled: true, start: "09:00", end: "18:00", breaks: [] },
        fri: { enabled: true, start: "09:00", end: "18:00", breaks: [] },
        sat: { enabled: true, start: "09:00", end: "13:00", breaks: [] },
        sun: { enabled: false, start: "00:00", end: "00:00", breaks: [] },
      },
      users: {
        create: {
          email: normalizedEmail,
          passwordHash,
          ruolo: "OWNER",
        },
      },
      treatments: {
        create: defaultTreatments.map((nome, ordine) => ({ nome, ordine, attivo: true })),
      },
      whatsappTemplate:
        "Ciao %nome_cliente%, promemoria per %nome_pet% il %data_appuntamento% alle %orario_appuntamento% presso %nome_attivita% (%indirizzo_attivita%).",
      emailTemplate:
        "Gentile %nome_cliente%,\nricordiamo l'appuntamento di %nome_pet% in data %data_appuntamento% alle %orario_appuntamento%.\n%nome_attivita%",
    },
  });

  return NextResponse.json({ ok: true });
}
