import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import argon2 from "argon2";
import { getCountryMeta } from "@/lib/geo";

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;

  const [salon, tags, treatments, staff] = await Promise.all([
    prisma.salon.findUnique({ where: { id: salonId } }),
    prisma.quickTag.findMany({ where: { salonId }, orderBy: { ordine: "asc" } }),
    prisma.treatment.findMany({ where: { salonId }, orderBy: { ordine: "asc" } }),
    prisma.user.findMany({ where: { salonId }, orderBy: { createdAt: "asc" }, select: { id: true, email: true, ruolo: true } }),
  ]);

  return NextResponse.json({ salon, tags, treatments, staff });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;

  const body = await req.json();

  if (body.section === "salon") {
    const countryMeta = getCountryMeta(body.paese);
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
      },
    });
    return NextResponse.json(salon);
  }

  if (body.section === "templates") {
    const salon = await prisma.salon.update({
      where: { id: salonId },
      data: { whatsappTemplate: body.whatsappTemplate, emailTemplate: body.emailTemplate },
    });
    return NextResponse.json(salon);
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
    const role = body.role === "MANAGER" ? "MANAGER" : "STAFF";
    const passwordHash = await argon2.hash(String(body.password || ""));
    const created = await prisma.user.create({
      data: {
        salonId,
        email: body.email,
        passwordHash,
        ruolo: role,
      },
      select: { id: true, email: true, ruolo: true },
    });
    return NextResponse.json(created);
  }

  return NextResponse.json({ error: "Sezione non supportata" }, { status: 400 });
}

