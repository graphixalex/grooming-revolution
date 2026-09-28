export function isMetaProvider(provider?: string | null) { return provider === "META_EMBEDDED"; }
export function qrActionDenied(provider?: string | null) {
  return isMetaProvider(provider) ? {
    ok: false as const, status: 409, code: "META_PROVIDER_ACTIVE",
    message: "Usare la disconnessione Meta prima delle azioni QR.", retryable: false,
  } : null;
}
export function hasCredentialPatch(body: Record<string, unknown>) {
  return ["whatsappApiEnabled", "whatsappApiPhoneNumberId", "whatsappApiAccessToken", "whatsappApiVersion",
    "whatsappApiBusinessAccountId", "whatsappApiDisplayPhoneNumber", "whatsappApiConnectedAt", "providerType"]
    .some(key => Object.hasOwn(body, key));
}
export function allowsCredentialPatch(provider?: string | null) { return provider === "LEGACY_META"; }
