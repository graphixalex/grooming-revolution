import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import {
  servicePriceRuleDeleteSchema,
  servicePriceRuleSchema,
  servicePriceRuleToggleSchema,
  servicePriceRuleUpdateSchema,
} from "@/lib/validators";
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

  const rawBody = await req.json();
  const toggleParsed = servicePriceRuleToggleSchema.safeParse(rawBody);
  if (toggleParsed.success) {
    const row = await prisma.servicePriceRule.updateMany({
      where: { id: toggleParsed.data.id, salonId },
      data: { attiva: toggleParsed.data.attiva },
    });
    if (row.count === 0) {
      return NextResponse.json({ error: "Regola non trovata" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  const updateParsed = servicePriceRuleUpdateSchema.safeParse(rawBody);
  if (!updateParsed.success) {
    return NextResponse.json({ error: updateParsed.error.flatten() }, { status: 400 });
  }

  const body = updateParsed.data;
  if (body.treatmentId) {
    const treatment = await prisma.treatment.findFirst({
      where: { id: body.treatmentId, salonId },
      select: { id: true },
    });
    if (!treatment) {
      return NextResponse.json({ error: "Trattamento non valido" }, { status: 400 });
    }
  }

  const data: {
    treatmentId?: string;
    dogSize?: "XS" | "S" | "M" | "L" | "XL" | "XXL" | null;
    razzaPattern?: string | null;
    basePrice?: number;
    durataMinuti?: number;
    validoDa?: Date;
    validoA?: Date | null;
    note?: string | null;
  } = {};

  if (body.treatmentId !== undefined) data.treatmentId = body.treatmentId;
  if (body.dogSize !== undefined) data.dogSize = body.dogSize;
  if (body.razzaPattern !== undefined) data.razzaPattern = body.razzaPattern || null;
  if (body.basePrice !== undefined) data.basePrice = body.basePrice;
  if (body.durataMinuti !== undefined) data.durataMinuti = body.durataMinuti;
  if (body.validoDa !== undefined) data.validoDa = new Date(body.validoDa);
  if (body.validoA !== undefined) data.validoA = body.validoA ? new Date(body.validoA) : null;
  if (body.note !== undefined) data.note = body.note || null;

  const updated = await prisma.servicePriceRule.updateMany({
    where: { id: body.id, salonId },
    data,
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: "Regola non trovata" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;
  if (!canManageSettings(auth.session.user.role)) {
    return NextResponse.json({ error: "Permessi insufficienti" }, { status: 403 });
  }

  const parsed = servicePriceRuleDeleteSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const deleted = await prisma.servicePriceRule.deleteMany({
    where: { id: parsed.data.id, salonId },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Regola non trovata" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
