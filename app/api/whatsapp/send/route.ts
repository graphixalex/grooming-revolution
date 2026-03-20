import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { normalizePhone } from "@/lib/reminders";

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

  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: {
      whatsappApiEnabled: true,
      whatsappApiPhoneNumberId: true,
      whatsappApiAccessToken: true,
      whatsappApiVersion: true,
    },
  });

  if (!salon?.whatsappApiEnabled) {
    return NextResponse.json({ mode: "manual", url: manualUrl });
  }

  const to = normalizePhone(body.phone || "");
  if (!to || !salon.whatsappApiPhoneNumberId || !salon.whatsappApiAccessToken) {
    return NextResponse.json({
      mode: "manual",
      url: manualUrl,
      warning: "Configurazione API incompleta o numero non valido, uso invio manuale.",
    });
  }

  const apiVersion = salon.whatsappApiVersion || "v23.0";
  const endpoint = `https://graph.facebook.com/${apiVersion}/${salon.whatsappApiPhoneNumberId}/messages`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${salon.whatsappApiAccessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text, preview_url: false },
      }),
    });
    const json = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        mode: "manual",
        url: manualUrl,
        warning: "Errore WhatsApp API, fallback manuale.",
        apiError: json?.error?.message || "unknown_error",
      });
    }

    return NextResponse.json({
      mode: "api",
      messageId: json?.messages?.[0]?.id || null,
    });
  } catch {
    return NextResponse.json({
      mode: "manual",
      url: manualUrl,
      warning: "Connessione API non riuscita, fallback manuale.",
    });
  }
}
