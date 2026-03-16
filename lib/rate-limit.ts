const loginAttempts = new Map<string, { count: number; firstTs: number }>();

export function checkLoginRateLimit(key: string, max = 10, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry) {
    loginAttempts.set(key, { count: 1, firstTs: now });
    return true;
  }

  if (now - entry.firstTs > windowMs) {
    loginAttempts.set(key, { count: 1, firstTs: now });
    return true;
  }

  entry.count += 1;
  loginAttempts.set(key, entry);
  return entry.count <= max;
}

