import { createHmac, timingSafeEqual } from "node:crypto";

type RecordValue = Record<string, unknown>;
export type WebhookSalon = {
  id: string;
  whatsappApiPhoneNumberId: string | null;
  whatsappApiBusinessAccountId: string | null;
  whatsappApiEnabled: boolean;
  whatsappConnection: { providerType: string } | null;
};
export type WebhookOutbound = { id: string; salonId: string; externalMessageId: string | null };
export type WebhookDependencies = {
  getVerifyToken(): string | undefined;
  getAppSecret(): string | undefined;
  findSalons(phoneNumberIds: string[]): Promise<WebhookSalon[]>;
  findOutbound(pairs: { salonId: string; externalMessageId: string }[]): Promise<WebhookOutbound[]>;
  log(level: "info" | "warn" | "error", event: string, ids?: Record<string, string | number | null>): void;
};

function record(value: unknown): RecordValue {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
}
function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
// Only bounded technical identifiers enter logs; never bodies, phone numbers or error descriptions.
function identifier(value: unknown): string | null {
  return typeof value === "string" && /^[a-zA-Z0-9_.:=\-]{1,256}$/.test(value) ? value : null;
}
function response(text: string, status = 200) {
  return new Response(text, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

export function verifyMetaSignature(raw: Buffer, signature: string | null, secret: string): boolean {
  if (!/^sha256=[a-fA-F0-9]{64}$/.test(signature || "")) return false;
  const expected = createHmac("sha256", secret).update(raw).digest();
  const received = Buffer.from(signature!.slice(7), "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

function parseChanges(payload: unknown) {
  const root = record(payload);
  if (root.object !== "whatsapp_business_account") return [];
  return array(root.entry).flatMap((entry) => {
    const item = record(entry);
    return array(item.changes).flatMap((change) => {
      const row = record(change);
      if (row.field !== "messages") return [];
      const value = record(row.value);
      if (value.messaging_product !== undefined && value.messaging_product !== "whatsapp") return [];
      const metadata = record(value.metadata);
      return [{
        wabaId: identifier(item.id),
        // A supplied but malformed WABA must not bypass the ownership check.
        invalidWaba: item.id !== undefined && item.id !== null && !identifier(item.id),
        phoneNumberId: identifier(metadata.phone_number_id),
        displayPhoneNumber: typeof metadata.display_phone_number === "string" ? metadata.display_phone_number : null,
        messages: array(value.messages),
        statuses: array(value.statuses),
      }];
    });
  });
}

async function diagnose(payload: unknown, deps: WebhookDependencies) {
  const changes = parseChanges(payload);
  const phoneIds = [...new Set(changes.flatMap((change) => change.phoneNumberId ? [change.phoneNumberId] : []))];
  // Batched, read-only lookups. Never call connection/gateway helpers: some of them write on read.
  const salons = phoneIds.length ? await deps.findSalons(phoneIds) : [];
  const statuses: { salonId: string; externalMessageId: string; status: string; phoneNumberId: string; wabaId: string | null }[] = [];
  for (const change of changes) {
    const ids = { phoneNumberId: change.phoneNumberId, wabaId: change.wabaId };
    if (!change.phoneNumberId || !change.wabaId || change.invalidWaba) {
      deps.log("warn", "meta_webhook_missing_or_invalid_asset", ids);
      continue;
    }
    // Check ambiguity before filtering provider or WABA; stale Meta fields must not hide duplicates.
    const matches = salons.filter((salon) => salon.whatsappApiPhoneNumberId === change.phoneNumberId);
    if (matches.length !== 1) {
      deps.log(matches.length ? "error" : "warn", matches.length ? "meta_webhook_ambiguous_phone" : "meta_webhook_unknown_phone", ids);
      continue;
    }
    const salon = matches[0];
    if (change.wabaId && change.wabaId !== salon.whatsappApiBusinessAccountId) {
      deps.log("warn", "meta_webhook_waba_mismatch", { ...ids, salonId: salon.id });
      continue;
    }
    if (!salon.whatsappApiEnabled || salon.whatsappConnection?.providerType !== "META_EMBEDDED") {
      deps.log("warn", "meta_webhook_inactive_meta_provider", { ...ids, salonId: salon.id });
      continue;
    }
    for (const message of change.messages) {
      const item = record(message);
      deps.log("info", "meta_webhook_inbound", {
        ...ids, salonId: salon.id, messageId: identifier(item.id), messageType: identifier(item.type),
      });
    }
    for (const status of change.statuses) {
      const item = record(status);
      const externalMessageId = identifier(item.id);
      const knownStatus = typeof item.status === "string" && ["sent", "delivered", "read", "failed"].includes(item.status) ? item.status : "unknown";
      if (!externalMessageId) {
        deps.log("warn", "meta_webhook_status_missing_id", { ...ids, salonId: salon.id });
        continue;
      }
      statuses.push({ salonId: salon.id, externalMessageId, status: knownStatus, phoneNumberId: change.phoneNumberId, wabaId: change.wabaId });
    }
  }
  const outbound = statuses.length ? await deps.findOutbound(statuses) : [];
  for (const status of statuses) {
    const matches = outbound.filter((message) => message.salonId === status.salonId && message.externalMessageId === status.externalMessageId);
    deps.log(matches.length === 1 ? "info" : "warn", matches.length === 1 ? "meta_webhook_status_correlated" : "meta_webhook_status_uncorrelated", {
      ...status, outboundMessageId: matches.length === 1 ? matches[0].id : null,
    });
  }
  // Delivery/read/failure notifications are diagnostic only in this phase. Do not map them to
  // queue ACCEPTED/FAILED_PERMANENT or trigger retries; those enums describe dispatch, not delivery.
}

export function createMetaWebhookHandlers(deps: WebhookDependencies) {
  return {
    GET(req: Request) {
      const params = new URL(req.url).searchParams;
      const expected = deps.getVerifyToken();
      const challenge = params.get("hub.challenge");
      if (!expected || params.get("hub.mode") !== "subscribe" || params.get("hub.verify_token") !== expected || !challenge) {
        return response("Forbidden", 403);
      }
      return response(challenge);
    },
    async POST(req: Request) {
      const signature = req.headers.get("x-hub-signature-256");
      if (!/^sha256=[a-fA-F0-9]{64}$/.test(signature || "")) return response("Unauthorized", 401);
      const secret = deps.getAppSecret();
      if (!secret) {
        deps.log("error", "meta_webhook_secret_not_configured");
        return response("Service unavailable", 503);
      }
      let raw: Buffer;
      try {
        raw = Buffer.from(await req.arrayBuffer());
      } catch {
        return response("Bad request", 400);
      }
      if (!verifyMetaSignature(raw, signature, secret)) return response("Unauthorized", 401);
      let payload: unknown;
      try {
        payload = JSON.parse(raw.toString("utf8"));
      } catch {
        return response("Invalid JSON", 400);
      }
      try {
        await diagnose(payload, deps);
      } catch {
        // Do not serialize exceptions: drivers may include connection strings or input data.
        deps.log("error", "meta_webhook_processing_failed");
        return response("Service unavailable", 503);
      }
      return response("EVENT_RECEIVED");
    },
  };
}
