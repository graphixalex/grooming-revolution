import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { dogSchema } from "@/lib/validators";
import { ensureDogLimit } from "@/lib/business-rules";

export async function GET(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;
  const clienteId = req.nextUrl.searchParams.get("clienteId");

  const dogs = await prisma.dog.findMany({
    where: { salonId, clienteId: clienteId || undefined, deletedAt: null },
    include: { tagRapidi: { include: { quickTag: true } }, cliente: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(dogs);
}

export async function POST(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;

  const parsed = dogSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await ensureDogLimit(salonId, parsed.data.clienteId);

  const dog = await prisma.dog.create({
    data: {
      salonId,
      clienteId: parsed.data.clienteId,
      nome: parsed.data.nome,
      razza: parsed.data.razza || null,
      taglia: parsed.data.taglia,
      noteCane: parsed.data.noteCane || null,
      tagRapidi: {
        create: parsed.data.tagRapidiIds.map((quickTagId) => ({ quickTagId })),
      },
    },
  });

  return NextResponse.json(dog, { status: 201 });
}

