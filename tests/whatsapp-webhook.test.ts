import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { createMetaWebhookHandlers, type WebhookDependencies, type WebhookSalon, type WebhookOutbound } from "@/lib/whatsapp-webhook";

// Synthetic fixtures only; no environment files, live database, gateway or Meta calls.
const secret = "synthetic-app-secret";
const verifyToken = "synthetic-verify-token";
const url = "https://example.test/api/whatsapp/webhook";
function salon(overrides: Partial<WebhookSalon> = {}): WebhookSalon {
  return { id: "salon-a", whatsappApiPhoneNumberId: "100", whatsappApiBusinessAccountId: "200", whatsappApiEnabled: true, whatsappConnection: { providerType: "META_EMBEDDED" }, ...overrides };
}
function payload(phone = "100", waba: unknown = "200", values: Record<string, unknown> = {}) {
  return { object: "whatsapp_business_account", entry: [{ id: waba, changes: [{ field: "messages", value: {
    messaging_product: "whatsapp", metadata: { phone_number_id: phone, display_phone_number: "+390000000000" },
    messages: [{ id: "wamid.inbound", type: "text", text: { body: "PRIVATE_MESSAGE" }, from: "PRIVATE_SENDER" }], ...values,
  } }] }] };
}
function request(body: unknown, signature?: string | null) {
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  const signed = signature === undefined ? `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}` : signature;
  return new Request(url, { method: "POST", body: raw, headers: signed === null ? {} : { "X-Hub-Signature-256": signed } });
}
function setup(salons: WebhookSalon[] = [salon()], outbound: WebhookOutbound[] = []) {
  const logs: { level: string; event: string; ids: unknown }[] = [];
  const lookups: string[][] = [];
  const correlations: { salonId: string; externalMessageId: string }[][] = [];
  const deps: WebhookDependencies = {
    getVerifyToken: () => verifyToken,
    getAppSecret: () => secret,
    findSalons: async (ids) => { lookups.push(ids); return salons.filter((row) => ids.includes(row.whatsappApiPhoneNumberId || "")); },
    findOutbound: async (pairs) => { correlations.push(pairs); return outbound; },
    log: (level, event, ids) => { logs.push({ level, event, ids }); },
  };
  return { deps, logs, lookups, correlations, handlers: createMetaWebhookHandlers(deps) };
}

test("GET returns the exact challenge as plain text", async () => {
  const { handlers } = setup();
  const challenge = "000123 + challenge";
  const query = new URLSearchParams({ "hub.mode": "subscribe", "hub.verify_token": verifyToken, "hub.challenge": challenge });
  const result = handlers.GET(new Request(`${url}?${query}`));
  assert.equal(result.status, 200);
  assert.match(result.headers.get("content-type")!, /^text\/plain/);
  assert.equal(await result.text(), challenge);
});

test("GET rejects wrong token, wrong mode, missing challenge and unconfigured secret", () => {
  const { deps } = setup();
  for (const query of [
    `hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123`,
    `hub.mode=other&hub.verify_token=${verifyToken}&hub.challenge=123`,
    `hub.mode=subscribe&hub.verify_token=${verifyToken}`,
  ]) assert.equal(createMetaWebhookHandlers(deps).GET(new Request(`${url}?${query}`)).status, 403);
  deps.getVerifyToken = () => undefined;
  assert.equal(createMetaWebhookHandlers(deps).GET(new Request(`${url}?hub.mode=subscribe&hub.challenge=123`)).status, 403);
});

test("POST rejects missing, malformed, truncated and invalid signatures before parsing or database access", async () => {
  const { handlers, lookups, logs } = setup();
  for (const signature of [null, "", "sha1=abc", "sha256=00", `sha256=${"z".repeat(64)}`, `sha256=${"0".repeat(64)}`]) {
    assert.equal((await handlers.POST(request("not json", signature))).status, 401);
  }
  assert.deepEqual(lookups, []);
  assert.deepEqual(logs, []);
});

test("signature is checked on original bytes, including whitespace and Unicode", async () => {
  const { handlers } = setup();
  const raw = ' { "object": "unknown", "text": "è 🐕" }\n';
  assert.equal((await handlers.POST(request(raw))).status, 200);
  const signature = `sha256=${createHmac("sha256", secret).update(raw.trim()).digest("hex")}`;
  assert.equal((await handlers.POST(request(raw, signature))).status, 401);
});

test("validly signed invalid JSON returns 400; missing app secret returns controlled 503", async () => {
  const { deps, logs } = setup();
  assert.equal((await createMetaWebhookHandlers(deps).POST(request("not json"))).status, 400);
  deps.getAppSecret = () => undefined;
  assert.equal((await createMetaWebhookHandlers(deps).POST(request(payload()))).status, 503);
  assert.equal(logs.at(-1)?.event, "meta_webhook_secret_not_configured");
});

test("unknown and incomplete events are acknowledged without database access", async () => {
  const { handlers, lookups } = setup();
  for (const body of [null, [], {}, { object: "other" }, { object: "whatsapp_business_account", entry: [null, { changes: [null, {}, { field: "other" }, { field: "messages", value: null }] }] }]) {
    assert.equal((await handlers.POST(request(body))).status, 200);
  }
  assert.deepEqual(lookups, []);
});

test("unknown phone number never falls back to another salon", async () => {
  const { handlers, logs, correlations } = setup();
  assert.equal((await handlers.POST(request(payload("999")))).status, 200);
  assert.equal(logs[0].event, "meta_webhook_unknown_phone");
  assert.deepEqual(correlations, []);
});

test("LINKED_SESSION with stale Meta fields remains untouched and is not processed", async () => {
  const linked = Object.freeze(salon({ whatsappConnection: Object.freeze({ providerType: "LINKED_SESSION" }) }));
  const { handlers, logs, correlations } = setup([linked]);
  assert.equal((await handlers.POST(request(payload("100", "200", { statuses: [{ id: "wamid.outbound", status: "failed" }] })))).status, 200);
  assert.deepEqual(logs.map((row) => row.event), ["meta_webhook_inactive_meta_provider"]);
  assert.deepEqual(correlations, []);
  assert.equal(linked.whatsappConnection?.providerType, "LINKED_SESSION");
});

test("WABA mismatch and malformed WABA never route to the salon", async () => {
  for (const waba of ["999", "", {}, 200]) {
    const { handlers, logs, correlations } = setup();
    assert.equal((await handlers.POST(request(payload("100", waba)))).status, 200);
    assert.ok(logs.every((row) => !row.event.includes("inbound")));
    assert.deepEqual(correlations, []);
  }
});

test("duplicate phone associations are rejected before provider or WABA filtering", async () => {
  const { handlers, logs, correlations } = setup([salon(), salon({ id: "salon-b", whatsappApiBusinessAccountId: "999", whatsappConnection: { providerType: "LINKED_SESSION" } })]);
  assert.equal((await handlers.POST(request(payload()))).status, 200);
  assert.equal(logs[0].event, "meta_webhook_ambiguous_phone");
  assert.equal(logs[0].level, "error");
  assert.deepEqual(correlations, []);
});

test("disabled Meta config, missing connection and legacy provider are not implicitly activated", async () => {
  for (const row of [salon({ whatsappApiEnabled: false }), salon({ whatsappConnection: null }), salon({ whatsappConnection: { providerType: "LEGACY_META" } })]) {
    const { handlers, logs } = setup([row]);
    assert.equal((await handlers.POST(request(payload()))).status, 200);
    assert.equal(logs[0].event, "meta_webhook_inactive_meta_provider");
  }
});

test("inbound diagnostics omit message bodies, sender, display phone and arbitrary fields", async () => {
  const { handlers, logs } = setup();
  assert.equal((await handlers.POST(request(payload()))).status, 200);
  assert.equal(logs[0].event, "meta_webhook_inbound");
  assert.doesNotMatch(JSON.stringify(logs), /PRIVATE_MESSAGE|PRIVATE_SENDER|390000000000/);
});

test("all four Meta statuses correlate by tenant and external ID without changing dispatch status", async () => {
  const message = Object.freeze({ id: "outbound-a", salonId: "salon-a", externalMessageId: "wamid.outbound" });
  const { handlers, logs, correlations } = setup([salon()], [message]);
  const statuses = ["sent", "delivered", "read", "failed"].map((status) => ({ id: "wamid.outbound", status, errors: [{ message: "PRIVATE_ERROR" }] }));
  assert.equal((await handlers.POST(request(payload("100", "200", { messages: [], statuses })))).status, 200);
  assert.equal(correlations.length, 1);
  assert.equal(logs.length, 4);
  assert.ok(logs.every((row) => row.event === "meta_webhook_status_correlated"));
  assert.doesNotMatch(JSON.stringify(logs), /PRIVATE_ERROR/);
});

test("same message ID belonging to another tenant is not correlated", async () => {
  const { handlers, logs } = setup([salon()], [{ id: "outbound-b", salonId: "salon-b", externalMessageId: "wamid.outbound" }]);
  await handlers.POST(request(payload("100", "200", { messages: [], statuses: [{ id: "wamid.outbound", status: "read" }] })));
  assert.equal(logs[0].event, "meta_webhook_status_uncorrelated");
  assert.doesNotMatch(JSON.stringify(logs), /outbound-b/);
});

test("batched events for two salons remain isolated with two total lookups", async () => {
  const { handlers, lookups, correlations, logs } = setup([salon(), salon({ id: "salon-b", whatsappApiPhoneNumberId: "101", whatsappApiBusinessAccountId: "201" })], [
    { id: "outbound-a", salonId: "salon-a", externalMessageId: "wamid.a" },
    { id: "outbound-b", salonId: "salon-b", externalMessageId: "wamid.b" },
  ]);
  const a = payload("100", "200", { messages: [], statuses: [{ id: "wamid.a", status: "sent" }] });
  const b = payload("101", "201", { messages: [], statuses: [{ id: "wamid.b", status: "read" }] });
  assert.equal((await handlers.POST(request({ ...a, entry: [...a.entry, ...b.entry] }))).status, 200);
  assert.equal(lookups.length, 1);
  assert.equal(correlations.length, 1);
  assert.equal(logs.filter((row) => row.event === "meta_webhook_status_correlated").length, 2);
});

test("database failure returns controlled retryable 503 without logging exception details", async () => {
  const { deps, logs } = setup();
  deps.findSalons = async () => { throw new Error("PRIVATE_DATABASE_CONNECTION_STRING"); };
  assert.equal((await createMetaWebhookHandlers(deps).POST(request(payload()))).status, 503);
  assert.equal(logs[0].event, "meta_webhook_processing_failed");
  assert.doesNotMatch(JSON.stringify(logs), /PRIVATE_DATABASE/);
});

test("proxy exposes only the exact webhook path; other WhatsApp routes require login", async () => {
  for (const method of ["GET", "POST"]) {
    const result = await proxy(new NextRequest(url, { method }));
    assert.equal(result.headers.get("location"), null);
    assert.equal(result.headers.get("x-middleware-next"), "1");
  }
  for (const path of ["/api/whatsapp/send", "/api/whatsapp/connection", "/api/whatsapp/embedded-signup/start", "/api/whatsapp/webhook-extra", "/api/whatsapp/webhook/child"]) {
    const result = await proxy(new NextRequest(`https://example.test${path}`));
    assert.equal(result.status, 307);
    assert.equal(new URL(result.headers.get("location")!).pathname, "/login");
  }
});
