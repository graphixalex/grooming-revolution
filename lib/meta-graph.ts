import { MetaError } from "@/lib/meta-errors";
export type MetaConfig = { appId: string; appSecret: string; configurationId: string; graphVersion: string };
export function getMetaConfig(env: Record<string, string | undefined> = process.env): MetaConfig {
  if (env.META_EMBEDDED_SIGNUP_ENABLED !== "true") throw new MetaError("meta_signup_disabled", 503);
  const appId = env.META_APP_ID?.trim() || "";
  const appSecret = env.META_APP_SECRET?.trim() || "";
  const configurationId = env.META_EMBEDDED_SIGNUP_CONFIGURATION_ID?.trim() || "";
  const graphVersion = env.META_GRAPH_API_VERSION?.trim() || "";
  if (!/^\d+$/.test(appId) || !appSecret || !/^\d+$/.test(configurationId) || !/^v\d+\.\d+$/.test(graphVersion))
    throw new MetaError("meta_configuration_incomplete", 503);
  return { appId, appSecret, configurationId, graphVersion };
}
type Json = Record<string, unknown>;
export type GraphPhone = { id: string; display_phone_number?: string; code_verification_status?: string };
export function createMetaGraph(config: MetaConfig, request: typeof fetch = fetch) {
  async function call<T>(path: string, token: string, query: Record<string, string> = {}, body?: Json): Promise<T> {
    const url = new URL("https://graph.facebook.com/" + config.graphVersion + "/" + path);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    try {
      const response = await request(url, {
        method: body ? "POST" : "GET",
        headers: { Authorization: "Bearer " + token, ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
        cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000),
      });
      const json = await response.json();
      if (!response.ok || json?.error) throw new Error();
      return json as T;
    } catch { throw new MetaError("meta_graph_request_failed", 502); }
  }
  return {
    async exchange(code: string) {
      const endpoint = new URL("https://graph.facebook.com/" + config.graphVersion + "/oauth/access_token");
      try {
        const response = await request(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ client_id: config.appId, client_secret: config.appSecret, code }),
          cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000),
        });
        const data = await response.json();
        if (!response.ok || data?.error || typeof data?.access_token !== "string" || !data.access_token) throw new Error();
        return data.access_token as string;
      } catch { throw new MetaError("meta_code_exchange_failed", 502); }
    },
    async verify(token: string, wabaId: string, phoneId: string) {
      const debug = await call<{ data?: { app_id?: string; is_valid?: boolean; expires_at?: number; data_access_expires_at?: number; scopes?: string[]; granular_scopes?: { scope: string; target_ids?: string[] }[] } }>(
        "debug_token", config.appId + "|" + config.appSecret, { input_token: token },
      );
      const data = debug.data;
      const required = ["whatsapp_business_management", "whatsapp_business_messaging"];
      if (!data?.is_valid || String(data.app_id) !== config.appId || required.some(s => !data.scopes?.includes(s)) ||
          [data.expires_at, data.data_access_expires_at].some(t => typeof t === "number" && t !== 0 && t <= Date.now() / 1000) ||
          !data.granular_scopes?.some(s => s.scope === "whatsapp_business_management" && s.target_ids?.includes(wabaId)) ||
          data.granular_scopes?.some(s => s.scope === "whatsapp_business_messaging" && s.target_ids && !s.target_ids.includes(wabaId)))
        throw new MetaError("meta_assets_not_authorized", 403);
      let after: string | undefined;
      const matches: GraphPhone[] = [];
      // Follow only opaque cursors against our fixed host/path, never Graph-provided URLs.
      for (let page = 0; page < 20; page++) {
        const list = await call<{ data?: GraphPhone[]; paging?: { next?: string; cursors?: { after?: string } } }>(
          wabaId + "/phone_numbers", token,
          { fields: "id,display_phone_number,code_verification_status", limit: "100", ...(after ? { after } : {}) },
        );
        matches.push(...(list.data || []).filter(p => p.id === phoneId));
        if (!list.paging?.next) break;
        after = list.paging.cursors?.after;
        if (!after || page === 19) throw new MetaError("meta_asset_list_incomplete");
      }
      if (matches.length !== 1) throw new MetaError("meta_waba_phone_mismatch");
      const phone = matches[0];
      if (!phone.display_phone_number) throw new MetaError("meta_phone_invalid");
      return phone;
    },
    async finalize(token: string, phone: GraphPhone, pin: string) {
      // Embedded Signup requires phone registration within 14 days. The user chooses the
      // 6-digit two-step verification PIN; it is sent to Meta and is never persisted here.
      if (!/^\d{6}$/.test(pin)) throw new MetaError("meta_pin_invalid");
      if (phone.code_verification_status && phone.code_verification_status !== "VERIFIED")
        throw new MetaError("meta_phone_not_verified", 409);
      const result = await call<{ success?: boolean }>(phone.id + "/register", token, {}, {
        messaging_product: "whatsapp", pin,
      });
      if (result.success !== true) throw new MetaError("meta_phone_registration_failed", 502);
      return phone;
    },
    async subscribe(token: string, wabaId: string) {
      const result = await call<{ success?: boolean }>(wabaId + "/subscribed_apps", token, {}, {});
      if (result.success !== true) throw new MetaError("meta_subscription_failed", 502);
    },
  };
}
