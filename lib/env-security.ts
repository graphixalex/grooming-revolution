const REQUIRED_ENV_BY_SCOPE = {
  auth: ["NEXTAUTH_SECRET"],
  paddle: ["PADDLE_ENV", "PADDLE_API_KEY", "PADDLE_PRICE_ID_PRO", "PADDLE_WEBHOOK_SECRET"],
  rateLimit: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
  cron: ["CRON_SECRET"],
} as const;

type EnvScope = keyof typeof REQUIRED_ENV_BY_SCOPE;

const checkedScopes = new Set<EnvScope>();

export function assertCriticalEnv(scope: EnvScope) {
  if (process.env.NODE_ENV !== "production") return;
  if (checkedScopes.has(scope)) return;

  const requiredKeys = REQUIRED_ENV_BY_SCOPE[scope];
  const missing = requiredKeys.filter((key) => {
    const value = process.env[key];
    return !value || !value.trim();
  });

  if (missing.length > 0) {
    throw new Error(
      `[SECURITY_ENV_MISCONFIG] Missing required env for ${scope}: ${missing.join(", ")}`,
    );
  }

  checkedScopes.add(scope);
}
