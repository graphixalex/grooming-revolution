import test from "node:test";
import assert from "node:assert/strict";
import { createSignupState, verifySignupState, consumeSignupState, STATE_TTL_MS } from "@/lib/meta-signup-state";
import { encryptMetaToken, decryptMetaToken, tokenForProvider, encryptionKey } from "@/lib/meta-token";
import { assertMetaAccess, type MetaUser } from "@/lib/meta-authorization";
import { getMetaConfig } from "@/lib/meta-graph";
import { hasCredentialPatch, allowsCredentialPatch } from "@/lib/meta-provider-policy";
import { salonJson } from "@/lib/salon-response";
import { isMetaSignupEnabledForSalon } from "@/lib/meta-rollout";
const key = "ab".repeat(32), secret = "synthetic-state-secret-at-least-32-bytes";
const scope = { userId: "user-a", salonId: "salon-a" }, now = 1000000;
test("state valid and bound to user/salon", () => {
  const state = createSignupState(scope, now, secret);
  assert.equal(verifySignupState(state, scope, now, secret).salonId, scope.salonId);
});
test("state alteration, expiry, future timestamp and cross-user/tenant fail closed", () => {
  const state = createSignupState(scope, now, secret);
  for (const [value, context, at] of [
    [state + "x", scope, now], [state, scope, now + STATE_TTL_MS],
    [state, scope, now - 1], [state, { ...scope, userId: "other" }, now],
    [state, { ...scope, salonId: "other" }, now],
  ] as const) assert.throws(() => verifySignupState(value, context, at, secret));
});
test("one durable receipt wins concurrent state consumption", async () => {
  const state = createSignupState(scope, now, secret), receipts = new Set<string>();
  const claim = async (id: string) => { if (receipts.has(id)) return false; receipts.add(id); return true; };
  const results = await Promise.allSettled([1, 2].map(() => consumeSignupState(state, scope, claim, now, secret)));
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(results.filter(r => r.status === "rejected").length, 1);
});
test("receipt persistence failure never allows signup", async () => {
  await assert.rejects(consumeSignupState(createSignupState(scope, now, secret), scope, async () => { throw Error("db unavailable"); }, now, secret));
});
test("AES-GCM random IV, round trip, tenant AAD, tampering, wrong key and malformed envelopes", () => {
  const a = encryptMetaToken("synthetic-token", scope.salonId, key), b = encryptMetaToken("synthetic-token", scope.salonId, key);
  assert.notEqual(a, b); assert.equal(decryptMetaToken(a, scope.salonId, key), "synthetic-token");
  assert.throws(() => decryptMetaToken(a, "other-salon", key));
  assert.throws(() => decryptMetaToken(a, scope.salonId, "cd".repeat(32)));
  assert.throws(() => decryptMetaToken(a.slice(0, -2) + "xx", scope.salonId, key));
  for (const value of ["plaintext", "meta:v2:invalid", "meta:v1:x.x.x"]) assert.throws(() => decryptMetaToken(value, scope.salonId, key));
  for (const value of ["", "a".repeat(32), "g".repeat(64)]) assert.throws(() => encryptionKey(value));
});
test("legacy plaintext stays compatible, embedded plaintext is rejected, encrypted token is omitted recursively", async () => {
  assert.equal(tokenForProvider("legacy-token", "salon", "LEGACY_META"), "legacy-token");
  assert.throws(() => tokenForProvider("legacy-token", "salon", "META_EMBEDDED", key));
  const token = encryptMetaToken("token", "salon", key);
  assert.equal(tokenForProvider(token, "salon", "LEGACY_META", key), "token");
  assert.deepEqual(await salonJson({ salon: { id: "salon", whatsappApiAccessToken: token } }).json(), { salon: { id: "salon" } });
});
const user: MetaUser = { id: "user", salonId: "a", ruolo: "OWNER", canAccessGroupSalons: false, salon: { salonGroupId: "g" } };
test("RBAC owner/manager allowed, staff/deleted user denied", () => {
  assert.doesNotThrow(() => assertMetaAccess(user, "a", "g"));
  assert.doesNotThrow(() => assertMetaAccess({ ...user, ruolo: "MANAGER" }, "a", "g"));
  assert.throws(() => assertMetaAccess({ ...user, ruolo: "STAFF" }, "a", "g"));
  assert.throws(() => assertMetaAccess(null, "a", "g"));
});
test("RBAC cross-salon access requires existing group membership and permission", () => {
  assert.doesNotThrow(() => assertMetaAccess(user, "b", "g"));
  assert.throws(() => assertMetaAccess(user, "b", "other-group"));
  assert.throws(() => assertMetaAccess({ ...user, ruolo: "MANAGER" }, "b", "g"));
  assert.doesNotThrow(() => assertMetaAccess({ ...user, ruolo: "MANAGER", canAccessGroupSalons: true }, "b", "g"));
});
test("configuration requires rollout flag, explicit ID and secrets; no fallback", () => {
  const complete = { META_APP_ID: "1965515324061483", META_APP_SECRET: "test-secret",
    META_EMBEDDED_SIGNUP_CONFIGURATION_ID: "1593016965602579", META_GRAPH_API_VERSION: "v26.0" };
  assert.throws(() => getMetaConfig(complete), /meta_signup_disabled/);
  assert.throws(() => getMetaConfig({ ...complete, META_EMBEDDED_SIGNUP_ENABLED: "true", META_EMBEDDED_SIGNUP_CONFIGURATION_ID: "" }));
  assert.equal(getMetaConfig({ ...complete, META_EMBEDDED_SIGNUP_ENABLED: "true" }).configurationId, "1593016965602579");
});
test("Meta rollout supports a global kill switch and optional per-salon allowlist", () => {
  assert.equal(isMetaSignupEnabledForSalon("salon-a", { META_EMBEDDED_SIGNUP_ENABLED: "false" }), false);
  assert.equal(isMetaSignupEnabledForSalon("salon-a", { META_EMBEDDED_SIGNUP_ENABLED: "true" }), true);
  assert.equal(isMetaSignupEnabledForSalon("salon-a", {
    META_EMBEDDED_SIGNUP_ENABLED: "true", META_EMBEDDED_SIGNUP_SALON_ALLOWLIST: "salon-b, salon-c",
  }), false);
  assert.equal(isMetaSignupEnabledForSalon("salon-a", {
    META_EMBEDDED_SIGNUP_ENABLED: "true", META_EMBEDDED_SIGNUP_SALON_ALLOWLIST: " salon-a , salon-b ",
  }), true);
});
test("settings credential writes are exclusively legacy, provider injection is detected", () => {
  assert.equal(hasCredentialPatch({ section: "templates", whatsappTemplate: "hi" }), false);
  assert.equal(hasCredentialPatch({ whatsappApiAccessToken: "" }), true);
  assert.equal(hasCredentialPatch({ providerType: "META_EMBEDDED" }), true);
  assert.equal(allowsCredentialPatch("META_EMBEDDED"), false);
  assert.equal(allowsCredentialPatch("LINKED_SESSION"), false);
  assert.equal(allowsCredentialPatch("LEGACY_META"), true);
});
