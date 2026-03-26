import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { getActiveFirstVisitAnamnesisTemplate } from "@/lib/anamnesis";
import { addAuditLog } from "@/lib/audit";
import { signFirstVisitAnamnesisSchema } from "@/lib/validators";

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

  const [client, salon] = await Promise.all([
    prisma.client.findFirst({
      where: { id, salonId, deletedAt: null },
      select: { id: true },
    }),
    prisma.salon.findUnique({
      where: { id: salonId },
      select: { firstVisitAnamnesisEnabled: true },
    }),
  ]);

  if (!client) return NextResponse.json({ error: "Cliente non trovato" }, { status: 404 });

  if (!salon?.firstVisitAnamnesisEnabled) {
    return NextResponse.json({
      enabled: false,
      template: null,
      history: [],
      active: null,
    });
  }

  const [template, history] = await Promise.all([
    getActiveFirstVisitAnamnesisTemplate(salonId),
    prisma.firstVisitAnamnesisRecord.findMany({
      where: { salonId, clientId: id },
      orderBy: [{ signedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        ownerFullName: true,
        ownerPhone: true,
        petName: true,
        petType: true,
        petBreed: true,
        petAge: true,
        isSeniorDeclared: true,
        diseasesDeclared: true,
        veterinarianName: true,
        hasMicrochip: true,
        socialPhotoConsent: true,
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
  ]);

  const active = history.find((row) => !row.revokedAt) || null;

  return NextResponse.json({
    enabled: true,
    template: template
      ? {
          id: template.id,
          title: template.title,
          legalText: template.legalText,
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

  const [client, salon] = await Promise.all([
    prisma.client.findFirst({
      where: { id, salonId, deletedAt: null },
      select: { id: true, nome: true, cognome: true, telefono: true },
    }),
    prisma.salon.findUnique({
      where: { id: salonId },
      select: { firstVisitAnamnesisEnabled: true },
    }),
  ]);

  if (!client) return NextResponse.json({ error: "Cliente non trovato" }, { status: 404 });
  if (!salon?.firstVisitAnamnesisEnabled) {
    return NextResponse.json({ error: "Modulo anamnesi prima volta disattivato in impostazioni." }, { status: 400 });
  }

  const body = await req.json();
  const parsed = signFirstVisitAnamnesisSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const template = await getActiveFirstVisitAnamnesisTemplate(salonId);
  if (!template) {
    return NextResponse.json({ error: "Template anamnesi mancante. Verifica configurazione sede." }, { status: 400 });
  }

  const signatureDataUrl = parsed.data.signatureDataUrl;
  if (signatureDataUrl.length > 500_000) {
    return NextResponse.json({ error: "Firma troppo grande, riprova con una firma piu semplice." }, { status: 400 });
  }

  const signedAt = new Date();
  const ipAddress = getRequestIp(req);
  const userAgent = req.headers.get("user-agent");
  const signerDocumentId = parsed.data.signerDocumentId?.trim() || null;

  const payloadToHash = JSON.stringify({
    signedAt: signedAt.toISOString(),
    ownerFullName: parsed.data.ownerFullName.trim(),
    ownerPhone: parsed.data.ownerPhone.trim(),
    petName: parsed.data.petName.trim(),
    petType: parsed.data.petType?.trim() || null,
    petBreed: parsed.data.petBreed?.trim() || null,
    petAge: parsed.data.petAge?.trim() || null,
    isSeniorDeclared: parsed.data.isSeniorDeclared,
    diseasesDeclared: parsed.data.diseasesDeclared?.trim() || null,
    veterinarianName: parsed.data.veterinarianName?.trim() || null,
    hasMicrochip: parsed.data.hasMicrochip ?? null,
    socialPhotoConsent: parsed.data.socialPhotoConsent ?? null,
    additionalNotes: parsed.data.additionalNotes?.trim() || null,
    acknowledgedRisk: parsed.data.acknowledgedRisk,
    signerFullName: parsed.data.signerFullName.trim(),
    signerDocumentId,
    templateId: template.id,
    templateVersion: template.version,
    legalText: template.legalText,
    ipAddress,
    userAgent,
    signatureDataUrl,
  });

  const evidenceHash = createHash("sha256").update(payloadToHash).digest("hex");

  const created = await prisma.firstVisitAnamnesisRecord.create({
    data: {
      salonId,
      clientId: id,
      templateId: template.id,
      ownerFullName: parsed.data.ownerFullName.trim(),
      ownerPhone: parsed.data.ownerPhone.trim(),
      petName: parsed.data.petName.trim(),
      petType: parsed.data.petType?.trim() || null,
      petBreed: parsed.data.petBreed?.trim() || null,
      petAge: parsed.data.petAge?.trim() || null,
      isSeniorDeclared: parsed.data.isSeniorDeclared,
      diseasesDeclared: parsed.data.diseasesDeclared?.trim() || null,
      veterinarianName: parsed.data.veterinarianName?.trim() || null,
      hasMicrochip: parsed.data.hasMicrochip ?? null,
      socialPhotoConsent: parsed.data.socialPhotoConsent ?? null,
      additionalNotes: parsed.data.additionalNotes?.trim() || null,
      acknowledgedRisk: parsed.data.acknowledgedRisk,
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
    select: { id: true },
  });

  await addAuditLog({
    salonId,
    userId: auth.session.user.id,
    action: "SIGN_FIRST_VISIT_ANAMNESIS",
    entityType: "CLIENT",
    entityId: id,
    metaJson: {
      anamnesisId: created.id,
      signedAt: signedAt.toISOString(),
      signerFullName: parsed.data.signerFullName.trim(),
      ownerFullName: parsed.data.ownerFullName.trim(),
      petName: parsed.data.petName.trim(),
      evidenceHash,
    },
  });

  return NextResponse.json({ ok: true });
}
