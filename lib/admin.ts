const DEFAULT_PLATFORM_ADMINS = ["ceciliagrooming@gmail.com"];

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getConfiguredPlatformAdmins() {
  const raw = process.env.PLATFORM_ADMIN_EMAILS || "";
  const envEmails = raw
    .split(",")
    .map((item) => normalizeEmail(item))
    .filter(Boolean);

  return new Set([...DEFAULT_PLATFORM_ADMINS, ...envEmails]);
}

export function isPlatformAdminEmail(email?: string | null) {
  if (!email) return false;
  return getConfiguredPlatformAdmins().has(normalizeEmail(email));
}
