// Server-only: Node crypto. Never import this module from a client component.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { MetaError } from "@/lib/meta-errors";
const PREFIX = "meta:v1:";
export function encryptionKey(raw = process.env.META_TOKEN_ENCRYPTION_KEY): Buffer {
  if (!raw || !/^[a-fA-F0-9]{64}$/.test(raw)) throw new MetaError("meta_encryption_not_configured", 503);
  return Buffer.from(raw, "hex");
}
export function encryptMetaToken(token: string, salonId: string, rawKey?: string): string {
  const key = encryptionKey(rawKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from("meta:v1:" + salonId));
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return PREFIX + [iv, cipher.getAuthTag(), encrypted].map(v => v.toString("base64url")).join(".");
}
export function decryptMetaToken(value: string, salonId: string, rawKey?: string): string {
  try {
    if (!value.startsWith(PREFIX)) throw new Error();
    const parts = value.slice(PREFIX.length).split(".");
    if (parts.length !== 3 || parts.some(p => !/^[A-Za-z0-9_-]+$/.test(p))) throw new Error();
    const [iv, tag, data] = parts.map(p => Buffer.from(p, "base64url"));
    if (iv.length !== 12 || tag.length !== 16 || !data.length) throw new Error();
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(rawKey), iv);
    decipher.setAAD(Buffer.from("meta:v1:" + salonId));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch { throw new MetaError("meta_credentials_unavailable", 503); }
}
export function tokenForProvider(value: string, salonId: string, provider: "LEGACY_META" | "META_EMBEDDED", rawKey?: string) {
  if (provider === "META_EMBEDDED" || value.startsWith("meta:")) return decryptMetaToken(value, salonId, rawKey);
  return value; // Existing LEGACY_META plaintext is neither rewritten nor encrypted on read.
}
