export type SignupResult = { code: string; phoneNumberId: string; businessAccountId: string; event: "FINISH"; sessionVersion: "3" };
export function createSignupAttempt() {
  let code: string | undefined, assets: Omit<SignupResult, "code"> | undefined, settled = false;
  let resolve!: (value: SignupResult) => void, reject!: (error: Error) => void;
  const result = new Promise<SignupResult>((yes, no) => { resolve = yes; reject = no; });
  function fail(reason: string) { if (!settled) { settled = true; reject(new Error(reason)); } }
  function finish() { if (!settled && code && assets) { settled = true; resolve({ code, ...assets }); } }
  return {
    result, fail,
    oauth(value?: string | null) {
      if (settled) return;
      if (!value) return fail("meta_cancelled");
      if (code && code !== value) return fail("meta_ambiguous_result");
      code = value; finish();
    },
    event(payload: unknown) {
      if (settled || !payload || typeof payload !== "object") return;
      const p = payload as Record<string, unknown>;
      if (p.type !== "WA_EMBEDDED_SIGNUP") return;
      if (p.event === "CANCEL") return fail("meta_cancelled");
      if (p.event === "ERROR") return fail("meta_signup_error");
      if (p.event !== "FINISH") return fail("meta_unsupported_signup_result");
      if (String(p.version) !== "3") return fail("meta_session_version_unverified");
      const data = p.data as Record<string, unknown> | undefined;
      if (!data || typeof data.phone_number_id !== "string" || typeof data.waba_id !== "string" ||
          !/^\d{1,40}$/.test(data.phone_number_id) || !/^\d{1,40}$/.test(data.waba_id)) return fail("meta_assets_missing");
      const next = { phoneNumberId: data.phone_number_id, businessAccountId: data.waba_id, event: "FINISH" as const, sessionVersion: "3" as const };
      if (assets && (assets.phoneNumberId !== next.phoneNumberId || assets.businessAccountId !== next.businessAccountId))
        return fail("meta_ambiguous_result");
      assets = next; finish();
    },
  };
}
