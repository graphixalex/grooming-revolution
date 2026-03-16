import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { getCountryMeta } from "@/lib/geo";

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;

  const currentSalon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: {
      id: true,
      nomeAttivita: true,
      nomeSede: true,
      indirizzo: true,
      paese: true,
      valuta: true,
      timezone: true,
      salonGroupId: true,
      createdAt: true,
    },
  });
  if (!currentSalon) {
    return NextResponse.json([]);
  }

  if (!currentSalon.salonGroupId) {
    return NextResponse.json([
      {
        id: currentSalon.id,
        nomeAttivita: currentSalon.nomeAttivita,
        nomeSede: currentSalon.nomeSede,
        indirizzo: currentSalon.indirizzo,
        paese: currentSalon.paese,
        valuta: currentSalon.valuta,
        timezone: currentSalon.timezone,
        createdAt: currentSalon.createdAt,
      },
    ]);
  }

  const branches = await prisma.salon.findMany({
    where: { salonGroupId: currentSalon.salonGroupId },
    select: {
      id: true,
      nomeAttivita: true,
      nomeSede: true,
      indirizzo: true,
      paese: true,
      valuta: true,
      timezone: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(branches);
}

export async function POST(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  if (auth.session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Solo owner puo creare sedi" }, { status: 403 });
  }

  const body = (await req.json()) as {
    nomeSede?: string;
    indirizzo?: string;
    paese?: string;
    timezone?: string;
  };
  if (!body.nomeSede || !body.indirizzo || !body.paese) {
    return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
  }
  const countryMeta = getCountryMeta(body.paese);

  const sourceSalon = await prisma.salon.findUnique({
    where: { id: auth.session.user.salonId },
    select: {
      id: true,
      nomeAttivita: true,
      salonGroupId: true,
      workingHoursJson: true,
      vatRate: true,
      vatIncluded: true,
      timezone: true,
    },
  });
  if (!sourceSalon) {
    return NextResponse.json({ error: "Sede principale non trovata" }, { status: 404 });
  }

  let salonGroupId = sourceSalon.salonGroupId;
  if (!salonGroupId) {
    const createdGroup = await prisma.salonGroup.create({
      data: { nome: `${sourceSalon.nomeAttivita} Group` },
      select: { id: true },
    });
    salonGroupId = createdGroup.id;
    await prisma.salon.update({
      where: { id: sourceSalon.id },
      data: { salonGroupId },
    });
  }

  const created = await prisma.salon.create({
    data: {
      salonGroupId,
      nomeAttivita: sourceSalon.nomeAttivita,
      nomeSede: body.nomeSede.trim(),
      indirizzo: body.indirizzo.trim(),
      paese: countryMeta.code,
      timezone: body.timezone || countryMeta.defaultTimezone || sourceSalon.timezone,
      valuta: countryMeta.currency,
      vatRate: sourceSalon.vatRate,
      vatIncluded: sourceSalon.vatIncluded,
      workingHoursJson: sourceSalon.workingHoursJson ?? undefined,
    },
    select: {
      id: true,
      nomeAttivita: true,
      nomeSede: true,
      indirizzo: true,
      paese: true,
      valuta: true,
      timezone: true,
      createdAt: true,
    },
  });

  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  if (auth.session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Solo owner puo modificare sedi" }, { status: 403 });
  }

  const body = (await req.json()) as {
    id?: string;
    nomeSede?: string;
    indirizzo?: string;
    paese?: string;
    timezone?: string;
  };
  if (!body.id || !body.nomeSede || !body.paese) {
    return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
  }
  const countryMeta = getCountryMeta(body.paese);

  const sourceSalon = await prisma.salon.findUnique({
    where: { id: auth.session.user.salonId },
    select: { id: true, salonGroupId: true },
  });
  if (!sourceSalon) return NextResponse.json({ error: "Sede corrente non trovata" }, { status: 404 });

  const target = await prisma.salon.findFirst({
    where: sourceSalon.salonGroupId ? { id: body.id, salonGroupId: sourceSalon.salonGroupId } : { id: body.id },
  });
  if (!target) return NextResponse.json({ error: "Sede non trovata" }, { status: 404 });
  if (!sourceSalon.salonGroupId && target.id !== sourceSalon.id) {
    return NextResponse.json({ error: "Sede non autorizzata" }, { status: 403 });
  }

  const updated = await prisma.salon.update({
    where: { id: target.id },
    data: {
      nomeSede: body.nomeSede.trim(),
      indirizzo: body.indirizzo?.trim() || null,
      paese: countryMeta.code,
      valuta: countryMeta.currency,
      timezone: body.timezone || countryMeta.defaultTimezone,
    },
    select: {
      id: true,
      nomeAttivita: true,
      nomeSede: true,
      indirizzo: true,
      paese: true,
      valuta: true,
      timezone: true,
      createdAt: true,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  if (auth.session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Solo owner puo eliminare sedi" }, { status: 403 });
  }

  const body = (await req.json()) as {
    id?: string;
    confirmDelete?: boolean;
    confirmWord?: string;
  };
  if (!body.id || !body.confirmDelete || body.confirmWord !== "ELIMINA") {
    return NextResponse.json({ error: "Conferma cancellazione non valida" }, { status: 400 });
  }

  if (body.id === auth.session.user.salonId) {
    return NextResponse.json({ error: "Non puoi eliminare la sede attiva. Seleziona prima un'altra sede." }, { status: 400 });
  }

  const sourceSalon = await prisma.salon.findUnique({
    where: { id: auth.session.user.salonId },
    select: { salonGroupId: true },
  });
  if (!sourceSalon?.salonGroupId) {
    return NextResponse.json({ error: "Gruppo sede non configurato" }, { status: 400 });
  }

  const target = await prisma.salon.findFirst({
    where: { id: body.id, salonGroupId: sourceSalon.salonGroupId },
    select: { id: true },
  });
  if (!target) return NextResponse.json({ error: "Sede non trovata" }, { status: 404 });

  const groupCount = await prisma.salon.count({ where: { salonGroupId: sourceSalon.salonGroupId } });
  if (groupCount <= 1) {
    return NextResponse.json({ error: "Impossibile eliminare l'ultima sede del gruppo" }, { status: 400 });
  }

  await prisma.salon.delete({ where: { id: target.id } });
  return NextResponse.json({ ok: true });
}
