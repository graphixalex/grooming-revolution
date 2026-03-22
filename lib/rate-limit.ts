const loginAttempts = new Map<string, { count: number; firstTs: number }>();
const registerAttempts = new Map<string, { count: number; firstTs: number }>();
const MAX_TRACKED_KEYS = 5000;

function normalizeEntry(key: string, now: number, windowMs: number) {
  const entry = loginAttempts.get(key);
  if (!entry) return null;
  if (now - entry.firstTs > windowMs) {
    loginAttempts.delete(key);
    return null;
  }
  return entry;
}

function pruneAttempts(now: number, windowMs: number) {
  if (loginAttempts.size <= MAX_TRACKED_KEYS) return;

  for (const [key, entry] of loginAttempts.entries()) {
    if (now - entry.firstTs > windowMs) {
      loginAttempts.delete(key);
    }
  }

  if (loginAttempts.size <= MAX_TRACKED_KEYS) return;

  const sortedByAge = [...loginAttempts.entries()].sort((a, b) => a[1].firstTs - b[1].firstTs);
  const toDelete = loginAttempts.size - MAX_TRACKED_KEYS;
  for (let i = 0; i < toDelete; i += 1) {
    loginAttempts.delete(sortedByAge[i][0]);
  }
}

function normalizeEntryForStore(
  store: Map<string, { count: number; firstTs: number }>,
  key: string,
  now: number,
  windowMs: number,
) {
  const entry = store.get(key);
  if (!entry) return null;
  if (now - entry.firstTs > windowMs) {
    store.delete(key);
    return null;
  }
  return entry;
}

function pruneAttemptsForStore(
  store: Map<string, { count: number; firstTs: number }>,
  now: number,
  windowMs: number,
) {
  if (store.size <= MAX_TRACKED_KEYS) return;

  for (const [key, entry] of store.entries()) {
    if (now - entry.firstTs > windowMs) {
      store.delete(key);
    }
  }

  if (store.size <= MAX_TRACKED_KEYS) return;

  const sortedByAge = [...store.entries()].sort((a, b) => a[1].firstTs - b[1].firstTs);
  const toDelete = store.size - MAX_TRACKED_KEYS;
  for (let i = 0; i < toDelete; i += 1) {
    store.delete(sortedByAge[i][0]);
  }
}

export function isLoginRateLimited(key: string, max = 10, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const entry = normalizeEntry(key, now, windowMs);
  return Boolean(entry && entry.count >= max);
}

export function recordFailedLoginAttempt(key: string, max = 10, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const entry = normalizeEntry(key, now, windowMs);
  if (!entry) {
    loginAttempts.set(key, { count: 1, firstTs: now });
    pruneAttempts(now, windowMs);
    return 1 <= max;
  }

  entry.count += 1;
  loginAttempts.set(key, entry);
  pruneAttempts(now, windowMs);
  return entry.count <= max;
}

export function clearLoginRateLimit(key: string) {
  loginAttempts.delete(key);
}

export function isRegisterRateLimited(key: string, max = 5, windowMs = 30 * 60 * 1000) {
  const now = Date.now();
  const entry = normalizeEntryForStore(registerAttempts, key, now, windowMs);
  return Boolean(entry && entry.count >= max);
}

export function recordRegisterAttempt(key: string, max = 5, windowMs = 30 * 60 * 1000) {
  const now = Date.now();
  const entry = normalizeEntryForStore(registerAttempts, key, now, windowMs);
  if (!entry) {
    registerAttempts.set(key, { count: 1, firstTs: now });
    pruneAttemptsForStore(registerAttempts, now, windowMs);
    return 1 <= max;
  }

  entry.count += 1;
  registerAttempts.set(key, entry);
  pruneAttemptsForStore(registerAttempts, now, windowMs);
  return entry.count <= max;
}

export function clearRegisterRateLimit(key: string) {
  registerAttempts.delete(key);
}

