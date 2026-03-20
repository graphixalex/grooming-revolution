import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/reminders";

export async function getSalonWhatsAppApiConfig(salonId: string) {
  return prisma.salon.findUnique({
    where: { id: salonId },
    select: {
      whatsappApiEnabled: true,
      whatsappApiPhoneNumberId: true,
      whatsappApiAccessToken: true,
      whatsappApiVersion: true,
      nomeAttivita: true,
    },
  });
}

export async function sendWhatsAppTextViaApi(input: {
  salonId: string;
  phone: string;
  text: string;
}) {
  const config = await getSalonWhatsAppApiConfig(input.salonId);
  if (!config?.whatsappApiEnabled || !config.whatsappApiPhoneNumberId || !config.whatsappApiAccessToken) {
    return { ok: false as const, error: "whatsapp_api_not_configured" };
  }

  const to = normalizePhone(input.phone);
  if (!to) return { ok: false as const, error: "invalid_phone" };

  const endpoint = `https://graph.facebook.com/${config.whatsappApiVersion || "v23.0"}/${config.whatsappApiPhoneNumberId}/messages`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.whatsappApiAccessToken}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: input.text, preview_url: false },
    }),
  });
  const json = await response.json();
  if (!response.ok) {
    return { ok: false as const, error: json?.error?.message || "whatsapp_api_error" };
  }
  return { ok: true as const, messageId: json?.messages?.[0]?.id || null };
}
