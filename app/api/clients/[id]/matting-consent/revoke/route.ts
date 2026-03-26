import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { addAuditLog } from "@/lib/audit";
import { revokeMattingConsentSchema } from "@/lib/validators";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const salonId = auth.session.user.salonId;

  const client = await prisma.client.findFirst({
    where: { id, salonId, deletedAt: null },
    select: { id: true },
  });
  if (!client) return NextResponse.json({ error: "Cliente non trovato" }, { status: 404 });

  const body = await req.json();
  const parsed = revokeMattingConsentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const record = await prisma.mattingConsentRecord.findFirst({
    where: {
      id: parsed.data.recordId,
      salonId,
      clientId: id,
      revokedAt: null,
    },
    select: { id: true },
  });

  if (!record) {
    return NextResponse.json({ error: "Nessun modulo nodi attivo da revocare" }, { status: 404 });
  }

  const revokedAt = new Date();
  const reason = parsed.data.reason?.trim() || null;

  await prisma.mattingConsentRecord.update({
    where: { id: record.id },
    data: {
      revokedAt,
      revokedReason: reason,
      revokedById: auth.session.user.id,
    },
  });

  await addAuditLog({
    salonId,
    userId: auth.session.user.id,
    action: "REVOKE_MATTING_CONSENT",
    entityType: "MATTING_CONSENT",
    entityId: record.id,
    metaJson: {
      clientId: id,
      revokedAt: revokedAt.toISOString(),
      reason,
    },
  });

  return NextResponse.json({ ok: true });
}
