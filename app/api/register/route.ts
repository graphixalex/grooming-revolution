import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { getCountryMeta } from "@/lib/geo";
import { getClientIp } from "@/lib/request";
import { clearRegisterRateLimit, isRegisterRateLimited, recordRegisterAttempt } from "@/lib/rate-limit";
import { sendRegistrationWelcomeEmail } from "@/lib/email";
import {
  DEFAULT_WHATSAPP_BOOKING_CONFIRM_TEMPLATE,
  DEFAULT_WHATSAPP_REMINDER_TEMPLATE,
} from "@/lib/default-templates";

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
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dati registrazione non validi" }, { status: 400 });
    }

    const { nomeAttivita, nomeSede, indirizzo, paese, timezone, email, password } = parsed.data;
    const countryMeta = getCountryMeta(paese);
    const normalizedEmail = email.toLowerCase().trim();
    const limiterKey = `${getClientIp(req)}:${normalizedEmail}`;

    if (isRegisterRateLimited(limiterKey)) {
      return NextResponse.json({ error: "Troppi tentativi di registrazione. Riprova più tardi." }, { status: 429 });
    }
    recordRegisterAttempt(limiterKey);

    const existing = await prisma.user.findFirst({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "Registrazione non disponibile con questi dati" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const createdSalon = await prisma.salon.create({
      data: {
        salonGroup: {
          create: { nome: `${nomeAttivita.trim()} Group` },
        },
        nomeAttivita: nomeAttivita.trim(),
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
        whatsappTemplate: DEFAULT_WHATSAPP_REMINDER_TEMPLATE,
        whatsappBookingTemplate: DEFAULT_WHATSAPP_BOOKING_CONFIRM_TEMPLATE,
        emailTemplate:
          "Gentile %nome_cliente%,\nricordiamo l'appuntamento di %nome_pet% in data %data_appuntamento% alle %orario_appuntamento%.\n%nome_attivita%",
      },
      select: { nomeAttivita: true, nomeSede: true },
    });

    clearRegisterRateLimit(limiterKey);
    const emailResult = await sendRegistrationWelcomeEmail({
      to: normalizedEmail,
      businessName: createdSalon.nomeAttivita,
      branchName: createdSalon.nomeSede || "Sede principale",
    });
    if (!emailResult.ok) {
      console.error("registration_welcome_email_failed", {
        to: normalizedEmail,
        reason: emailResult.reason,
        detail: emailResult.detail,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("register_error", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json({ error: "Registrazione non disponibile con questi dati" }, { status: 400 });
      }
      if (error.code === "P2021" || error.code === "P2022") {
        return NextResponse.json(
          { error: "Database non aggiornato. Eseguire le migration in produzione." },
          { status: 500 },
        );
      }
      return NextResponse.json(
        { error: `Errore database (${error.code}). Controllare migration e schema.` },
        { status: 500 },
      );
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        { error: "Connessione database fallita. Verificare DATABASE_URL in Vercel." },
        { status: 500 },
      );
    }

    return NextResponse.json({ error: "Errore server registrazione" }, { status: 500 });
  }
}

