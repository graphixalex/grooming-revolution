import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireApiSession } from "@/lib/api-auth";
import { normalizePhone } from "@/lib/reminders";
import { sendWhatsAppTextViaApi } from "@/lib/whatsapp";

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

  try {
    const sent = await sendWhatsAppTextViaApi({ salonId, phone: body.phone || "", text });
    if (sent.ok) {
      return NextResponse.json({
        mode: "api",
        messageId: sent.messageId,
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
