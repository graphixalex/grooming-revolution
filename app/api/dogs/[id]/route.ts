import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;
  const { id } = await params;

  const page = Number(req.nextUrl.searchParams.get("page") || "1");
  const pageSize = Number(req.nextUrl.searchParams.get("pageSize") || "10");
  const skip = (page - 1) * pageSize;

  const dog = await prisma.dog.findFirst({
    where: { id, salonId },
    include: {
      cliente: true,
      tagRapidi: { include: { quickTag: true } },
    },
  });
  if (!dog) return NextResponse.json({ error: "Cane non trovato" }, { status: 404 });

  const [history, total] = await Promise.all([
    prisma.appointment.findMany({
      where: { salonId, caneId: id, deletedAt: null },
      include: {
        trattamentiSelezionati: { include: { treatment: true } },
        transactions: true,
      },
      orderBy: { startAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.appointment.count({ where: { salonId, caneId: id, deletedAt: null } }),
  ]);

  return NextResponse.json({ dog, history, total, page, pageSize });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = await req.json();

  await prisma.dogQuickTag.deleteMany({ where: { dogId: id } });

  const updated = await prisma.dog.updateMany({
    where: { id, salonId: auth.session.user.salonId, deletedAt: null },
    data: {
      nome: body.nome,
      razza: body.razza,
      taglia: body.taglia,
      noteCane: body.noteCane,
    },
  });

  if (body.tagRapidiIds?.length) {
    await prisma.dogQuickTag.createMany({
      data: body.tagRapidiIds.map((quickTagId: string) => ({ dogId: id, quickTagId })),
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  await prisma.dog.updateMany({ where: { id, salonId: auth.session.user.salonId, deletedAt: null }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}

