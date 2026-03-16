import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { clientSchema } from "@/lib/validators";
import { canCreateClient } from "@/lib/business-rules";
import { addAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;

  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const clients = await prisma.client.findMany({
    where: {
      salonId,
      deletedAt: null,
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

