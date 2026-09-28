import { MetaError } from "@/lib/meta-errors";
import { consumeSignupState, createSignupState, verifySignupState } from "@/lib/meta-signup-state";
import { encryptMetaToken, encryptionKey } from "@/lib/meta-token";
import { createMetaGraph, getMetaConfig } from "@/lib/meta-graph";
import { isMetaSignupEnabledForSalon } from "@/lib/meta-rollout";

export type MetaScope = { userId: string; salonId: string };
export type MetaAssets = { businessAccountId: string; phoneNumberId: string };
export type Activation = MetaAssets & { encryptedToken: string; graphVersion: string; displayPhoneNumber: string };
export interface SignupRepository {
  available(salonId: string, phoneNumberId?: string): Promise<string | null>;
  claim(id: string, scope: MetaScope): Promise<boolean>;
  activate(scope: MetaScope, assets: Activation, revision: string | null): Promise<unknown>;
  disconnect(scope: MetaScope): Promise<unknown>;
}
export function parseSignupInput(body: Record<string, unknown>) {
  const string = (key: string) => typeof body[key] === "string" ? body[key].trim() : "";
  const code = string("code"), state = string("state"), pin = string("pin");
  const businessAccountId = string("businessAccountId"), phoneNumberId = string("phoneNumberId");
  if (!code || code.length > 4096 || !state) throw new MetaError("meta_code_or_state_missing");
  if (!/^\d{1,40}$/.test(businessAccountId)) throw new MetaError("meta_waba_missing_or_invalid");
  if (!/^\d{1,40}$/.test(phoneNumberId)) throw new MetaError("meta_phone_missing_or_invalid");
  if (!/^\d{6}$/.test(pin)) throw new MetaError("meta_pin_invalid");
  // Only ordinary FINISH is supported. Coexistence/migration events require a separate contract.
  if (body.event !== "FINISH" || String(body.sessionVersion) !== "3") throw new MetaError("meta_unsupported_signup_result");
  return { code, state, pin, businessAccountId, phoneNumberId };
}
export function createSignupService(repo: SignupRepository, request: typeof fetch = fetch, env: Record<string, string | undefined> = process.env) {
  return {
    async start(scope: MetaScope) {
      const config = getMetaConfig(env);
      if (!isMetaSignupEnabledForSalon(scope.salonId, env)) throw new MetaError("meta_signup_not_enabled_for_salon", 403);
      encryptionKey(env.META_TOKEN_ENCRYPTION_KEY);
      await repo.available(scope.salonId);
      const state = createSignupState(scope, Date.now(), env.META_EMBEDDED_SIGNUP_STATE_SECRET);
      return { appId: config.appId, configurationId: config.configurationId, graphVersion: config.graphVersion, state };
    },
    async complete(scope: MetaScope, body: Record<string, unknown>) {
      const input = parseSignupInput(body);
      const config = getMetaConfig(env);
      if (!isMetaSignupEnabledForSalon(scope.salonId, env)) throw new MetaError("meta_signup_not_enabled_for_salon", 403);
      encryptionKey(env.META_TOKEN_ENCRYPTION_KEY);
      await consumeSignupState(input.state, scope, id => repo.claim(id, scope), Date.now(), env.META_EMBEDDED_SIGNUP_STATE_SECRET);
      const revision = await repo.available(scope.salonId, input.phoneNumberId);
      const graph = createMetaGraph(config, request);
      const token = await graph.exchange(input.code);
      const phone = await graph.verify(token, input.businessAccountId, input.phoneNumberId);
      await graph.finalize(token, phone, input.pin);
      await graph.subscribe(token, input.businessAccountId);
      verifySignupState(input.state, scope, Date.now(), env.META_EMBEDDED_SIGNUP_STATE_SECRET);
      // No credentials or provider changes are persisted until every remote prerequisite succeeds.
      return repo.activate(scope, {
        businessAccountId: input.businessAccountId, phoneNumberId: input.phoneNumberId,
        displayPhoneNumber: phone.display_phone_number!, graphVersion: config.graphVersion,
        encryptedToken: encryptMetaToken(token, scope.salonId, env.META_TOKEN_ENCRYPTION_KEY),
      }, revision);
    },
    disconnect: (scope: MetaScope) => repo.disconnect(scope),
  };
}
