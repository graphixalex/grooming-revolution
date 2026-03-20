import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { clientSchema } from "@/lib/validators";
import { canCreateClient } from "@/lib/business-rules";
import { addAuditLog } from "@/lib/audit";

const INTERNAL_NOTE_PHONE = "__NOTE__";

export async function GET(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;

  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const clients = await prisma.client.findMany({
    where: {
      salonId,
      deletedAt: null,
      telefono: { not: INTERNAL_NOTE_PHONE },
      OR: q
        ? [
            { nome: { contains: q, mode: "insensitive" } },
            { cognome: { contains: q, mode: "insensitive" } },
            { telefono: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy: { createdAt: "desc" },
    include: { dogs: { where: { deletedAt: null }, select: { id: true, nome: true, razza: true } } },
  });

  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;

  const canCreate = await canCreateClient(salonId);
  if (!canCreate) {
    return NextResponse.json({ error: "Piano Free: limite massimo 100 clienti raggiunto" }, { status: 403 });
  }

  const json = await req.json();
  const parsed = clientSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const created = await prisma.client.create({
    data: {
      salonId,
      nome: data.nome,
      cognome: data.cognome,
      telefono: data.telefono,
      email: data.email || null,
      noteCliente: data.noteCliente || null,
      consensoPromemoria: data.consensoPromemoria,
      consensoTimestamp: data.consensoPromemoria ? new Date() : null,
    },
  });

  await addAuditLog({
    salonId,
    userId: auth.session.user.id,
    action: "CREATE_CLIENT",
    entityType: "CLIENT",
    entityId: created.id,
  });

  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;

  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown) => typeof id === "string" && id.trim()) : [];
  if (!ids.length) {
    return NextResponse.json({ error: "Seleziona almeno un contatto da eliminare" }, { status: 400 });
  }

  const existing = await prisma.client.findMany({
    where: {
      id: { in: ids },
      salonId,
      deletedAt: null,
      telefono: { not: INTERNAL_NOTE_PHONE },
    },
    select: { id: true },
  });
  const existingIds = existing.map((c) => c.id);
  if (!existingIds.length) {
    return NextResponse.json({ error: "Nessun contatto valido trovato" }, { status: 404 });
  }

  const now = new Date();
  const result = await prisma.client.updateMany({
    where: { id: { in: existingIds }, salonId, deletedAt: null },
    data: { deletedAt: now },
  });

  await Promise.all(
    existingIds.map((clientId) =>
      addAuditLog({
        salonId,
        userId: auth.session.user.id,
        action: "DELETE_CLIENT",
        entityType: "CLIENT",
        entityId: clientId,
      }),
    ),
  );

  return NextResponse.json({ ok: true, deleted: result.count });
}

