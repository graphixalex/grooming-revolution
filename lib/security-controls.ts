import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const FALLBACK_MAX_KEYS = 20_000;
const fallbackRateStore = new Map<string, { count: number; firstTs: number }>();
const fallbackIdempotencyStore = new Map<string, number>();
const limiterCache = new Map<string, Ratelimit>();

let redisClient: Redis | null | undefined;

function getRedisClient() {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

function pruneFallbackRateStore(now: number, windowMs: number) {
  if (fallbackRateStore.size <= FALLBACK_MAX_KEYS) return;
  for (const [key, value] of fallbackRateStore.entries()) {
    if (now - value.firstTs > windowMs) {
      fallbackRateStore.delete(key);
    }
  }
}

function pruneFallbackIdempotencyStore(now: number) {
  if (fallbackIdempotencyStore.size <= FALLBACK_MAX_KEYS) return;
  for (const [key, expiresAt] of fallbackIdempotencyStore.entries()) {
    if (now >= expiresAt) {
      fallbackIdempotencyStore.delete(key);
    }
  }
}

function buildLimiter(bucket: string, limit: number, windowSec: number) {
  const cacheKey = `${bucket}:${limit}:${windowSec}`;
  const existing = limiterCache.get(cacheKey);
  if (existing) return existing;

  const redis = getRedisClient();
  if (!redis) return null;

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
    analytics: false,
    prefix: `sec:${bucket}`,
  });
  limiterCache.set(cacheKey, limiter);
  return limiter;
}

export async function isRateLimited(input: {
  bucket: string;
  key: string;
  limit: number;
  windowSec: number;
}) {
  const limiter = buildLimiter(input.bucket, input.limit, input.windowSec);
  if (limiter) {
    const result = await limiter.limit(input.key);
    return !result.success;
  }

  const now = Date.now();
  const storeKey = `${input.bucket}:${input.key}`;
  const windowMs = input.windowSec * 1000;
  const entry = fallbackRateStore.get(storeKey);
  if (!entry || now - entry.firstTs > windowMs) {
    fallbackRateStore.set(storeKey, { count: 1, firstTs: now });
    pruneFallbackRateStore(now, windowMs);
    return false;
  }

  entry.count += 1;
  fallbackRateStore.set(storeKey, entry);
  pruneFallbackRateStore(now, windowMs);
  return entry.count > input.limit;
}

export async function markIdempotentOnce(input: {
  bucket: string;
  key: string;
  ttlSec: number;
}) {
  const redis = getRedisClient();
  const storageKey = `idmp:${input.bucket}:${input.key}`;

  if (redis) {
    const result = await redis.set(storageKey, "1", {
      nx: true,
      ex: input.ttlSec,
    });
    return result === "OK";
  }

  const now = Date.now();
  const expiresAt = fallbackIdempotencyStore.get(storageKey);
  if (expiresAt && expiresAt > now) return false;

  fallbackIdempotencyStore.set(storageKey, now + input.ttlSec * 1000);
  pruneFallbackIdempotencyStore(now);
  return true;
}
