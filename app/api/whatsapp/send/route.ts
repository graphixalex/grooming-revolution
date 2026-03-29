import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireApiSession } from "@/lib/api-auth";
import { normalizePhone } from "@/lib/reminders";
import { buildDedupKey, enqueueWhatsAppMessage, getOrCreateWhatsAppConnection, processWhatsAppQueueBatch } from "@/lib/whatsapp-queue";
import { getWhatsAppConnectionDiagnostics } from "@/lib/whatsapp-connection";

type SendBody = {
  phone?: string;
  text?: string;
};

function buildManualUrl(phone: string | undefined, text: string) {
  const normalized = normalizePhone(phone || "");
  if (normalized) {
    return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
  }
  return `https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

export async function POST(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;

  const body = (await req.json()) as SendBody;
  const text = String(body.text || "").trim();
  if (!text) {
    return NextResponse.json({ error: "Testo messaggio obbligatorio" }, { status: 400 });
  }

  const manualUrl = buildManualUrl(body.phone, text);
  const normalizedPhone = normalizePhone(body.phone || "");
  if (!normalizedPhone) {
    return NextResponse.json({ error: "Numero telefono non valido" }, { status: 400 });
  }

  try {
    const connectionDiag = await getWhatsAppConnectionDiagnostics(salonId);
    const connection = connectionDiag.connection || (await getOrCreateWhatsAppConnection(salonId));
    if (!(connection.status === "CONNECTED" || connection.status === "DEGRADED")) {
      return NextResponse.json({
        mode: "manual",
        url: manualUrl,
        warning: "WhatsApp non collegato o non operativo per questa sede: usa il fallback manuale.",
      });
    }
    const dedupKey = buildDedupKey([
      salonId,
      "MANUAL_SERVICE",
      normalizedPhone,
      text,
      new Date().toISOString().slice(0, 16),
    ]);
    const queued = await enqueueWhatsAppMessage({
      salonId,
      kind: "MANUAL_SERVICE",
      dedupKey,
      recipientPhone: normalizedPhone,
      messageText: text,
      priority: 15,
      maxAttempts: 3,
      metadataJson: { source: "manual_send_api" },
    });
    const worker = await processWhatsAppQueueBatch({ batchSize: 20, workerId: "manual-send-api" });
    if (queued.created || queued.dedup) {
      return NextResponse.json({
        mode: "queue",
        queued: true,
        dedup: queued.dedup,
        messageId: queued.messageId,
        worker,
      });
    }
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2021" || error.code === "P2022")) {
      return NextResponse.json({ mode: "manual", url: manualUrl });
    }
    return NextResponse.json({
      mode: "manual",
      url: manualUrl,
      warning: "Connessione API non riuscita, fallback manuale.",
    });
  }
  return NextResponse.json({ mode: "manual", url: manualUrl });
}
