import { Prisma, WhatsAppConnectionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrCreateWhatsAppConnection } from "@/lib/whatsapp-queue";
import {
  gatewayDisconnectSession,
  gatewayGetQr,
  gatewayGetStatus,
  gatewayInitSession,
  isGatewayConfigured,
} from "@/lib/whatsapp-gateway";

function isManualDisabled(connection: { status: WhatsAppConnectionStatus; disabledReason: string | null }) {
  return connection.status === "DISABLED" && String(connection.disabledReason || "").toLowerCase().includes("kill-switch");
}

export async function syncConnectionWithGateway(salonId: string) {
  const connection = await getOrCreateWhatsAppConnection(salonId);
  if (!isGatewayConfigured()) {
    const updated = await prisma.whatsAppConnection.update({
      where: { id: connection.id },
      data: {
        status: isManualDisabled(connection) ? "DISABLED" : "DEGRADED",
        lastSeenAt: new Date(),
        metadataJson: {
          ...((connection.metadataJson as Record<string, unknown>) || {}),
          gatewayReachable: false,
          gatewayLastSyncError: "GATEWAY_URL_MISSING",
        },
      },
    });
    return { connection: updated, gateway: { reachable: false, status: "missing" } };
  }

  const statusResult = await gatewayGetStatus(salonId);
  if (!statusResult.ok) {
    const updated = await prisma.whatsAppConnection.update({
      where: { id: connection.id },
      data: {
        status: isManualDisabled(connection) ? "DISABLED" : "DEGRADED",
        lastSeenAt: new Date(),
        metadataJson: {
          ...((connection.metadataJson as Record<string, unknown>) || {}),
          gatewayReachable: false,
          gatewayLastSyncError: statusResult.code,
          gatewayLastSyncMessage: statusResult.message,
        },
      },
    });
    return {
      connection: updated,
      gateway: {
        reachable: false,
        status: "unreachable",
        errorCode: statusResult.code,
        errorMessage: statusResult.message,
      },
    };
  }

  const mappedStatus = isManualDisabled(connection) ? "DISABLED" : statusResult.data.status;
  const updated = await prisma.whatsAppConnection.update({
    where: { id: connection.id },
    data: {
      providerType: "LINKED_SESSION",
      status: mappedStatus,
      displayPhoneNumber: statusResult.data.displayPhoneNumber || connection.displayPhoneNumber || null,
      connectedAt: statusResult.data.status === "CONNECTED" ? connection.connectedAt || new Date() : connection.connectedAt,
      lastSeenAt: new Date(),
      ...(mappedStatus === "CONNECTED" ? { failureCount: 0 } : {}),
      ...(mappedStatus !== "DISABLED" ? { disabledReason: null } : {}),
      metadataJson: {
        ...((connection.metadataJson as Record<string, unknown>) || {}),
        gatewayReachable: true,
        gatewayRawStatus: statusResult.data.rawStatus,
        gatewayQrReady: statusResult.data.qrReady,
        gatewayInitialized: statusResult.data.initialized,
        gatewayLastSyncError: statusResult.data.reason || null,
      } as Prisma.InputJsonValue,
    },
  });

  return {
    connection: updated,
    gateway: {
      reachable: true,
      status: statusResult.data.rawStatus,
      qrReady: statusResult.data.qrReady,
      initialized: statusResult.data.initialized,
    },
  };
}

export async function initLinkedGatewaySession(salonId: string) {
  const connection = await getOrCreateWhatsAppConnection(salonId);
  const initResult = await gatewayInitSession(salonId);
  if (!initResult.ok) {
    await prisma.whatsAppConnection.update({
      where: { id: connection.id },
      data: {
        status: isManualDisabled(connection) ? "DISABLED" : "DEGRADED",
        lastSeenAt: new Date(),
        metadataJson: {
          ...((connection.metadataJson as Record<string, unknown>) || {}),
          gatewayReachable: false,
          gatewayLastSyncError: initResult.code,
          gatewayLastSyncMessage: initResult.message,
        },
      },
    });
    return initResult;
  }
  return { ok: true as const };
}

export async function getLinkedGatewayQr(salonId: string) {
  return gatewayGetQr(salonId);
}

export async function disconnectLinkedGatewaySession(salonId: string) {
  const connection = await getOrCreateWhatsAppConnection(salonId);
  const result = await gatewayDisconnectSession(salonId);
  await prisma.whatsAppConnection.update({
    where: { id: connection.id },
    data: {
      status: "DISCONNECTED",
      failureCount: 0,
      disabledReason: null,
      lastSeenAt: new Date(),
      metadataJson: {
        ...((connection.metadataJson as Record<string, unknown>) || {}),
        gatewayReachable: result.ok,
        gatewayLastSyncError: result.ok ? null : result.code,
      },
    },
  });
  return result;
}

export async function getWhatsAppConnectionDiagnostics(salonId: string) {
  const sync = await syncConnectionWithGateway(salonId);
  const [queued, retrying, lastEvents] = await Promise.all([
    prisma.whatsAppOutboundMessage.count({
      where: { salonId, status: { in: ["QUEUED", "LOCKED", "SENDING"] } },
    }),
    prisma.whatsAppOutboundMessage.count({
      where: { salonId, status: "RETRY_SCHEDULED" },
    }),
    prisma.whatsAppDeliveryEvent.findMany({
      where: { salonId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        createdAt: true,
        eventType: true,
        status: true,
        reasonCode: true,
        reasonMessage: true,
        attemptNumber: true,
        providerStatus: true,
      },
    }),
  ]);

  return {
    connection: sync.connection,
    gateway: sync.gateway,
    diagnostics: {
      queued,
      retrying,
      recentEvents: lastEvents,
    },
  };
}

export async function updateConnectionStatus(salonId: string, status: WhatsAppConnectionStatus, reason?: string) {
  const connection = await getOrCreateWhatsAppConnection(salonId);
  return prisma.whatsAppConnection.update({
    where: { id: connection.id },
    data: {
      status,
      disabledReason: reason || null,
      lastSeenAt: new Date(),
    },
  });
}
