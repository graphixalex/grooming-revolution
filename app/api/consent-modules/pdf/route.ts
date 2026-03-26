import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ConsentKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { buildControllerBlock, enrichLegalText } from "@/lib/legal-forms";

type ModuleType = "PRIVACY" | "ANAMNESI" | "NODI";

function decodeDataUrlPng(dataUrl: string) {
  const prefix = "data:image/png;base64,";
  if (!dataUrl.startsWith(prefix)) return null;
  return dataUrl.slice(prefix.length);
}

function sanitizeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function wrapText(text: string, maxChars = 100) {
  const out: string[] = [];
  const lines = text.split("\n");
  for (const line of lines) {
    const words = line.split(" ");
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length <= maxChars) {
        current = next;
      } else {
        if (current) out.push(current);
        current = word;
      }
    }
    if (current) out.push(current);
    if (!line.trim()) out.push("");
  }
  return out;
}

async function buildPdf(title: string, rows: Array<{ label: string; value: string }>, legalText: string, signatureDataUrl?: string | null) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 800;

  page.drawText("Grooming Revolution - Moduli consensi", {
    x: 40,
    y,
    size: 10,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  y -= 24;
  page.drawText(title, {
    x: 40,
    y,
    size: 18,
    font: bold,
    color: rgb(0.08, 0.12, 0.24),
  });

  y -= 26;
  for (const row of rows) {
    const valueLines = wrapText(row.value || "-");
    page.drawText(`${row.label}:`, { x: 40, y, size: 11, font: bold });
    y -= 14;
    for (const line of valueLines) {
      if (y < 80) break;
      page.drawText(line || " ", { x: 40, y, size: 11, font });
      y -= 13;
    }
    y -= 6;
    if (y < 80) break;
  }

  if (y > 180) {
    page.drawText("Testo legale:", { x: 40, y, size: 11, font: bold });
    y -= 14;
    const legalLines = wrapText(legalText, 105).slice(0, 26);
    for (const line of legalLines) {
      if (y < 120) break;
      page.drawText(line || " ", { x: 40, y, size: 10, font, color: rgb(0.15, 0.15, 0.15) });
      y -= 12;
    }
  }

  if (signatureDataUrl) {
    const base64 = decodeDataUrlPng(signatureDataUrl);
    if (base64) {
      try {
        const png = await doc.embedPng(Buffer.from(base64, "base64"));
        const boxWidth = 260;
        const boxHeight = 80;
        const scale = Math.min(boxWidth / png.width, boxHeight / png.height, 1);
        const drawWidth = png.width * scale;
        const drawHeight = png.height * scale;
        const drawX = 48 + (boxWidth - drawWidth) / 2;
        const drawY = 34 + (boxHeight - drawHeight) / 2;
        page.drawText("Firma", { x: 40, y: 92, size: 11, font: bold });
        page.drawRectangle({ x: 40, y: 30, width: 276, height: 88, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1 });
        page.drawImage(png, {
          x: drawX,
          y: drawY,
          width: drawWidth,
          height: drawHeight,
        });
      } catch {
        // ignore bad signature image
      }
    }
  }

  return Buffer.from(await doc.save());
}

export async function GET(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;

  const type = (req.nextUrl.searchParams.get("type") || "").toUpperCase() as ModuleType;
  const id = req.nextUrl.searchParams.get("id") || "";

  if (!type || !id || !["PRIVACY", "ANAMNESI", "NODI"].includes(type)) {
    return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
  }

  if (type === "PRIVACY") {
    const [rows, salon] = await Promise.all([
      prisma.clientConsent.findMany({
        where: { salonId, evidenceHash: id },
        orderBy: [{ signedAt: "desc" }, { createdAt: "desc" }],
        include: { client: { select: { nome: true, cognome: true, telefono: true } } },
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

    if (!rows.length) return NextResponse.json({ error: "Documento non trovato" }, { status: 404 });

    const first = rows[0];
    const byKind = new Map<ConsentKind, (typeof rows)[number]>();
    for (const row of rows) {
      if (!byKind.has(row.kind)) byKind.set(row.kind, row);
    }
    const toStatus = (kind: ConsentKind) => {
      const row = byKind.get(kind);
      if (!row) return "N/D";
      if (!row.granted) return "Non acconsentito";
      if (row.revokedAt) return `Revocato il ${new Date(row.revokedAt).toLocaleString("it-IT")}`;
      return "Acconsentito";
    };
    const companyBlock = salon ? buildControllerBlock(salon) : "Titolare del trattamento: non disponibile";
    const legalText = salon ? enrichLegalText(first.legalTextSnapshot, salon) : first.legalTextSnapshot;

    const pdf = await buildPdf(
      "Consensi privacy e immagini",
      [
        { label: "Proprietario", value: `${first.client.nome} ${first.client.cognome}` },
        { label: "Telefono", value: first.client.telefono || "-" },
        { label: "Dati titolare trattamento", value: companyBlock },
        { label: "Firmatario", value: first.signerFullName },
        { label: "Data firma", value: new Date(first.signedAt).toLocaleString("it-IT") },
        { label: "Trattamento dati", value: toStatus("DATA_PROCESSING") },
        { label: "Foto uso interno", value: toStatus("PHOTO_INTERNAL") },
        { label: "Foto social/web", value: toStatus("PHOTO_SOCIAL") },
      ],
      legalText,
      first.signatureDataUrl,
    );

    const filename = `privacy-${sanitizeFileName(`${first.client.nome}-${first.client.cognome}`)}-${first.id}.pdf`;
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=${filename}`,
      },
    });
  }

  if (type === "ANAMNESI") {
    const [row, salon] = await Promise.all([
      prisma.firstVisitAnamnesisRecord.findFirst({
        where: { salonId, id },
        include: { client: { select: { nome: true, cognome: true } } },
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
    if (!row) return NextResponse.json({ error: "Documento non trovato" }, { status: 404 });
    const companyBlock = salon ? buildControllerBlock(salon) : "Titolare del trattamento: non disponibile";
    const legalText = salon ? enrichLegalText(row.legalTextSnapshot, salon) : row.legalTextSnapshot;

    const pdf = await buildPdf(
      "Anamnesi prima volta",
      [
        { label: "Proprietario", value: row.ownerFullName },
        { label: "Telefono", value: row.ownerPhone },
        { label: "Dati titolare trattamento", value: companyBlock },
        { label: "Animale", value: row.petName },
        { label: "Razza", value: row.petBreed || "-" },
        { label: "Eta", value: row.petAge || "-" },
        { label: "Anziano", value: row.isSeniorDeclared ? "Si" : "No" },
        { label: "Malattie dichiarate", value: row.diseasesDeclared || "No" },
        { label: "Veterinario", value: row.veterinarianName || "-" },
        { label: "Microchip", value: row.hasMicrochip === null ? "Non dichiarato" : row.hasMicrochip ? "Si" : "No" },
        { label: "Consenso foto social", value: row.socialPhotoConsent === null ? "Non dichiarato" : row.socialPhotoConsent ? "Si" : "No" },
        { label: "Firmatario", value: row.signerFullName },
        { label: "Data firma", value: new Date(row.signedAt).toLocaleString("it-IT") },
      ],
      legalText,
      row.signatureDataUrl,
    );

    const filename = `anamnesi-${sanitizeFileName(`${row.client.nome}-${row.client.cognome}`)}-${row.id}.pdf`;
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=${filename}`,
      },
    });
  }

  const [row, salon] = await Promise.all([
    prisma.mattingConsentRecord.findFirst({
      where: { salonId, id },
      include: { client: { select: { nome: true, cognome: true } } },
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
  if (!row) return NextResponse.json({ error: "Documento non trovato" }, { status: 404 });
  const companyBlock = salon ? buildControllerBlock(salon) : "Titolare del trattamento: non disponibile";
  const legalText = salon ? enrichLegalText(row.legalTextSnapshot, salon) : row.legalTextSnapshot;

  const pdf = await buildPdf(
    "Consenso in caso di nodi",
    [
      { label: "Proprietario", value: row.ownerFullName },
      { label: "Dati titolare trattamento", value: companyBlock },
      { label: "Animale", value: row.petName },
      { label: "Data modulo", value: new Date(row.formDate).toLocaleDateString("it-IT") },
      { label: "Consenso snodatura", value: row.consentDematting ? "Si" : "No" },
      { label: "Consenso tosatura sotto nodi", value: row.consentUnderMatsShave ? "Si" : "No" },
      { label: "Firmatario", value: row.signerFullName },
      { label: "Data firma", value: new Date(row.signedAt).toLocaleString("it-IT") },
      { label: "Note", value: row.additionalNotes || "-" },
    ],
    legalText,
    row.signatureDataUrl,
  );

  const filename = `nodi-${sanitizeFileName(`${row.client.nome}-${row.client.cognome}`)}-${row.id}.pdf`;
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=${filename}`,
    },
  });
}
