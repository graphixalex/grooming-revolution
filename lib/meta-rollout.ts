export function isMetaSignupEnabledForSalon(
  salonId: string,
  env: Record<string, string | undefined> = process.env,
) {
  if (env.META_EMBEDDED_SIGNUP_ENABLED !== "true") return false;
  const raw = env.META_EMBEDDED_SIGNUP_SALON_ALLOWLIST?.trim();
  if (!raw) return true;
  const allowed = new Set(raw.split(",").map(value => value.trim()).filter(Boolean));
  return allowed.has(salonId);
}
