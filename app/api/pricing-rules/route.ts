import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { servicePriceRuleSchema } from "@/lib/validators";
import { canManageSettings } from "@/lib/rbac";

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;

  const rows = await prisma.servicePriceRule.findMany({
    where: { salonId },
    include: { treatment: true, createdBy: { select: { email: true } } },
    orderBy: [{ attiva: "desc" }, { validoDa: "desc" }],
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

  const parsed = servicePriceRuleSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const body = parsed.data;
  const row = await prisma.servicePriceRule.create({
    data: {
      salonId,
      treatmentId: body.treatmentId,
      dogSize: body.dogSize ?? null,
      razzaPattern: body.razzaPattern || null,
      extraLabel: body.extraLabel || null,
      basePrice: body.basePrice,
      extraPrice: body.extraPrice,
      durataMinuti: body.durataMinuti,
      validoDa: new Date(body.validoDa),
      validoA: body.validoA ? new Date(body.validoA) : null,
      note: body.note || null,
      createdById: auth.session.user.id,
    },
    include: { treatment: true, createdBy: { select: { email: true } } },
  });

  return NextResponse.json(row, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;
  if (!canManageSettings(auth.session.user.role)) {
    return NextResponse.json({ error: "Permessi insufficienti" }, { status: 403 });
  }

  const body = (await req.json()) as { id?: string; attiva?: boolean };
  if (!body.id || typeof body.attiva !== "boolean") {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  const row = await prisma.servicePriceRule.updateMany({
    where: { id: body.id, salonId },
    data: { attiva: body.attiva },
  });
  if (row.count === 0) {
    return NextResponse.json({ error: "Regola non trovata" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
