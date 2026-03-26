import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { getActiveMattingConsentTemplate } from "@/lib/matting-consent";
import { addAuditLog } from "@/lib/audit";
import { signMattingConsentSchema } from "@/lib/validators";
import { enrichLegalText } from "@/lib/legal-forms";

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

  const client = await prisma.client.findFirst({ where: { id, salonId, deletedAt: null }, select: { id: true } });

  if (!client) return NextResponse.json({ error: "Cliente non trovato" }, { status: 404 });

  const [template, history, salon] = await Promise.all([
    getActiveMattingConsentTemplate(salonId),
    prisma.mattingConsentRecord.findMany({
      where: { salonId, clientId: id },
      orderBy: [{ signedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        ownerFullName: true,
        petName: true,
        consentDematting: true,
        consentUnderMatsShave: true,
        formDate: true,
        additionalNotes: true,
        acknowledgedRisk: true,
        signerFullName: true,
        signerDocumentId: true,
        templateVersion: true,
        signedAt: true,
        revokedAt: true,
        revokedReason: true,
      },
    }),
    prisma.salon.findUnique({
      where: { id: salonId },
      select: {
        nomeAttivita: true,
        nomeSede: true,
        indirizzo: true,
        email: true,
        telefono: true,
        billingVatNumber: true,
        paese: true,
      },
    }),
  ]);

  const active = history.find((row) => !row.revokedAt) || null;

  return NextResponse.json({
    enabled: true,
    template: template
      ? {
          id: template.id,
          title: template.title,
          legalText: salon ? enrichLegalText(template.legalText, salon) : template.legalText,
          version: template.version,
        }
      : null,
    history,
    active,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const salonId = auth.session.user.salonId;

  const client = await prisma.client.findFirst({ where: { id, salonId, deletedAt: null }, select: { id: true } });

  if (!client) return NextResponse.json({ error: "Cliente non trovato" }, { status: 404 });

  const body = await req.json();
  const parsed = signMattingConsentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [template, salon] = await Promise.all([
    getActiveMattingConsentTemplate(salonId),
    prisma.salon.findUnique({
      where: { id: salonId },
      select: {
        nomeAttivita: true,
        nomeSede: true,
        indirizzo: true,
        email: true,
        telefono: true,
        billingVatNumber: true,
        paese: true,
      },
    }),
  ]);
  if (!template) {
    return NextResponse.json({ error: "Template nodi mancante. Verifica configurazione sede." }, { status: 400 });
  }

  const signatureDataUrl = parsed.data.signatureDataUrl;
  if (signatureDataUrl.length > 500_000) {
    return NextResponse.json({ error: "Firma troppo grande, riprova con una firma piu semplice." }, { status: 400 });
  }

  const signedAt = new Date();
  const formDate = new Date(parsed.data.formDate);
  const ipAddress = getRequestIp(req);
  const userAgent = req.headers.get("user-agent");
  const signerDocumentId = parsed.data.signerDocumentId?.trim() || null;

  const legalTextSnapshot = salon ? enrichLegalText(template.legalText, salon) : template.legalText;

  const payloadToHash = JSON.stringify({
    signedAt: signedAt.toISOString(),
    ownerFullName: parsed.data.ownerFullName.trim(),
    petName: parsed.data.petName.trim(),
    formDate: formDate.toISOString(),
    consentDematting: parsed.data.consentDematting,
    consentUnderMatsShave: parsed.data.consentUnderMatsShave,
    additionalNotes: parsed.data.additionalNotes?.trim() || null,
    acknowledgedRisk: parsed.data.acknowledgedRisk,
    signerFullName: parsed.data.signerFullName.trim(),
    signerDocumentId,
    templateId: template.id,
    templateVersion: template.version,
    legalText: legalTextSnapshot,
    ipAddress,
    userAgent,
    signatureDataUrl,
  });
  const evidenceHash = createHash("sha256").update(payloadToHash).digest("hex");

  const created = await prisma.mattingConsentRecord.create({
    data: {
      salonId,
      clientId: id,
      templateId: template.id,
      ownerFullName: parsed.data.ownerFullName.trim(),
      petName: parsed.data.petName.trim(),
      formDate,
      consentDematting: parsed.data.consentDematting,
      consentUnderMatsShave: parsed.data.consentUnderMatsShave,
      additionalNotes: parsed.data.additionalNotes?.trim() || null,
      acknowledgedRisk: parsed.data.acknowledgedRisk,
      signerFullName: parsed.data.signerFullName.trim(),
      signerDocumentId,
      legalTextSnapshot,
      templateVersion: template.version,
      signatureDataUrl,
      evidenceHash,
      ipAddress,
      userAgent,
      signedAt,
      createdById: auth.session.user.id,
    },
    select: { id: true },
  });

  await addAuditLog({
    salonId,
    userId: auth.session.user.id,
    action: "SIGN_MATTING_CONSENT",
    entityType: "CLIENT",
    entityId: id,
    metaJson: {
      mattingConsentId: created.id,
      signedAt: signedAt.toISOString(),
      ownerFullName: parsed.data.ownerFullName.trim(),
      petName: parsed.data.petName.trim(),
      consentDematting: parsed.data.consentDematting,
      consentUnderMatsShave: parsed.data.consentUnderMatsShave,
      evidenceHash,
    },
  });

  return NextResponse.json({ ok: true });
}
