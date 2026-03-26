import { NextRequest, NextResponse } from "next/server";
import { ConsentKind } from "@prisma/client";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { getActiveConsentTemplates } from "@/lib/consents";
import { addAuditLog } from "@/lib/audit";
import { signClientConsentsSchema } from "@/lib/validators";

function getRequestIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const [first] = forwarded.split(",");
    return first.trim();
  }
  return req.headers.get("x-real-ip") || null;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const salonId = auth.session.user.salonId;

  const client = await prisma.client.findFirst({
    where: { id, salonId, deletedAt: null },
    select: { id: true },
  });
  if (!client) return NextResponse.json({ error: "Cliente non trovato" }, { status: 404 });

  const [templates, history] = await Promise.all([
    getActiveConsentTemplates(salonId),
    prisma.clientConsent.findMany({
      where: { salonId, clientId: id },
      orderBy: [{ signedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        kind: true,
        granted: true,
        signerFullName: true,
        signerDocumentId: true,
        templateVersion: true,
        signedAt: true,
        revokedAt: true,
        revokedReason: true,
        template: { select: { title: true } },
      },
    }),
  ]);

  const latestActiveByKind: Partial<Record<ConsentKind, (typeof history)[number]>> = {};
  for (const row of history) {
    if (row.granted && !row.revokedAt && !latestActiveByKind[row.kind]) {
      latestActiveByKind[row.kind] = row;
    }
  }

  return NextResponse.json({
    templates: templates.map((t) => ({
      id: t.id,
      kind: t.kind,
      title: t.title,
      legalText: t.legalText,
      version: t.version,
    })),
    history,
    active: latestActiveByKind,
  });
}

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
  const parsed = signClientConsentsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const templates = await getActiveConsentTemplates(salonId);
  const byKind = new Map(templates.map((t) => [t.kind, t]));

  const requiredKinds: ConsentKind[] = ["DATA_PROCESSING", "PHOTO_INTERNAL", "PHOTO_SOCIAL"];
  const missing = requiredKinds.filter((kind) => !byKind.has(kind));
  if (missing.length) {
    return NextResponse.json({ error: "Template consensi mancanti. Verifica configurazione sede." }, { status: 400 });
  }

  const signatureDataUrl = parsed.data.signatureDataUrl;
  if (signatureDataUrl.length > 500_000) {
    return NextResponse.json({ error: "Firma troppo grande, riprova con una firma più semplice." }, { status: 400 });
  }

  const signedAt = new Date();
  const ipAddress = getRequestIp(req);
  const userAgent = req.headers.get("user-agent");
  const signerDocumentId = parsed.data.signerDocumentId || null;

  const choices: Array<{ kind: ConsentKind; granted: boolean }> = [
    { kind: "DATA_PROCESSING", granted: parsed.data.dataProcessingGranted },
    { kind: "PHOTO_INTERNAL", granted: parsed.data.photoInternalGranted },
    { kind: "PHOTO_SOCIAL", granted: parsed.data.photoSocialGranted },
  ];

  const payloadToHash = JSON.stringify({
    signedAt: signedAt.toISOString(),
    signerFullName: parsed.data.signerFullName,
    signerDocumentId,
    ipAddress,
    userAgent,
    choices,
    templates: choices.map(({ kind }) => {
      const template = byKind.get(kind)!;
      return {
        kind,
        templateId: template.id,
        version: template.version,
        legalText: template.legalText,
      };
    }),
    signatureDataUrl,
  });
  const evidenceHash = createHash("sha256").update(payloadToHash).digest("hex");

  await prisma.$transaction(
    choices.map(({ kind, granted }) => {
      const template = byKind.get(kind)!;
      return prisma.clientConsent.create({
        data: {
          salonId,
          clientId: id,
          templateId: template.id,
          kind,
          granted,
          signerFullName: parsed.data.signerFullName.trim(),
          signerDocumentId,
          legalTextSnapshot: template.legalText,
          templateVersion: template.version,
          signatureDataUrl,
          evidenceHash,
          ipAddress,
          userAgent,
          signedAt,
          createdById: auth.session.user.id,
        },
      });
    }),
  );

  await addAuditLog({
    salonId,
    userId: auth.session.user.id,
    action: "SIGN_CLIENT_CONSENTS",
    entityType: "CLIENT",
    entityId: id,
    metaJson: {
      signedAt: signedAt.toISOString(),
      signerFullName: parsed.data.signerFullName.trim(),
      photoInternalGranted: parsed.data.photoInternalGranted,
      photoSocialGranted: parsed.data.photoSocialGranted,
      evidenceHash,
    },
  });

  return NextResponse.json({ ok: true });
}
