import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";

type ModuleDoc = {
  id: string;
  moduleType: "PRIVACY" | "ANAMNESI" | "NODI";
  ownerName: string;
  signerName: string;
  signedAt: string;
  status: "ATTIVO" | "REVOCATO";
  title: string;
};

export async function GET(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;

  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const clientId = req.nextUrl.searchParams.get("clientId")?.trim() || "";

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
    orderBy: [{ nome: "asc" }, { cognome: "asc" }],
    take: 50,
    select: {
      id: true,
      nome: true,
      cognome: true,
      telefono: true,
      email: true,
      dogs: { where: { deletedAt: null }, select: { nome: true } },
    },
  });

  if (!clientId) {
    return NextResponse.json({ clients, selectedClient: null, documents: [] });
  }

  const selectedClient = await prisma.client.findFirst({
    where: { id: clientId, salonId, deletedAt: null },
    select: {
      id: true,
      nome: true,
      cognome: true,
      telefono: true,
      email: true,
      dogs: { where: { deletedAt: null }, select: { nome: true } },
    },
  });

  if (!selectedClient) {
    return NextResponse.json({ clients, selectedClient: null, documents: [] });
  }

  const [privacyRows, anamnesisRows, mattingRows] = await Promise.all([
    prisma.clientConsent.findMany({
      where: { salonId, clientId },
      orderBy: [{ signedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        kind: true,
        granted: true,
        evidenceHash: true,
        signerFullName: true,
        signedAt: true,
        revokedAt: true,
      },
    }),
    prisma.firstVisitAnamnesisRecord.findMany({
      where: { salonId, clientId },
      orderBy: [{ signedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        ownerFullName: true,
        signerFullName: true,
        signedAt: true,
        revokedAt: true,
      },
    }),
    prisma.mattingConsentRecord.findMany({
      where: { salonId, clientId },
      orderBy: [{ signedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        ownerFullName: true,
        signerFullName: true,
        signedAt: true,
        revokedAt: true,
      },
    }),
  ]);

  const privacyByHash = new Map<string, (typeof privacyRows)[number][]>();
  for (const row of privacyRows) {
    const list = privacyByHash.get(row.evidenceHash) || [];
    list.push(row);
    privacyByHash.set(row.evidenceHash, list);
  }

  const docs: ModuleDoc[] = [];

  for (const [evidenceHash, rows] of privacyByHash.entries()) {
    const first = rows[0];
    const dataProcessing = rows.find((row) => row.kind === "DATA_PROCESSING");
    const isActive = Boolean(dataProcessing?.granted && !dataProcessing?.revokedAt);
    docs.push({
      id: evidenceHash,
      moduleType: "PRIVACY",
      ownerName: `${selectedClient.nome} ${selectedClient.cognome}`,
      signerName: first.signerFullName,
      signedAt: first.signedAt.toISOString(),
      status: isActive ? "ATTIVO" : "REVOCATO",
      title: "Consensi privacy e immagini",
    });
  }

  for (const row of anamnesisRows) {
    docs.push({
      id: row.id,
      moduleType: "ANAMNESI",
      ownerName: row.ownerFullName,
      signerName: row.signerFullName,
      signedAt: row.signedAt.toISOString(),
      status: row.revokedAt ? "REVOCATO" : "ATTIVO",
      title: "Anamnesi prima volta",
    });
  }

  for (const row of mattingRows) {
    docs.push({
      id: row.id,
      moduleType: "NODI",
      ownerName: row.ownerFullName,
      signerName: row.signerFullName,
      signedAt: row.signedAt.toISOString(),
      status: row.revokedAt ? "REVOCATO" : "ATTIVO",
      title: "Consenso in caso di nodi",
    });
  }

  docs.sort((a, b) => new Date(b.signedAt).getTime() - new Date(a.signedAt).getTime());

  return NextResponse.json({ clients, selectedClient, documents: docs });
}
