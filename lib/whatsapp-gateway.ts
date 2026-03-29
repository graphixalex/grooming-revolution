import { WhatsAppConnectionStatus } from "@prisma/client";

type GatewayResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; status: number; code: string; message: string; retryable: boolean };

type GatewaySessionSnapshot = {
  status: WhatsAppConnectionStatus;
  rawStatus: string;
  qrReady: boolean;
  initialized: boolean;
  displayPhoneNumber: string | null;
  reason: string | null;
};

function getGatewayBaseUrl() {
  const url = process.env.WHATSAPP_LINKED_GATEWAY_URL?.trim() || "";
  return url.replace(/\/$/, "");
}

function getGatewayApiKey() {
  return process.env.WHATSAPP_GATEWAY_API_KEY?.trim() || "";
}

export function isGatewayConfigured() {
  return Boolean(getGatewayBaseUrl());
}

function normalizeGatewayStatus(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().toLowerCase();
}

function mapGatewayStatus(rawStatus: string): Pick<GatewaySessionSnapshot, "status" | "qrReady" | "initialized" | "reason"> {
  const value = normalizeGatewayStatus(rawStatus);
  if (!value) {
    return { status: "DISCONNECTED", qrReady: false, initialized: false, reason: "gateway_status_missing" };
  }
  if (["connected", "ready", "authenticated", "open", "online"].includes(value)) {
    return { status: "CONNECTED", qrReady: false, initialized: true, reason: null };
  }
  if (["qr_ready", "qr", "waiting_qr", "pending_scan", "scan_qr", "initializing", "starting", "connecting", "pairing"].includes(value)) {
    return { status: "CONNECTING", qrReady: true, initialized: true, reason: null };
  }
  if (["not_initialized", "disconnected", "closed", "stopped"].includes(value)) {
    return { status: "DISCONNECTED", qrReady: false, initialized: false, reason: null };
  }
  if (["auth_failure", "unauthorized", "auth_error", "forbidden"].includes(value)) {
    return { status: "EXPIRED", qrReady: false, initialized: true, reason: "gateway_auth_failure" };
  }
  if (["error", "failed", "degraded"].includes(value)) {
    return { status: "DEGRADED", qrReady: false, initialized: true, reason: "gateway_error_state" };
  }
  return { status: "DEGRADED", qrReady: false, initialized: true, reason: `gateway_unknown_status_${value}` };
}

function buildGatewayError(status: number, code: string, message: string, retryable: boolean): GatewayResult<never> {
  return { ok: false, status, code, message, retryable };
}

async function gatewayFetch<T = any>(path: string, init?: RequestInit & { timeoutMs?: number }): Promise<GatewayResult<T>> {
  const baseUrl = getGatewayBaseUrl();
  if (!baseUrl) {
    return buildGatewayError(503, "GATEWAY_URL_MISSING", "WHATSAPP_LINKED_GATEWAY_URL non configurata", false);
  }

  const controller = new AbortController();
  const timeoutMs = Math.max(1000, Math.min(25000, Number(init?.timeoutMs) || 10000));
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const apiKey = getGatewayApiKey();

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
        ...(init?.headers || {}),
      },
    });
    let json: any = null;
    let rawText = "";
    try {
      rawText = await response.text();
      json = rawText ? JSON.parse(rawText) : null;
    } catch {
      json = null;
    }

    if (!response.ok) {
      const code = typeof json?.code === "string" ? json.code : `HTTP_${response.status}`;
      const message = typeof json?.error === "string" ? json.error : typeof json?.message === "string" ? json.message : "gateway_request_failed";
      const retryable = response.status >= 500 || response.status === 429 || response.status === 408;
      return buildGatewayError(response.status, code, message, retryable);
    }
    const contentType = response.headers.get("content-type") || "";
    return {
      ok: true,
      data: (json || { __rawText: rawText, __contentType: contentType }) as T,
      status: response.status,
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      return buildGatewayError(504, "GATEWAY_TIMEOUT", "Gateway timeout", true);
    }
    return buildGatewayError(503, "GATEWAY_UNREACHABLE", error instanceof Error ? error.message : "gateway_unreachable", true);
  } finally {
    clearTimeout(timeout);
  }
}

export async function gatewayInitSession(salonId: string) {
  return gatewayFetch(`/session/${encodeURIComponent(salonId)}/init`, { method: "POST", body: "{}", timeoutMs: 12000 });
}

export async function gatewayDisconnectSession(salonId: string) {
  return gatewayFetch(`/session/${encodeURIComponent(salonId)}/disconnect`, { method: "POST", body: "{}", timeoutMs: 12000 });
}

export async function gatewayGetStatus(salonId: string): Promise<GatewayResult<GatewaySessionSnapshot>> {
  const response = await gatewayFetch<any>(`/session/${encodeURIComponent(salonId)}/status`, { method: "GET", timeoutMs: 8000 });
  if (!response.ok) return response;

  const raw = response.data || {};
  const rawStatus =
    (typeof raw.status === "string" && raw.status) ||
    (typeof raw.state === "string" && raw.state) ||
    (typeof raw.sessionStatus === "string" && raw.sessionStatus) ||
    "";
  const mapped = mapGatewayStatus(rawStatus);
  const displayPhoneNumber =
    typeof raw.phoneNumber === "string"
      ? raw.phoneNumber
      : typeof raw.displayPhoneNumber === "string"
        ? raw.displayPhoneNumber
        : null;

  return {
    ok: true,
    status: response.status,
    data: {
      status: mapped.status,
      rawStatus: rawStatus || "unknown",
      qrReady: mapped.qrReady || Boolean(raw.qrReady) || Boolean(raw.qrAvailable),
      initialized: mapped.initialized || Boolean(raw.initialized),
      displayPhoneNumber,
      reason: mapped.reason,
    },
  };
}

export async function gatewayGetQr(salonId: string): Promise<GatewayResult<{ qrData: string; expiresAt?: string | null }>> {
  const response = await gatewayFetch<any>(`/session/${encodeURIComponent(salonId)}/qr`, { method: "GET", timeoutMs: 8000 });
  if (!response.ok) return response;

  const raw = response.data || {};
  const qrDataRaw =
    (typeof raw.qr === "string" && raw.qr) ||
    (typeof raw.qrCode === "string" && raw.qrCode) ||
    (typeof raw.qrData === "string" && raw.qrData) ||
    (typeof raw.data === "string" && raw.data) ||
    "";
  const rawHtml = typeof raw.__rawText === "string" ? raw.__rawText : "";
  const htmlImgMatch = rawHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
  const htmlImg = htmlImgMatch?.[1] || "";
  const htmlSaysNotReady = /qr non ancora disponibile/i.test(rawHtml);
  const htmlExpiresMatch = rawHtml.match(/Scade:\s*<\/strong>\s*([^<]+)/i);
  const htmlExpires = htmlExpiresMatch?.[1]?.trim() || null;
  if (!qrDataRaw && !htmlImg) {
    if (htmlSaysNotReady) {
      return buildGatewayError(409, "QR_PENDING", "QR in preparazione: riprovi tra pochi secondi", true);
    }
    return buildGatewayError(404, "QR_NOT_AVAILABLE", "QR non disponibile per questa sessione", false);
  }

  let qrData = (qrDataRaw || htmlImg).trim();
  if (!qrData.startsWith("data:image/")) {
    const likelyBase64 = /^[A-Za-z0-9+/=\r\n]+$/.test(qrData) && qrData.length > 80;
    if (likelyBase64) qrData = `data:image/png;base64,${qrData.replace(/\s+/g, "")}`;
  }

  return {
    ok: true,
    status: response.status,
    data: {
      qrData,
      expiresAt: typeof raw.expiresAt === "string" ? raw.expiresAt : htmlExpires,
    },
  };
}

export async function gatewaySendMessage(input: {
  salonId: string;
  to: string;
  text: string;
  messageId: string;
  metadata?: Record<string, unknown> | null;
}): Promise<
  GatewayResult<{
    accepted: boolean;
    externalId: string | null;
    providerStatus: string;
  }>
> {
  const payload = {
    to: input.to,
    text: input.text,
    messageId: input.messageId,
    metadata: input.metadata || {},
  };
  const response = await gatewayFetch<any>(`/session/${encodeURIComponent(input.salonId)}/send`, {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 15000,
  });
  if (!response.ok) return response;

  const raw = response.data || {};
  const accepted = raw.accepted !== false;
  const externalId =
    typeof raw.id === "string"
      ? raw.id
      : typeof raw.messageId === "string"
        ? raw.messageId
        : typeof raw.externalId === "string"
          ? raw.externalId
          : null;
  const providerStatus =
    typeof raw.status === "string"
      ? raw.status
      : accepted
        ? "accepted"
        : "rejected";

  return {
    ok: true,
    status: response.status,
    data: { accepted, externalId, providerStatus },
  };
}
