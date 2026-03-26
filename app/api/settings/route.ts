import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import bcrypt from "bcryptjs";
import { getCountryMeta } from "@/lib/geo";
import { Prisma } from "@prisma/client";
import { canManageSettings } from "@/lib/rbac";
import { createStaffSchema } from "@/lib/validators";
import { slugifyBooking } from "@/lib/booking";
import { sendAccountDeletionRequestEmails, sendPasswordChangedEmail } from "@/lib/email";
import { DEFAULT_WHATSAPP_REMINDER_TEMPLATE } from "@/lib/default-templates";

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  if (!canManageSettings(auth.session.user.role as any)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const salonId = auth.session.user.salonId;

  const [salon, tags, treatments, staff, operators] = await Promise.all([
    prisma.salon.findUnique({
      where: { id: salonId },
      select: {
        id: true,
        salonGroupId: true,
        nomeAttivita: true,
        nomeSede: true,
        paese: true,
        timezone: true,
        valuta: true,
        vatRate: true,
        vatIncluded: true,
        indirizzo: true,
        telefono: true,
        email: true,
        whatsappTemplate: true,
        emailTemplate: true,
        overlapAllowed: true,
        workingHoursJson: true,
        holidaysJson: true,
        subscriptionPlan: true,
        billingVatNumber: true,
        billingCountry: true,
        bookingEnabled: true,
        bookingSlug: true,
        bookingDisplayName: true,
        bookingDescription: true,
        bookingLogoUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.quickTag.findMany({ where: { salonId }, orderBy: { ordine: "asc" } }),
    prisma.treatment.findMany({ where: { salonId }, orderBy: { ordine: "asc" } }),
    prisma.user.findMany({
      where: { salonId },
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, ruolo: true, canAccessGroupSalons: true, salon: { select: { id: true, nomeSede: true } } },
    }),
    prisma.operator.findMany({ where: { salonId }, orderBy: { ordine: "asc" } }),
  ]);

  return NextResponse.json({
    salon: salon
      ? {
          ...salon,
          whatsappTemplate:
            typeof salon.whatsappTemplate === "string" && salon.whatsappTemplate.trim().length > 0
              ? salon.whatsappTemplate
              : DEFAULT_WHATSAPP_REMINDER_TEMPLATE,
          // Never expose stored token in clear text to the client.
          whatsappApiAccessToken: "",
        }
      : salon,
    tags,
    treatments,
    staff,
    operators,
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;

  const body = await req.json();
  const role = auth.session.user.role;

  const managerSections = new Set(["salon", "templates", "workingHours", "tags", "treatments", "operators"]);
  if (managerSections.has(String(body.section)) && !canManageSettings(role as any)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  if (body.section === "ownerPassword") {
    if (auth.session.user.role !== "OWNER") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    const confirmNewPassword = String(body.confirmNewPassword || "");
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return NextResponse.json({ error: "Campi password obbligatori" }, { status: 400 });
    }
    if (newPassword !== confirmNewPassword) {
      return NextResponse.json({ error: "Conferma password non valida" }, { status: 400 });
    }
    if (
      newPassword.length < 10 ||
      !/[a-z]/.test(newPassword) ||
      !/[A-Z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)
    ) {
      return NextResponse.json(
        { error: "Password non valida: min 10 caratteri con maiuscola, minuscola, numero e simbolo" },
        { status: 400 },
      );
    }

    const owner = await prisma.user.findUnique({
      where: { id: auth.session.user.id },
      select: { id: true, email: true, ruolo: true, passwordHash: true },
    });
    if (!owner || owner.ruolo !== "OWNER") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const matchesCurrent = await bcrypt.compare(currentPassword, owner.passwordHash);
    if (!matchesCurrent) {
      return NextResponse.json({ error: "Password attuale non corretta" }, { status: 400 });
    }
    const sameAsCurrent = await bcrypt.compare(newPassword, owner.passwordHash);
    if (sameAsCurrent) {
      return NextResponse.json({ error: "La nuova password deve essere diversa da quella attuale" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: owner.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    });

    await sendPasswordChangedEmail({
      to: owner.email,
      changedByEmail: auth.session.user.email || null,
    });

    return NextResponse.json({ ok: true });
  }

  if (body.section === "accountDeletionRequest") {
    if (auth.session.user.role !== "OWNER") {
      return NextResponse.json({ error: "Solo owner può richiedere eliminazione account" }, { status: 403 });
    }

    const confirmWord = String(body.confirmWord || "").trim().toUpperCase();
    if (confirmWord !== "ELIMINA") {
      return NextResponse.json({ error: "Conferma non valida: inserisci ELIMINA" }, { status: 400 });
    }

    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: {
        id: true,
        nomeAttivita: true,
        nomeSede: true,
        telefono: true,
        indirizzo: true,
        email: true,
        paese: true,
        timezone: true,
      },
    });
    if (!salon) {
      return NextResponse.json({ error: "Sede non trovata" }, { status: 404 });
    }

    const ownerEmail = auth.session.user.email || "";
    if (!ownerEmail) {
      return NextResponse.json({ error: "Email owner non disponibile" }, { status: 400 });
    }

    const mailResult = await sendAccountDeletionRequestEmails({
      ownerEmail,
      businessName: salon.nomeAttivita,
      branchName: salon.nomeSede || "Sede principale",
      salonId: salon.id,
      salonPhone: salon.telefono,
      salonAddress: salon.indirizzo,
      salonEmail: salon.email,
      country: salon.paese,
      timezone: salon.timezone,
    });
    if (!mailResult.ok) {
      return NextResponse.json(
        {
          error:
            "Richiesta non inviata. Controlla configurazione email (RESEND_API_KEY, EMAIL_FROM, SUPPORT_EMAIL).",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message:
        "Richiesta inviata. Prima di procedere esporta i clienti in CSV: l'eliminazione account è irreversibile.",
    });
  }

  if (body.section === "salon") {
    const countryMeta = getCountryMeta(body.paese);
    const rawSlug = typeof body.bookingSlug === "string" ? body.bookingSlug : "";
    const bookingSlug = rawSlug.trim().length ? slugifyBooking(rawSlug) : null;
    try {
      const salon = await prisma.salon.update({
        where: { id: salonId },
        data: {
          nomeAttivita: body.nomeAttivita,
          paese: countryMeta.code,
          valuta: countryMeta.currency,
          indirizzo: body.indirizzo,
          telefono: body.telefono,
          email: body.email,
          timezone: body.timezone,
          billingVatNumber: body.billingVatNumber,
          billingCountry: body.billingCountry,
          bookingEnabled: Boolean(body.bookingEnabled),
          bookingSlug,
          bookingDisplayName: body.bookingDisplayName || null,
          bookingDescription: body.bookingDescription || null,
          bookingLogoUrl: body.bookingLogoUrl || null,
        },
      });
      return NextResponse.json(salon);
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json({ error: "Slug booking già in uso. Scegline uno diverso." }, { status: 400 });
      }
      throw error;
    }
  }

  if (body.section === "templates") {
    try {
      const salon = await prisma.salon.update({
        where: { id: salonId },
        data: {
          whatsappTemplate:
            typeof body.whatsappTemplate === "string" && body.whatsappTemplate.trim().length > 0
              ? body.whatsappTemplate
              : DEFAULT_WHATSAPP_REMINDER_TEMPLATE,
          whatsappApiEnabled: Boolean(body.whatsappApiEnabled),
          whatsappApiPhoneNumberId:
            typeof body.whatsappApiPhoneNumberId === "string" && body.whatsappApiPhoneNumberId.trim().length > 0
              ? body.whatsappApiPhoneNumberId.trim()
              : null,
          whatsappApiVersion:
            typeof body.whatsappApiVersion === "string" && body.whatsappApiVersion.trim().length > 0
              ? body.whatsappApiVersion.trim()
              : "v23.0",
          ...(typeof body.whatsappApiAccessToken === "string" && body.whatsappApiAccessToken.trim().length > 0
            ? { whatsappApiAccessToken: body.whatsappApiAccessToken.trim() }
            : {}),
        },
      });
      return NextResponse.json({ ...salon, whatsappApiAccessToken: "" });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2021" || error.code === "P2022")
      ) {
        const legacy = await prisma.salon.update({
          where: { id: salonId },
          data: {
            whatsappTemplate:
              typeof body.whatsappTemplate === "string" && body.whatsappTemplate.trim().length > 0
                ? body.whatsappTemplate
                : DEFAULT_WHATSAPP_REMINDER_TEMPLATE,
          },
        });
        return NextResponse.json({
          ...legacy,
          whatsappApiEnabled: false,
          whatsappApiPhoneNumberId: "",
          whatsappApiVersion: "v23.0",
          whatsappApiAccessToken: "",
          warning: "Aggiorna il database con le migration per attivare WhatsApp API.",
        });
      }
      throw error;
    }
  }

  if (body.section === "workingHours") {
    const salon = await prisma.salon.update({
      where: { id: salonId },
      data: { workingHoursJson: body.workingHoursJson, overlapAllowed: Boolean(body.overlapAllowed) },
    });
    return NextResponse.json(salon);
  }

  if (body.section === "tags") {
    await prisma.quickTag.deleteMany({ where: { salonId } });
    const created = await prisma.quickTag.createMany({
      data: (body.tags as Array<{ nome: string; ordine: number }>).map((t) => ({ salonId, nome: t.nome, ordine: t.ordine })),
    });
    return NextResponse.json(created);
  }

  if (body.section === "treatments") {
    const incoming = (body.treatments as Array<{ id?: string; attivo: boolean; ordine: number; nome: string }>).filter(
      (t) => String(t.nome || "").trim().length > 0,
    );
    const existing = await prisma.treatment.findMany({ where: { salonId }, select: { id: true } });
    const existingIds = new Set(existing.map((e) => e.id));
    const incomingExistingIds = new Set(
      incoming
        .map((t) => t.id)
        .filter((v): v is string => typeof v === "string" && v.length > 0)
        .filter((v) => existingIds.has(v)),
    );
    const idsToDelete = existing.filter((e) => !incomingExistingIds.has(e.id)).map((e) => e.id);

    if (idsToDelete.length) {
      await prisma.treatment.deleteMany({ where: { salonId, id: { in: idsToDelete } } });
    }

    for (const t of incoming) {
      if (t.id && existingIds.has(t.id)) {
        await prisma.treatment.update({
          where: { id: t.id },
          data: { attivo: Boolean(t.attivo), ordine: t.ordine, nome: t.nome.trim() },
        });
      } else {
        await prisma.treatment.create({
          data: { salonId, attivo: Boolean(t.attivo), ordine: t.ordine, nome: t.nome.trim() },
        });
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (body.section === "staff" && auth.session.user.role === "OWNER") {
    const parsed = createStaffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dati staff non validi" }, { status: 400 });
    }

    const { email, password, role, salonId: requestedSalonIdRaw, canAccessGroupSalons } = parsed.data;
    const requestedSalonId = requestedSalonIdRaw && requestedSalonIdRaw.length > 0 ? requestedSalonIdRaw : salonId;
    const [currentSalon, targetSalon] = await Promise.all([
      prisma.salon.findUnique({ where: { id: salonId }, select: { salonGroupId: true } }),
      prisma.salon.findUnique({ where: { id: requestedSalonId }, select: { id: true, salonGroupId: true } }),
    ]);
    if (!targetSalon) {
      return NextResponse.json({ error: "Sede staff non valida" }, { status: 400 });
    }
    if (!currentSalon?.salonGroupId || !targetSalon.salonGroupId || currentSalon.salonGroupId !== targetSalon.salonGroupId) {
      return NextResponse.json({ error: "Puoi associare staff solo alle sedi del tuo gruppo" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existsEmail = await prisma.user.findFirst({ where: { email: normalizedEmail }, select: { id: true } });
    if (existsEmail) {
      return NextResponse.json({ error: "Email già in uso. Usa una email diversa per questo dipendente." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const created = await prisma.user.create({
      data: {
        salonId: requestedSalonId,
        email: normalizedEmail,
        passwordHash,
        ruolo: role,
        canAccessGroupSalons: Boolean(canAccessGroupSalons),
      },
      select: { id: true, email: true, ruolo: true, canAccessGroupSalons: true, salon: { select: { id: true, nomeSede: true } } },
    });
    return NextResponse.json(created);
  }

  if (body.section === "staffUpdate" && auth.session.user.role === "OWNER") {
    const userId = String(body.userId || "");
    if (!userId) {
      return NextResponse.json({ error: "userId obbligatorio" }, { status: 400 });
    }
    if (userId === auth.session.user.id) {
      return NextResponse.json({ error: "Non puoi modificare questo account da qui" }, { status: 400 });
    }

    const [ownerSalon, targetUser] = await Promise.all([
      prisma.salon.findUnique({ where: { id: salonId }, select: { salonGroupId: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, ruolo: true, salonId: true } }),
    ]);
    if (!targetUser) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
    }
    if (targetUser.ruolo === "OWNER") {
      return NextResponse.json({ error: "Non puoi modificare un owner da questa sezione" }, { status: 400 });
    }

    const requestedSalonId = typeof body.salonId === "string" && body.salonId.length > 0 ? body.salonId : targetUser.salonId;
    const targetSalon = await prisma.salon.findUnique({ where: { id: requestedSalonId }, select: { salonGroupId: true } });
    if (!ownerSalon?.salonGroupId || !targetSalon?.salonGroupId || ownerSalon.salonGroupId !== targetSalon.salonGroupId) {
      return NextResponse.json({ error: "Puoi gestire staff solo nelle sedi del tuo gruppo" }, { status: 400 });
    }

    const email = String(body.email || "").toLowerCase().trim();
    if (!email) return NextResponse.json({ error: "Email obbligatoria" }, { status: 400 });
    const existsEmail = await prisma.user.findFirst({
      where: { email, id: { not: userId } },
      select: { id: true },
    });
    if (existsEmail) {
      return NextResponse.json({ error: "Email già in uso. Inserisci una email diversa." }, { status: 400 });
    }

    const nextRole = body.role === "MANAGER" ? "MANAGER" : "STAFF";
    const rawPassword = String(body.password || "");
    const data: Prisma.UserUpdateInput = {
      email,
      ruolo: nextRole,
      salon: { connect: { id: requestedSalonId } },
      canAccessGroupSalons: Boolean(body.canAccessGroupSalons),
    };
    if (rawPassword.trim().length > 0) {
      if (
        rawPassword.length < 10 ||
        !/[a-z]/.test(rawPassword) ||
        !/[A-Z]/.test(rawPassword) ||
        !/[0-9]/.test(rawPassword) ||
        !/[^A-Za-z0-9]/.test(rawPassword)
      ) {
        return NextResponse.json(
          { error: "Password non valida: min 10 caratteri con maiuscola, minuscola, numero e simbolo" },
          { status: 400 },
        );
      }
      data.passwordHash = await bcrypt.hash(rawPassword, 12);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, ruolo: true, canAccessGroupSalons: true, salon: { select: { id: true, nomeSede: true } } },
    });
    if (rawPassword.trim().length > 0) {
      await sendPasswordChangedEmail({
        to: updated.email,
        changedByEmail: auth.session.user.email || null,
      });
    }
    return NextResponse.json(updated);
  }

  if (body.section === "staffDelete" && auth.session.user.role === "OWNER") {
    const userId = String(body.userId || "");
    if (!userId) {
      return NextResponse.json({ error: "userId obbligatorio" }, { status: 400 });
    }
    if (userId === auth.session.user.id) {
      return NextResponse.json({ error: "Non puoi eliminare il tuo account owner" }, { status: 400 });
    }

    const [ownerSalon, targetUser] = await Promise.all([
      prisma.salon.findUnique({ where: { id: salonId }, select: { salonGroupId: true } }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, ruolo: true, salon: { select: { salonGroupId: true } } },
      }),
    ]);
    if (!targetUser) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
    }
    if (targetUser.ruolo === "OWNER") {
      return NextResponse.json({ error: "Non puoi eliminare un owner" }, { status: 400 });
    }
    if (
      !ownerSalon?.salonGroupId ||
      !targetUser.salon?.salonGroupId ||
      ownerSalon.salonGroupId !== targetUser.salon.salonGroupId
    ) {
      return NextResponse.json({ error: "Puoi eliminare staff solo nel tuo gruppo" }, { status: 400 });
    }

    try {
      await prisma.user.delete({ where: { id: userId } });
      return NextResponse.json({ ok: true });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        return NextResponse.json(
          { error: "Impossibile eliminare l'utente: risulta collegato a dati storici. Cambia password/ruolo invece." },
          { status: 400 },
        );
      }
      throw error;
    }
  }

  if (body.section === "operators") {
    const incoming = (body.operators as Array<{
      id?: string;
      nome: string;
      attivo: boolean;
      ordine: number;
      color?: string | null;
      workingHoursJson?: unknown;
      kpiTargetRevenue?: number | string | null;
      kpiTargetAppointments?: number | null;
    }>).filter((o) => String(o.nome || "").trim().length > 0);

    const existing = await prisma.operator.findMany({ where: { salonId }, select: { id: true } });
    const existingIds = new Set(existing.map((e) => e.id));
    const incomingExistingIds = new Set(
      incoming
        .map((o) => o.id)
        .filter((v): v is string => typeof v === "string" && v.length > 0)
        .filter((v) => existingIds.has(v)),
    );
    const idsToDelete = existing.filter((e) => !incomingExistingIds.has(e.id)).map((e) => e.id);

    if (idsToDelete.length) {
      const assignedAppointments = await prisma.appointment.count({
        where: { salonId, operatorId: { in: idsToDelete }, deletedAt: null },
      });
      if (assignedAppointments > 0) {
        return NextResponse.json(
          { error: "Impossibile eliminare operatori con appuntamenti assegnati. Disattivali invece di rimuoverli." },
          { status: 400 },
        );
      }
      await prisma.operator.deleteMany({ where: { salonId, id: { in: idsToDelete } } });
    }

    for (const o of incoming) {
      const payload = {
        nome: o.nome.trim(),
        attivo: Boolean(o.attivo),
        ordine: o.ordine,
        color: o.color || "#2563eb",
        workingHoursJson: o.workingHoursJson ?? Prisma.JsonNull,
        kpiTargetRevenue:
          o.kpiTargetRevenue === null || o.kpiTargetRevenue === undefined || o.kpiTargetRevenue === ""
            ? null
            : Number(o.kpiTargetRevenue),
        kpiTargetAppointments:
          o.kpiTargetAppointments === null || o.kpiTargetAppointments === undefined
            ? null
            : Number(o.kpiTargetAppointments),
      };
      if (o.id && existingIds.has(o.id)) {
        await prisma.operator.update({ where: { id: o.id }, data: payload });
      } else {
        await prisma.operator.create({ data: { salonId, ...payload } });
      }
    }

    if (typeof body.overlapAllowed !== "undefined") {
      await prisma.salon.update({
        where: { id: salonId },
        data: { overlapAllowed: Boolean(body.overlapAllowed) },
      });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Sezione non supportata" }, { status: 400 });
}


