import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { revokeClientConsentSchema } from "@/lib/validators";
import { addAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;
  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: { id, salonId, deletedAt: null },
    select: { id: true },
  });
  if (!client) return NextResponse.json({ error: "Cliente non trovato" }, { status: 404 });

  const body = await req.json();
  const parsed = revokeClientConsentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const active = await prisma.clientConsent.findFirst({
    where: {
      salonId,
      clientId: id,
      kind: parsed.data.kind,
      granted: true,
      revokedAt: null,
    },
    orderBy: [{ signedAt: "desc" }, { createdAt: "desc" }],
    select: { id: true },
  });

  if (!active) {
    return NextResponse.json({ error: "Nessun consenso attivo da revocare per questa finalità" }, { status: 404 });
  }

  const revokedAt = new Date();
  const reason = parsed.data.reason?.trim() || null;

  await prisma.clientConsent.update({
    where: { id: active.id },
    data: {
      revokedAt,
      revokedReason: reason,
      revokedById: auth.session.user.id,
    },
  });

  await addAuditLog({
    salonId,
    userId: auth.session.user.id,
    action: "REVOKE_CLIENT_CONSENT",
    entityType: "CLIENT_CONSENT",
    entityId: active.id,
    metaJson: {
      clientId: id,
      kind: parsed.data.kind,
      revokedAt: revokedAt.toISOString(),
      reason,
    },
  });

  return NextResponse.json({ ok: true });
}
