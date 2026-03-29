import crypto from "node:crypto";
import { Prisma, WhatsAppConnectionStatus, WhatsAppMessageKind, WhatsAppMessageStatus, WhatsAppProviderType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTransport } from "@/lib/whatsapp-transport";
import { gatewayGetStatus } from "@/lib/whatsapp-gateway";

const MAX_BATCH_DEFAULT = 50;
const LOCK_TTL_MS = 45_000;
const BASE_BACKOFF_SECONDS = 30;
const MAX_BACKOFF_SECONDS = 60 * 30;
const FAILURE_THRESHOLD_DEGRADED = 6;
const FAILURE_THRESHOLD_DISABLED = 18;

type EnqueueParams = {
  salonId: string;
  kind: WhatsAppMessageKind;
  dedupKey: string;
  recipientPhone: string;
  messageText: string;
  priority?: number;
  scheduledAt?: Date;
  appointmentId?: string | null;
  dogId?: string | null;
  campaignId?: string | null;
  campaignRecipientId?: string | null;
  logicalVersion?: number;
  maxAttempts?: number;
  metadataJson?: Prisma.InputJsonValue;
};

type EnqueueResult =
  | { created: true; messageId: string; dedup: false }
  | { created: false; messageId: string; dedup: true };

function jitteredBackoffSeconds(attempt: number) {
  const raw = Math.min(MAX_BACKOFF_SECONDS, BASE_BACKOFF_SECONDS * Math.pow(2, Math.max(0, attempt - 1)));
  const jitter = Math.floor(raw * (0.2 + Math.random() * 0.4));
  return raw + jitter;
}

function previewText(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= 160) return normalized;
  return `${normalized.slice(0, 157)}...`;
}

export function buildDedupKey(parts: Array<string | number | null | undefined>) {
  const base = parts.map((p) => String(p ?? "")).join("|");
  return crypto.createHash("sha256").update(base).digest("hex");
}

export async function getOrCreateWhatsAppConnection(salonId: string) {
  const existing = await prisma.whatsAppConnection.findUnique({
    where: { salonId },
  });
  if (existing) return existing;
  return prisma.whatsAppConnection.create({
    data: {
      salonId,
      providerType: "LINKED_SESSION",
      status: "DISCONNECTED",
      metadataJson: {},
    },
  });
}

export async function enqueueWhatsAppMessage(params: EnqueueParams): Promise<EnqueueResult> {
  const connection = await getOrCreateWhatsAppConnection(params.salonId);
  try {
    const created = await prisma.whatsAppOutboundMessage.create({
      data: {
        salonId: params.salonId,
        connectionId: connection.id,
        kind: params.kind,
        dedupKey: params.dedupKey,
        recipientPhone: params.recipientPhone,
        messageText: params.messageText,
        messagePreview: previewText(params.messageText),
        priority: params.priority ?? defaultPriority(params.kind),
        status: "QUEUED",
        scheduledAt: params.scheduledAt ?? new Date(),
        nextAttemptAt: params.scheduledAt ?? new Date(),
        appointmentId: params.appointmentId || null,
        dogId: params.dogId || null,
        campaignId: params.campaignId || null,
        campaignRecipientId: params.campaignRecipientId || null,
        logicalVersion: params.logicalVersion ?? 1,
        maxAttempts: params.maxAttempts ?? defaultMaxAttempts(params.kind),
        metadataJson: params.metadataJson ?? {},
      },
      select: { id: true },
    });
    await createDeliveryEvent({
      salonId: params.salonId,
      outboundMessageId: created.id,
      status: "QUEUED",
      eventType: "ENQUEUED",
      dedupKey: params.dedupKey,
      reasonCode: "ENQUEUED",
      reasonMessage: `Message enqueued (${params.kind})`,
    });
    return { created: true, messageId: created.id, dedup: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.whatsAppOutboundMessage.findFirst({
        where: { salonId: params.salonId, dedupKey: params.dedupKey },
        select: { id: true },
      });
      return { created: false, messageId: existing?.id || "", dedup: true };
    }
    throw error;
  }
}

export async function processWhatsAppQueueBatch(args?: {
  workerId?: string;
  batchSize?: number;
}) {
  const workerId = args?.workerId || `worker-${process.pid}-${Date.now()}`;
  const batchSize = Math.max(1, Math.min(200, Number(args?.batchSize) || MAX_BATCH_DEFAULT));
  const now = new Date();
  const claimable = await prisma.whatsAppOutboundMessage.findMany({
    where: {
      status: { in: ["QUEUED", "RETRY_SCHEDULED"] },
      nextAttemptAt: { lte: now },
      OR: [{ lockExpiresAt: null }, { lockExpiresAt: { lte: now } }],
    },
    orderBy: [{ priority: "asc" }, { nextAttemptAt: "asc" }, { createdAt: "asc" }],
    take: batchSize,
    select: { id: true },
  });

  let processed = 0;
  let accepted = 0;
  let retried = 0;
  let failedPermanent = 0;
  let skipped = 0;

  for (const row of claimable) {
    const lockAt = new Date();
    const lockExpiresAt = new Date(lockAt.getTime() + LOCK_TTL_MS);
    const lockCount = await prisma.whatsAppOutboundMessage.updateMany({
      where: {
        id: row.id,
        status: { in: ["QUEUED", "RETRY_SCHEDULED"] },
        OR: [{ lockExpiresAt: null }, { lockExpiresAt: { lte: lockAt } }],
      },
      data: {
        status: "LOCKED",
        lockedAt: lockAt,
        lockExpiresAt,
        lockedBy: workerId,
      },
    });
    if (lockCount.count !== 1) continue;

    const message = await prisma.whatsAppOutboundMessage.findUnique({
      where: { id: row.id },
      include: {
        connection: true,
        appointment: { select: { id: true, stato: true, deletedAt: true, startAt: true } },
      },
    });
    if (!message) continue;

    processed += 1;
    if (shouldCancelBeforeSend(message.kind, message.appointment, message.metadataJson)) {
      await cancelMessage(message, workerId, "APPOINTMENT_NOT_ACTIVE", "Appuntamento cancellato o non valido");
      skipped += 1;
      continue;
    }

    let connection = message.connection || (await getOrCreateWhatsAppConnection(message.salonId));
    if (connection.providerType === "LINKED_SESSION") {
      const gateway = await gatewayGetStatus(message.salonId);
      if (gateway.ok) {
        connection = await prisma.whatsAppConnection.update({
          where: { id: connection.id },
          data: {
            status: connection.status === "DISABLED" ? "DISABLED" : gateway.data.status,
            displayPhoneNumber: gateway.data.displayPhoneNumber || connection.displayPhoneNumber || null,
            lastSeenAt: new Date(),
            metadataJson: {
              ...((connection.metadataJson as Record<string, unknown>) || {}),
              gatewayRawStatus: gateway.data.rawStatus,
              gatewayQrReady: gateway.data.qrReady,
              gatewayInitialized: gateway.data.initialized,
            },
          },
        });
      }
    }
    if (!isConnectionSendable(connection.status)) {
      const result = await scheduleRetryOrFail(
        message,
        workerId,
        "CONNECTION_NOT_READY",
        `Connessione non pronta (${connection.status})`,
        false,
      );
      if (result === "retry") retried += 1;
      else failedPermanent += 1;
      continue;
    }

    await prisma.whatsAppOutboundMessage.update({
      where: { id: message.id },
      data: { status: "SENDING" },
    });
    await createDeliveryEvent({
      salonId: message.salonId,
      connectionId: connection.id,
      outboundMessageId: message.id,
      status: "SENDING",
      eventType: "SENDING",
      dedupKey: message.dedupKey,
      attemptNumber: message.attempts + 1,
      workerId,
      reasonCode: "SEND_ATTEMPT",
      reasonMessage: "Invio in corso",
    });

    const transport = getTransport(connection.providerType as WhatsAppProviderType);
    let sendResult:
      | {
          accepted: boolean;
          externalId?: string | null;
          providerStatus: string;
          reasonCode?: string;
          reasonMessage?: string;
          retryable?: boolean;
        }
      | null = null;
    try {
      sendResult = await transport.send({
        salonId: message.salonId,
        messageId: message.id,
        recipientPhone: message.recipientPhone,
        messageText: message.messageText,
        metadata: (message.metadataJson as Record<string, unknown>) || {},
      });
    } catch (error: unknown) {
      sendResult = {
        accepted: false,
        providerStatus: "transport_exception",
        reasonCode: "TRANSPORT_EXCEPTION",
        reasonMessage: error instanceof Error ? error.message : "transport_exception",
        retryable: true,
      };
    }

    if (sendResult.accepted) {
      await prisma.whatsAppOutboundMessage.update({
        where: { id: message.id },
        data: {
          status: "ACCEPTED",
          attempts: { increment: 1 },
          acceptedAt: new Date(),
          lockExpiresAt: null,
          lockedAt: null,
          lockedBy: null,
          providerType: connection.providerType,
          providerStatus: sendResult.providerStatus,
          externalMessageId: sendResult.externalId || null,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      });
      await createDeliveryEvent({
        salonId: message.salonId,
        connectionId: connection.id,
        outboundMessageId: message.id,
        status: "ACCEPTED",
        eventType: "ACCEPTED",
        dedupKey: message.dedupKey,
        attemptNumber: message.attempts + 1,
        workerId,
        providerType: connection.providerType,
        providerStatus: sendResult.providerStatus,
        reasonCode: "PROVIDER_ACCEPTED",
        reasonMessage: "Messaggio accettato dal provider",
      });
      await updateConnectionHealth(connection.id, true);
      await syncCampaignRecipientStatusAfterMessage(message.id, "ACCEPTED");
      await syncBusinessLedgersAfterMessage(message.id, "ACCEPTED");
      accepted += 1;
      continue;
    }

    const retryable = sendResult.retryable !== false;
    const result = await scheduleRetryOrFail(
      message,
      workerId,
      sendResult.reasonCode || "SEND_FAILED",
      sendResult.reasonMessage || sendResult.providerStatus || "provider_send_failed",
      retryable,
      connection.providerType,
      sendResult.providerStatus,
    );
    await updateConnectionHealth(connection.id, false);
    await syncCampaignRecipientStatusAfterMessage(
      message.id,
      result === "retry" ? "RETRY_SCHEDULED" : retryable ? "FAILED_TEMPORARY" : "FAILED_PERMANENT",
    );
    await syncBusinessLedgersAfterMessage(
      message.id,
      result === "retry" ? "RETRY_SCHEDULED" : retryable ? "FAILED_TEMPORARY" : "FAILED_PERMANENT",
    );
    if (result === "retry") retried += 1;
    else failedPermanent += 1;
  }

  return { processed, accepted, retried, failedPermanent, skipped, workerId };
}

function defaultPriority(kind: WhatsAppMessageKind) {
  if (kind === "BOOKING_CONFIRM") return 10;
  if (kind === "REMINDER_HOUR_BEFORE") return 20;
  if (kind === "REMINDER_DAY_BEFORE") return 30;
  if (kind === "BIRTHDAY_GREETING") return 40;
  return 60;
}

function defaultMaxAttempts(kind: WhatsAppMessageKind) {
  if (kind === "BOOKING_CONFIRM") return 6;
  if (kind === "REMINDER_HOUR_BEFORE") return 4;
  if (kind === "REMINDER_DAY_BEFORE") return 5;
  if (kind === "BIRTHDAY_GREETING") return 4;
  return 3;
}

function shouldCancelBeforeSend(
  kind: WhatsAppMessageKind,
  appointment: { id: string; stato: string; deletedAt: Date | null; startAt?: Date } | null,
  metadataJson: Prisma.JsonValue | null,
) {
  if (!appointment) return false;
  if (kind === "BOOKING_CONFIRM" || kind === "REMINDER_DAY_BEFORE" || kind === "REMINDER_HOUR_BEFORE") {
    if (appointment.deletedAt !== null || appointment.stato !== "PRENOTATO") return true;
    const metadata = (metadataJson || {}) as Record<string, unknown>;
    const scheduledStartAtIso =
      typeof metadata.appointmentStartAtIso === "string" ? metadata.appointmentStartAtIso : "";
    if (scheduledStartAtIso && appointment.startAt instanceof Date) {
      return appointment.startAt.toISOString() !== scheduledStartAtIso;
    }
    return false;
  }
  return false;
}

function isConnectionSendable(status: WhatsAppConnectionStatus) {
  return status === "CONNECTED" || status === "DEGRADED";
}

async function cancelMessage(
  message: { id: string; salonId: string; dedupKey: string; attempts: number; connectionId: string | null },
  workerId: string,
  reasonCode: string,
  reasonMessage: string,
) {
  await prisma.whatsAppOutboundMessage.update({
    where: { id: message.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      lockExpiresAt: null,
      lockedAt: null,
      lockedBy: null,
      lastErrorCode: reasonCode,
      lastErrorMessage: reasonMessage,
    },
  });
  await createDeliveryEvent({
    salonId: message.salonId,
    connectionId: message.connectionId || undefined,
    outboundMessageId: message.id,
    status: "CANCELLED",
    eventType: "CANCELLED",
    dedupKey: message.dedupKey,
    attemptNumber: message.attempts,
    workerId,
    reasonCode,
    reasonMessage,
  });
  await syncCampaignRecipientStatusAfterMessage(message.id, "CANCELLED");
  await syncBusinessLedgersAfterMessage(message.id, "CANCELLED");
}

async function scheduleRetryOrFail(
  message: {
    id: string;
    salonId: string;
    dedupKey: string;
    attempts: number;
    maxAttempts: number;
    connectionId: string | null;
  },
  workerId: string,
  reasonCode: string,
  reasonMessage: string,
  retryable: boolean,
  providerType?: WhatsAppProviderType | null,
  providerStatus?: string | null,
) {
  const nextAttempt = message.attempts + 1;
  const canRetry = retryable && nextAttempt < message.maxAttempts;
  if (canRetry) {
    const delaySec = jitteredBackoffSeconds(nextAttempt);
    const nextAttemptAt = new Date(Date.now() + delaySec * 1000);
    await prisma.whatsAppOutboundMessage.update({
      where: { id: message.id },
      data: {
        status: "RETRY_SCHEDULED",
        attempts: nextAttempt,
        nextAttemptAt,
        lockExpiresAt: null,
        lockedAt: null,
        lockedBy: null,
        providerType: providerType || undefined,
        providerStatus: providerStatus || undefined,
        lastErrorCode: reasonCode,
        lastErrorMessage: reasonMessage,
      },
    });
    await createDeliveryEvent({
      salonId: message.salonId,
      connectionId: message.connectionId || undefined,
      outboundMessageId: message.id,
      status: "RETRY_SCHEDULED",
      eventType: "RETRY_SCHEDULED",
      dedupKey: message.dedupKey,
      attemptNumber: nextAttempt,
      workerId,
      providerType: providerType || undefined,
      providerStatus: providerStatus || undefined,
      reasonCode,
      reasonMessage,
      metadataJson: { nextAttemptAt },
    });
    return "retry" as const;
  }

  await prisma.whatsAppOutboundMessage.update({
    where: { id: message.id },
    data: {
      status: retryable ? "FAILED_TEMPORARY" : "FAILED_PERMANENT",
      attempts: nextAttempt,
      lockExpiresAt: null,
      lockedAt: null,
      lockedBy: null,
      providerType: providerType || undefined,
      providerStatus: providerStatus || undefined,
      lastErrorCode: reasonCode,
      lastErrorMessage: reasonMessage,
    },
  });
  await createDeliveryEvent({
    salonId: message.salonId,
    connectionId: message.connectionId || undefined,
    outboundMessageId: message.id,
    status: retryable ? "FAILED_TEMPORARY" : "FAILED_PERMANENT",
    eventType: retryable ? "FAILED_TEMPORARY" : "FAILED_PERMANENT",
    dedupKey: message.dedupKey,
    attemptNumber: nextAttempt,
    workerId,
    providerType: providerType || undefined,
    providerStatus: providerStatus || undefined,
    reasonCode,
    reasonMessage,
  });
  return "failed" as const;
}

async function updateConnectionHealth(connectionId: string, success: boolean) {
  const current = await prisma.whatsAppConnection.findUnique({
    where: { id: connectionId },
    select: { failureCount: true, status: true },
  });
  if (!current) return;
  if (success) {
    const nextStatus = current.status === "DEGRADED" ? "CONNECTED" : current.status;
    await prisma.whatsAppConnection.update({
      where: { id: connectionId },
      data: {
        failureCount: 0,
        status: nextStatus,
        lastSeenAt: new Date(),
        disabledReason: null,
      },
    });
    return;
  }
  const nextFailures = current.failureCount + 1;
  const nextStatus =
    nextFailures >= FAILURE_THRESHOLD_DISABLED
      ? "DISABLED"
      : nextFailures >= FAILURE_THRESHOLD_DEGRADED
        ? "DEGRADED"
        : current.status;
  await prisma.whatsAppConnection.update({
    where: { id: connectionId },
    data: {
      failureCount: nextFailures,
      status: nextStatus,
      lastSeenAt: new Date(),
      disabledReason:
        nextFailures >= FAILURE_THRESHOLD_DISABLED
          ? "Kill-switch attivo: troppi errori consecutivi di invio."
          : nextFailures >= FAILURE_THRESHOLD_DEGRADED
            ? "Troppi errori consecutivi di invio. Verificare connessione WhatsApp."
            : null,
    },
  });
}

async function syncCampaignRecipientStatusAfterMessage(
  outboundMessageId: string,
  status: WhatsAppMessageStatus,
) {
  const outbound = await prisma.whatsAppOutboundMessage.findUnique({
    where: { id: outboundMessageId },
    select: {
      campaignId: true,
      campaignRecipientId: true,
      externalMessageId: true,
      lastErrorMessage: true,
    },
  });
  if (!outbound?.campaignId || !outbound.campaignRecipientId) return;

  if (status === "ACCEPTED") {
    await prisma.whatsAppCampaignRecipient.update({
      where: { id: outbound.campaignRecipientId },
      data: {
        status: "SENT",
        messageId: outbound.externalMessageId || null,
        errorMessage: null,
      },
    });
  } else if (status === "RETRY_SCHEDULED" || status === "FAILED_TEMPORARY") {
    await prisma.whatsAppCampaignRecipient.update({
      where: { id: outbound.campaignRecipientId },
      data: {
        status: "FAILED",
        errorMessage: outbound.lastErrorMessage || "Invio non riuscito, in retry",
      },
    });
  } else if (status === "FAILED_PERMANENT" || status === "CANCELLED" || status === "SKIPPED") {
    await prisma.whatsAppCampaignRecipient.update({
      where: { id: outbound.campaignRecipientId },
      data: {
        status: "SKIPPED",
        errorMessage: outbound.lastErrorMessage || "Invio non consegnabile",
      },
    });
  } else {
    return;
  }

  const [sentCount, failedCount, skippedCount] = await Promise.all([
    prisma.whatsAppCampaignRecipient.count({
      where: { campaignId: outbound.campaignId, status: "SENT" },
    }),
    prisma.whatsAppCampaignRecipient.count({
      where: { campaignId: outbound.campaignId, status: "FAILED" },
    }),
    prisma.whatsAppCampaignRecipient.count({
      where: { campaignId: outbound.campaignId, status: "SKIPPED" },
    }),
  ]);
  const total = sentCount + failedCount + skippedCount;
  const campaign = await prisma.whatsAppCampaign.findUnique({
    where: { id: outbound.campaignId },
    select: { totalRecipients: true },
  });
  const completed = Boolean(campaign && total >= campaign.totalRecipients);
  await prisma.whatsAppCampaign.update({
    where: { id: outbound.campaignId },
    data: {
      sentCount,
      failedCount,
      skippedCount,
      status: completed ? "COMPLETED" : "RUNNING",
      completedAt: completed ? new Date() : null,
    },
  });
}

async function syncBusinessLedgersAfterMessage(
  outboundMessageId: string,
  status: WhatsAppMessageStatus,
) {
  const outbound = await prisma.whatsAppOutboundMessage.findUnique({
    where: { id: outboundMessageId },
    select: {
      id: true,
      kind: true,
      appointmentId: true,
      dogId: true,
      salonId: true,
      metadataJson: true,
      attempts: true,
      lastErrorMessage: true,
      externalMessageId: true,
    },
  });
  if (!outbound) return;

  const now = new Date();
  if (outbound.kind === "REMINDER_DAY_BEFORE" && outbound.appointmentId) {
    if (status === "ACCEPTED") {
      await prisma.appointmentReminder.upsert({
        where: {
          appointmentId_kind: {
            appointmentId: outbound.appointmentId,
            kind: "DAY_BEFORE_WHATSAPP",
          },
        },
        update: {
          status: "SENT",
          attemptCount: Math.max(1, outbound.attempts),
          sentAt: now,
          lastAttemptAt: now,
          errorMessage: null,
          messageId: outbound.externalMessageId || null,
        },
        create: {
          appointmentId: outbound.appointmentId,
          kind: "DAY_BEFORE_WHATSAPP",
          status: "SENT",
          attemptCount: Math.max(1, outbound.attempts),
          sentAt: now,
          lastAttemptAt: now,
          errorMessage: null,
          messageId: outbound.externalMessageId || null,
        },
      });
    } else if (status === "FAILED_PERMANENT" || status === "CANCELLED" || status === "SKIPPED") {
      await prisma.appointmentReminder.upsert({
        where: {
          appointmentId_kind: {
            appointmentId: outbound.appointmentId,
            kind: "DAY_BEFORE_WHATSAPP",
          },
        },
        update: {
          status: "SKIPPED",
          attemptCount: Math.max(1, outbound.attempts),
          lastAttemptAt: now,
          errorMessage: outbound.lastErrorMessage || "Reminder non inviabile",
        },
        create: {
          appointmentId: outbound.appointmentId,
          kind: "DAY_BEFORE_WHATSAPP",
          status: "SKIPPED",
          attemptCount: Math.max(1, outbound.attempts),
          lastAttemptAt: now,
          errorMessage: outbound.lastErrorMessage || "Reminder non inviabile",
        },
      });
    }
    return;
  }

  if (outbound.kind === "REMINDER_HOUR_BEFORE" && outbound.appointmentId) {
    if (status === "ACCEPTED") {
      await prisma.appointmentReminder.upsert({
        where: {
          appointmentId_kind: {
            appointmentId: outbound.appointmentId,
            kind: "HOUR_BEFORE_WHATSAPP",
          },
        },
        update: {
          status: "SENT",
          attemptCount: Math.max(1, outbound.attempts),
          sentAt: now,
          lastAttemptAt: now,
          errorMessage: null,
          messageId: outbound.externalMessageId || null,
        },
        create: {
          appointmentId: outbound.appointmentId,
          kind: "HOUR_BEFORE_WHATSAPP",
          status: "SENT",
          attemptCount: Math.max(1, outbound.attempts),
          sentAt: now,
          lastAttemptAt: now,
          errorMessage: null,
          messageId: outbound.externalMessageId || null,
        },
      });
    } else if (status === "FAILED_PERMANENT" || status === "CANCELLED" || status === "SKIPPED") {
      await prisma.appointmentReminder.upsert({
        where: {
          appointmentId_kind: {
            appointmentId: outbound.appointmentId,
            kind: "HOUR_BEFORE_WHATSAPP",
          },
        },
        update: {
          status: "SKIPPED",
          attemptCount: Math.max(1, outbound.attempts),
          lastAttemptAt: now,
          errorMessage: outbound.lastErrorMessage || "Reminder non inviabile",
        },
        create: {
          appointmentId: outbound.appointmentId,
          kind: "HOUR_BEFORE_WHATSAPP",
          status: "SKIPPED",
          attemptCount: Math.max(1, outbound.attempts),
          lastAttemptAt: now,
          errorMessage: outbound.lastErrorMessage || "Reminder non inviabile",
        },
      });
    }
    return;
  }

  if (outbound.kind !== "BIRTHDAY_GREETING" || !outbound.dogId) return;
  const metadata = (outbound.metadataJson || {}) as Record<string, unknown>;
  const yearRaw = metadata.year;
  const year = typeof yearRaw === "number" ? yearRaw : Number(yearRaw);
  if (!Number.isFinite(year)) return;

  if (status === "ACCEPTED") {
    await prisma.dogBirthdayGreetingLog.upsert({
      where: { dogId_year: { dogId: outbound.dogId, year } },
      update: {
        status: "SENT",
        attemptCount: Math.max(1, outbound.attempts),
        sentAt: now,
        lastAttemptAt: now,
        errorMessage: null,
        messageId: outbound.externalMessageId || null,
      },
      create: {
        salonId: outbound.salonId,
        dogId: outbound.dogId,
        year,
        status: "SENT",
        attemptCount: Math.max(1, outbound.attempts),
        sentAt: now,
        lastAttemptAt: now,
        errorMessage: null,
        messageId: outbound.externalMessageId || null,
      },
    });
  } else if (status === "FAILED_PERMANENT" || status === "CANCELLED" || status === "SKIPPED") {
    await prisma.dogBirthdayGreetingLog.upsert({
      where: { dogId_year: { dogId: outbound.dogId, year } },
      update: {
        status: "SKIPPED",
        attemptCount: Math.max(1, outbound.attempts),
        lastAttemptAt: now,
        errorMessage: outbound.lastErrorMessage || "Augurio non inviabile",
      },
      create: {
        salonId: outbound.salonId,
        dogId: outbound.dogId,
        year,
        status: "SKIPPED",
        attemptCount: Math.max(1, outbound.attempts),
        lastAttemptAt: now,
        errorMessage: outbound.lastErrorMessage || "Augurio non inviabile",
      },
    });
  }
}

export async function createDeliveryEvent(input: {
  salonId: string;
  outboundMessageId: string;
  status: WhatsAppMessageStatus;
  eventType: string;
  dedupKey: string;
  reasonCode?: string;
  reasonMessage?: string;
  attemptNumber?: number;
  workerId?: string;
  providerType?: WhatsAppProviderType;
  providerStatus?: string;
  connectionId?: string;
  metadataJson?: Prisma.InputJsonValue;
}) {
  await prisma.whatsAppDeliveryEvent.create({
    data: {
      salonId: input.salonId,
      outboundMessageId: input.outboundMessageId,
      status: input.status,
      eventType: input.eventType,
      dedupKey: input.dedupKey,
      reasonCode: input.reasonCode || null,
      reasonMessage: input.reasonMessage || null,
      attemptNumber: input.attemptNumber || 0,
      workerId: input.workerId || null,
      providerType: input.providerType || null,
      providerStatus: input.providerStatus || null,
      connectionId: input.connectionId || null,
      metadataJson: input.metadataJson || {},
    },
  });
}
