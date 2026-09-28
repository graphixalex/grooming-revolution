import { tokenForProvider } from "@/lib/meta-token";
export type MetaSalonCredentials = {
  whatsappApiEnabled: boolean; whatsappApiPhoneNumberId: string | null;
  whatsappApiAccessToken: string | null; whatsappApiVersion: string | null;
  whatsappConnection: { providerType: string; status: string } | null;
};
export async function sendMetaText(
  input: { salonId: string; phone: string; text: string },
  getCredentials: (salonId: string) => Promise<MetaSalonCredentials | null>,
  request: typeof fetch = fetch,
) {
  const config = await getCredentials(input.salonId);
  if (!config?.whatsappApiEnabled || !config.whatsappApiPhoneNumberId || !config.whatsappApiAccessToken ||
      config.whatsappConnection?.providerType !== "META_EMBEDDED" ||
      !["CONNECTED", "DEGRADED"].includes(config.whatsappConnection.status) ||
      !/^\d+$/.test(config.whatsappApiPhoneNumberId) || !/^v\d+\.\d+$/.test(config.whatsappApiVersion || ""))
    return { ok: false as const, error: "meta_not_configured" };
  if (!/^\+?\d{7,15}$/.test(input.phone) || !input.text.trim())
    return { ok: false as const, error: "invalid_phone_or_text" };
  try {
    const token = tokenForProvider(config.whatsappApiAccessToken, input.salonId, "META_EMBEDDED");
    const response = await request("https://graph.facebook.com/" + config.whatsappApiVersion + "/" + config.whatsappApiPhoneNumberId + "/messages", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ messaging_product: "whatsapp", to: input.phone.replace(/^\+/, ""), type: "text", text: { body: input.text, preview_url: false } }),
      redirect: "error", signal: AbortSignal.timeout(15000),
    });
    const data = await response.json();
    if (!response.ok || typeof data?.messages?.[0]?.id !== "string") return { ok: false as const, error: "meta_send_failed" };
    return { ok: true as const, messageId: data.messages[0].id as string };
  } catch { return { ok: false as const, error: "meta_send_unavailable" }; }
}
