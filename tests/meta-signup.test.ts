import test from "node:test";
import assert from "node:assert/strict";
import { createSignupService, type SignupRepository, type Activation } from "@/lib/meta-signup-service";
import { createSignupState } from "@/lib/meta-signup-state";
import { decryptMetaToken } from "@/lib/meta-token";
import { MetaError } from "@/lib/meta-errors";

const env = { META_EMBEDDED_SIGNUP_ENABLED: "true", META_APP_ID: "1965515324061483", META_APP_SECRET: "synthetic-app-secret", META_EMBEDDED_SIGNUP_CONFIGURATION_ID: "1593016965602579",
  META_GRAPH_API_VERSION: "v26.0", META_EMBEDDED_SIGNUP_STATE_SECRET: "synthetic-state-secret-at-least-32-bytes", META_TOKEN_ENCRYPTION_KEY: "ab".repeat(32) };
const scope = { userId: "user-a", salonId: "salon-a" };
function setup(options: { mismatch?: boolean; subscriptionFails?: boolean; registrationFails?: boolean; otherSalon?: boolean; verification?: string; scopeDenied?: boolean; activationFails?: boolean } = {}) {
  const calls: { path: string; method: string; authorization: string | null }[] = [], activated: Activation[] = [], receipts = new Set<string>();
  const repo: SignupRepository = {
    available: async (_salon, phone) => { if (phone && options.otherSalon) throw new MetaError("meta_phone_already_assigned", 409); return null; },
    claim: async id => { if (receipts.has(id)) return false; receipts.add(id); return true; },
    activate: async (_scope, data) => { if (options.activationFails) throw new MetaError("meta_connection_changed_retry", 409); activated.push(data); return { ok: true }; },
    disconnect: async () => ({ ok: true }),
  };
  const request: typeof fetch = async (input, init) => {
    const url = new URL(String(input)), path = url.pathname;
    calls.push({ path, method: init?.method || "GET", authorization: new Headers(init?.headers).get("authorization") });
    if (path.endsWith("/oauth/access_token")) return Response.json({ access_token: "synthetic-salon-token" });
    if (path.endsWith("/debug_token")) return Response.json({ data: { app_id: env.META_APP_ID, is_valid: true,
      scopes: ["whatsapp_business_management", "whatsapp_business_messaging"],
      granular_scopes: [{ scope: "whatsapp_business_management", target_ids: [options.scopeDenied ? "999" : "200"] }] } });
    if (path.endsWith("/200/phone_numbers")) return Response.json({ data: [{
      id: options.mismatch ? "999" : "100", display_phone_number: "+390000000000",
      code_verification_status: options.verification || "VERIFIED",
    }] });
    if (path.endsWith("/100/register")) return Response.json(options.registrationFails ? { error: { message: "PRIVATE_GRAPH_DETAILS" } } : { success: true }, { status: options.registrationFails ? 400 : 200 });
    if (path.endsWith("/200/subscribed_apps")) return Response.json(options.subscriptionFails ? { error: { message: "PRIVATE_GRAPH_DETAILS" } } : { success: true }, { status: options.subscriptionFails ? 400 : 200 });
    throw Error("Unexpected network request " + path);
  };
  const service = createSignupService(repo, request, env);
  const body = () => ({ code: "synthetic-code", state: createSignupState(scope, Date.now(), env.META_EMBEDDED_SIGNUP_STATE_SECRET),
    businessAccountId: "200", phoneNumberId: "100", pin: "482731", event: "FINISH", sessionVersion: "3" });
  return { service, body, calls, activated, receipts };
}
test("start returns public config/state only", async () => {
  const f = setup(), result = await f.service.start(scope);
  assert.equal(result.configurationId, env.META_EMBEDDED_SIGNUP_CONFIGURATION_ID);
  assert.doesNotMatch(JSON.stringify(result), /synthetic-app-secret|TOKEN_ENCRYPTION|access_token/);
});
test("rollout allowlist blocks start and complete before repository or Graph access", async () => {
  let touched = false;
  const repo: SignupRepository = {
    available: async () => { touched = true; return null; },
    claim: async () => { touched = true; return true; },
    activate: async () => { touched = true; return {}; },
    disconnect: async () => ({}),
  };
  const blockedEnv = { ...env, META_EMBEDDED_SIGNUP_SALON_ALLOWLIST: "another-salon" };
  const service = createSignupService(repo, async () => { touched = true; throw Error("network"); }, blockedEnv);
  await assert.rejects(service.start(scope), /meta_signup_not_enabled_for_salon/);
  const blockedBody = {
    code: "synthetic-code", state: createSignupState(scope, Date.now(), blockedEnv.META_EMBEDDED_SIGNUP_STATE_SECRET),
    businessAccountId: "200", phoneNumberId: "100", pin: "482731", event: "FINISH", sessionVersion: "3",
  };
  await assert.rejects(service.complete(scope, blockedBody), /meta_signup_not_enabled_for_salon/);
  assert.equal(touched, false);
});
test("successful graph verification/subscription precedes encrypted activation", async () => {
  const f = setup(); await f.service.complete(scope, f.body());
  assert.equal(f.activated.length, 1);
  assert.equal(decryptMetaToken(f.activated[0].encryptedToken, scope.salonId, env.META_TOKEN_ENCRYPTION_KEY), "synthetic-salon-token");
  assert.equal(f.calls[0]?.path, "/v26.0/oauth/access_token");
  assert.equal(f.calls[0]?.authorization, null);
  assert.equal(f.calls.at(-1)?.path, "/v26.0/200/subscribed_apps");
  assert.equal(f.calls.at(-1)?.method, "POST");
  assert.equal(f.calls.at(-1)?.authorization, "Bearer synthetic-salon-token");
  assert.ok(f.calls.some(c => c.path === "/v26.0/100/register" && c.method === "POST"));
});
test("phone metadata is resolved through the WABA list before registration", async () => {
  const f = setup(); await f.service.complete(scope, f.body());
  assert.ok(f.calls.some(c => c.path === "/v26.0/200/phone_numbers"));
  assert.equal(f.calls.some(c => c.path === "/v26.0/100" && c.method === "GET"), false);
});
for (const key of ["businessAccountId", "phoneNumberId"] as const) test(key + " is mandatory; no first-asset fallback", async () => {
  const f = setup(); await assert.rejects(f.service.complete(scope, { ...f.body(), [key]: "" }));
  assert.equal(f.calls.length, 0); assert.equal(f.activated.length, 0);
});
test("registration PIN must be exactly six digits and never reaches Graph when invalid", async () => {
  const f = setup();
  await assert.rejects(f.service.complete(scope, { ...f.body(), pin: "12345" }), /meta_pin_invalid/);
  assert.equal(f.calls.length, 0); assert.equal(f.activated.length, 0);
});
for (const [name, options] of [
  ["WABA/phone mismatch", { mismatch: true }], ["another salon", { otherSalon: true }],
  ["token target scope mismatch", { scopeDenied: true }], ["registration failure", { registrationFails: true }],
  ["subscription failure", { subscriptionFails: true }], ["number not verified", { verification: "EXPIRED" }],
  ["concurrent connection change", { activationFails: true }],
] as const) test(name + " never activates provider", async () => {
  const f = setup(options); await assert.rejects(f.service.complete(scope, f.body()));
  assert.equal(f.activated.length, 0);
});
test("state stays consumed after remote failure and cannot be replayed", async () => {
  const f = setup({ subscriptionFails: true }), body = f.body();
  await assert.rejects(f.service.complete(scope, body));
  const calls = f.calls.length;
  await assert.rejects(f.service.complete(scope, body), /meta_state_already_used/);
  assert.equal(f.calls.length, calls);
});
test("unsupported session version/flow fails before Graph", async () => {
  const f = setup();
  await assert.rejects(f.service.complete(scope, { ...f.body(), sessionVersion: "2" }));
  await assert.rejects(f.service.complete(scope, { ...f.body(), event: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING" }));
  assert.equal(f.calls.length, 0);
});
