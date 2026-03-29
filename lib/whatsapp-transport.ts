import { WhatsAppProviderType } from "@prisma/client";
import { sendWhatsAppTextViaApi } from "@/lib/whatsapp";
import { gatewaySendMessage } from "@/lib/whatsapp-gateway";

export type TransportSendInput = {
  salonId: string;
  messageId: string;
  recipientPhone: string;
  messageText: string;
  metadata?: Record<string, unknown> | null;
};

export type TransportSendResult = {
  accepted: boolean;
  externalId?: string | null;
  providerStatus: string;
  reasonCode?: string;
  reasonMessage?: string;
  retryable?: boolean;
};

export interface WhatsAppTransport {
  providerType: WhatsAppProviderType;
  send(input: TransportSendInput): Promise<TransportSendResult>;
}

class LegacyMetaAdapter implements WhatsAppTransport {
  providerType: WhatsAppProviderType = "LEGACY_META";

  async send(input: TransportSendInput): Promise<TransportSendResult> {
    const result = await sendWhatsAppTextViaApi({
      salonId: input.salonId,
      phone: input.recipientPhone,
      text: input.messageText,
    });
    if (result.ok) {
      return {
        accepted: true,
        externalId: result.messageId || null,
        providerStatus: "accepted_meta",
      };
    }
    return {
      accepted: false,
      providerStatus: "meta_rejected",
      reasonCode: normalizeReasonCode(result.error),
      reasonMessage: result.error || "meta_send_failed",
      retryable: isRetryableReason(result.error),
    };
  }
}

class LinkedSessionAdapter implements WhatsAppTransport {
  providerType: WhatsAppProviderType = "LINKED_SESSION";

  async send(input: TransportSendInput): Promise<TransportSendResult> {
    const response = await gatewaySendMessage({
      salonId: input.salonId,
      to: input.recipientPhone,
      text: input.messageText,
      messageId: input.messageId,
      metadata: input.metadata || {},
    });
    if (!response.ok) {
      const code = normalizeReasonCode(response.code);
      const nonRetryable =
        code.includes("NOT_CONNECTED") ||
        code.includes("SESSION_NOT_READY") ||
        code.includes("QR_NOT_SCANNED") ||
        code.includes("AUTH_FAILURE") ||
        code.includes("INVALID_PHONE");
      return {
        accepted: false,
        providerStatus: "linked_rejected",
        reasonCode: code,
        reasonMessage: response.message || "linked_send_failed",
        retryable: nonRetryable ? false : response.retryable,
      };
    }

    return {
      accepted: response.data.accepted,
      externalId: response.data.externalId,
      providerStatus: response.data.providerStatus || "accepted_linked",
      reasonCode: response.data.accepted ? undefined : "LINKED_REJECTED",
      reasonMessage: response.data.accepted ? undefined : "linked_rejected",
      retryable: response.data.accepted ? false : true,
    };
  }
}

const adapters: Record<WhatsAppProviderType, WhatsAppTransport> = {
  LEGACY_META: new LegacyMetaAdapter(),
  LINKED_SESSION: new LinkedSessionAdapter(),
};

export function getTransport(providerType: WhatsAppProviderType) {
  return adapters[providerType] || adapters.LINKED_SESSION;
}

function normalizeReasonCode(raw?: string | null) {
  const value = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, "_");
  return value || "UNKNOWN";
}

export function isRetryableReason(raw?: string | null) {
  const value = normalizeReasonCode(raw);
  if (!value) return true;
  if (value.includes("INVALID_PHONE")) return false;
  if (value.includes("NOT_CONFIGURED")) return false;
  if (value.includes("MISSING")) return false;
  return true;
}
