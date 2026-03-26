import crypto from "node:crypto";

function getPaddleBaseUrl() {
  return process.env.PADDLE_ENV === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";
}

export function getRequiredPaddleEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} mancante`);
  }
  return value;
}

export async function paddleApiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const apiKey = getRequiredPaddleEnv("PADDLE_API_KEY");
  const response = await fetch(`${getPaddleBaseUrl()}${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage =
      payload?.error?.detail ||
      payload?.error?.message ||
      payload?.error ||
      `Errore Paddle (${response.status})`;
    throw new Error(String(errorMessage));
  }
  return payload.data as T;
}

function safeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

export function verifyPaddleSignature(rawBody: string, signatureHeader: string, secret: string) {
  let timestamp = "";
  const signatures: string[] = [];

  for (const part of signatureHeader.split(";")) {
    const [rawKey, rawValue] = part.split("=");
    if (!rawKey || !rawValue) continue;
    const key = rawKey.trim();
    const value = rawValue.trim().replace(/^"|"$/g, "");
    if (key === "ts") timestamp = value;
    if (key === "h1") signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}:${rawBody}`)
    .digest("hex");

  return signatures.some((signature) => safeEqualHex(signature, expected));
}

