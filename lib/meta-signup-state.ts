import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { MetaError } from "@/lib/meta-errors";
export const STATE_TTL_MS = 30 * 60 * 1000;
type Scope = { userId: string; salonId: string };
export type StatePayload = Scope & { nonce: string; iat: number };
function secret(raw = process.env.META_EMBEDDED_SIGNUP_STATE_SECRET) {
  if (!raw || Buffer.byteLength(raw) < 32) throw new MetaError("meta_state_not_configured", 503);
  return raw;
}
export function createSignupState(scope: Scope, now = Date.now(), key?: string) {
  const payload = Buffer.from(JSON.stringify({ ...scope, nonce: randomBytes(24).toString("hex"), iat: now })).toString("base64url");
  return payload + "." + createHmac("sha256", secret(key)).update(payload).digest("base64url");
}
export function verifySignupState(state: string, scope: Scope, now = Date.now(), key?: string): StatePayload {
  const parts = state.split(".");
  if (parts.length !== 2 || state.length > 2048) throw new MetaError("meta_invalid_state");
  const [body, signature] = parts;
  const expected = createHmac("sha256", secret(key)).update(body).digest("base64url");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new MetaError("meta_invalid_state");
  let payload: StatePayload;
  try { payload = JSON.parse(Buffer.from(body, "base64url").toString()); } catch { throw new MetaError("meta_invalid_state"); }
  if (payload.userId !== scope.userId || payload.salonId !== scope.salonId) throw new MetaError("meta_state_scope_mismatch", 403);
  if (!Number.isSafeInteger(payload.iat) || payload.iat > now || now - payload.iat >= STATE_TTL_MS || !/^[a-f0-9]{48}$/.test(payload.nonce)) throw new MetaError("meta_state_expired");
  return payload;
}
export function signupReceiptId(state: string) {
  return "meta-signup:" + createHash("sha256").update(state).digest("hex");
}
// A unique AuditLog primary key is an atomic, durable receipt across serverless instances.
// Never delete these receipts before the corresponding signed state has expired.
export async function consumeSignupState(state: string, scope: Scope, claim: (id: string) => Promise<boolean>, now = Date.now(), key?: string) {
  verifySignupState(state, scope, now, key);
  if (!await claim(signupReceiptId(state))) throw new MetaError("meta_state_already_used", 409);
}
