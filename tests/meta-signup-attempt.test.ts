import test from "node:test";
import assert from "node:assert/strict";
import { createSignupAttempt } from "@/lib/meta-signup-attempt";
const event = { type: "WA_EMBEDDED_SIGNUP", event: "FINISH", version: 3, data: { phone_number_id: "100", waba_id: "200" } };
test("OAuth then FINISH", async () => {
  const attempt = createSignupAttempt(); attempt.oauth("code"); attempt.event(event);
  assert.deepEqual(await attempt.result, { code: "code", phoneNumberId: "100", businessAccountId: "200", event: "FINISH", sessionVersion: "3" });
});
test("FINISH then OAuth", async () => {
  const attempt = createSignupAttempt(); attempt.event(event); attempt.oauth("code");
  assert.equal((await attempt.result).code, "code");
});
for (const name of ["CANCEL", "ERROR"]) test(name + " is terminal; later code/FINISH ignored", async () => {
  const attempt = createSignupAttempt();
  attempt.event({ ...event, event: name }); attempt.oauth("code"); attempt.event(event);
  await assert.rejects(attempt.result);
});
test("new attempt never inherits previous selection", async () => {
  const old = createSignupAttempt(); old.event(event); old.fail("cancel"); await assert.rejects(old.result);
  const next = createSignupAttempt(); next.oauth("new"); next.fail("timeout");
  await assert.rejects(next.result, /timeout/);
});
test("inconsistent assets, invalid session version, empty OAuth and SDK failure reject", async () => {
  const a = createSignupAttempt(); a.event(event); a.event({ ...event, data: { ...event.data, waba_id: "999" } }); await assert.rejects(a.result);
  const b = createSignupAttempt(); b.event({ ...event, version: 2 }); await assert.rejects(b.result);
  const c = createSignupAttempt(); c.oauth(); await assert.rejects(c.result);
  const d = createSignupAttempt(); d.fail("sdk_unavailable"); await assert.rejects(d.result);
});
