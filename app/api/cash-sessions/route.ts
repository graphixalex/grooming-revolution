import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { canCloseCashSession, canManageSettings } from "@/lib/rbac";
import { closeCashSessionSchema, openCashSessionSchema } from "@/lib/validators";

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;

  const rows = await prisma.cashSession.findMany({
    where: { salonId },
    include: {
      openedBy: { select: { email: true } },
      closedBy: { select: { email: true } },
      transactions: true,
    },
    orderBy: { openedAt: "desc" },
    take: 30,
  });

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;
  if (!canManageSettings(auth.session.user.role)) {
    return NextResponse.json({ error: "Permessi insufficienti" }, { status: 403 });
  }

  const parsed = openCashSessionSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existingOpen = await prisma.cashSession.findFirst({ where: { salonId, status: "OPEN" }, select: { id: true } });
  if (existingOpen) return NextResponse.json({ error: "Esiste gia una cassa aperta" }, { status: 400 });

  const created = await prisma.cashSession.create({
    data: {
      salonId,
      openedById: auth.session.user.id,
      openingFloat: parsed.data.openingFloat,
      noteApertura: parsed.data.noteApertura || null,
    },
  });

  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;
  if (!canCloseCashSession(auth.session.user.role)) {
    return NextResponse.json({ error: "Permessi insufficienti" }, { status: 403 });
  }

  const body = (await req.json()) as { cashSessionId?: string; closingCounted?: number; noteChiusura?: string };
  if (!body.cashSessionId) return NextResponse.json({ error: "cashSessionId obbligatorio" }, { status: 400 });

  const parsed = closeCashSessionSchema.safeParse({
    closingCounted: body.closingCounted,
    noteChiusura: body.noteChiusura,
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const cashSession = await prisma.cashSession.findFirst({
    where: { id: body.cashSessionId, salonId, status: "OPEN" },
  });
  if (!cashSession) return NextResponse.json({ error: "Cassa non trovata o gia chiusa" }, { status: 404 });

  const cashTx = await prisma.transaction.aggregate({
    where: { salonId, method: "CASH", cashSessionId: cashSession.id },
    _sum: { grossAmount: true },
  });
  const expected = new Prisma.Decimal(cashSession.openingFloat).plus(cashTx._sum.grossAmount ?? new Prisma.Decimal(0));
  const counted = new Prisma.Decimal(parsed.data.closingCounted);
  const difference = counted.sub(expected);

  const updated = await prisma.cashSession.update({
    where: { id: cashSession.id },
    data: {
      status: "CLOSED",
      closedById: auth.session.user.id,
      closedAt: new Date(),
      closingExpected: expected,
      closingCounted: counted,
      difference,
      noteChiusura: parsed.data.noteChiusura || null,
    },
  });

  return NextResponse.json(updated);
}
