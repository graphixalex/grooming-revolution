import { NextRequest } from "next/server";

function normalizeIpCandidate(raw: string | null | undefined) {
  if (!raw) return null;
  const value = raw.trim();
  if (!value || value.length > 64) return null;

  // Allow common IPv4/IPv6 representations and drop anything else.
  if (!/^[0-9a-fA-F:.]+$/.test(value)) return null;
  return value;
}

function firstForwardedIp(xForwardedFor: string | null | undefined) {
  if (!xForwardedFor) return null;
  const first = xForwardedFor.split(",")[0];
  return normalizeIpCandidate(first);
}

export function getClientIpFromHeaders(headers: Headers | undefined) {
  const forwarded = firstForwardedIp(headers?.get("x-forwarded-for"));
  if (forwarded) return forwarded;

  const realIp = normalizeIpCandidate(headers?.get("x-real-ip"));
  if (realIp) return realIp;

  return "unknown";
}

export function getClientIp(req: NextRequest) {
  return getClientIpFromHeaders(req.headers);
}
