import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: { id, salonId: auth.session.user.salonId },
    include: {
      dogs: { where: { deletedAt: null }, include: { tagRapidi: { include: { quickTag: true } } } },
      appointments: { where: { deletedAt: null }, include: { cane: true }, orderBy: { startAt: "desc" }, take: 20 },
    },
  });

  if (!client) return NextResponse.json({ error: "Cliente non trovato" }, { status: 404 });
  return NextResponse.json(client);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const body = await req.json();
  const updated = await prisma.client.updateMany({
    where: { id, salonId: auth.session.user.salonId, deletedAt: null },
    data: {
      nome: body.nome,
      cognome: body.cognome,
      telefono: body.telefono,
      email: body.email,
      noteCliente: body.noteCliente,
      consensoPromemoria: Boolean(body.consensoPromemoria),
      consensoTimestamp: body.consensoPromemoria ? new Date() : null,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  await prisma.client.updateMany({ where: { id, salonId: auth.session.user.salonId, deletedAt: null }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}

