import { prisma } from "@/lib/prisma";
import { gatewayGetQr, gatewayGetStatus, isGatewayConfigured } from "@/lib/whatsapp-gateway";

type DiagnosticsScope = "CURRENT_SALON" | "GROUP";

export async function getWhatsAppDiagnosticsSummary(input: {
  salonId: string;
  role: string;
}) {
  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const currentSalon = await prisma.salon.findUnique({
    where: { id: input.salonId },
    select: { id: true, nomeSede: true, nomeAttivita: true, salonGroupId: true },
  });
  if (!currentSalon) return null;

  const role = String(input.role || "");
  const scope: DiagnosticsScope =
    (role === "OWNER" || role === "MANAGER") && currentSalon.salonGroupId
      ? "GROUP"
      : "CURRENT_SALON";

  const salons = await prisma.salon.findMany({
    where:
      scope === "GROUP" && currentSalon.salonGroupId
        ? { salonGroupId: currentSalon.salonGroupId }
        : { id: currentSalon.id },
    select: {
      id: true,
      nomeSede: true,
      nomeAttivita: true,
      whatsappDayBeforeEnabled: true,
      whatsappOneHourEnabled: true,
      whatsappBirthdayEnabled: true,
      whatsappConnection: {
        select: {
          id: true,
          providerType: true,
          status: true,
          connectedAt: true,
          lastSeenAt: true,
          failureCount: true,
          disabledReason: true,
          displayPhoneNumber: true,
        },
      },
    },
    orderBy: { nomeSede: "asc" },
  });

  const rows = await Promise.all(
    salons.map(async (salon) => {
      const gatewayStatus = isGatewayConfigured() ? await gatewayGetStatus(salon.id) : null;
      const gatewayQr = isGatewayConfigured() ? await gatewayGetQr(salon.id) : null;
      const [queued, locked, retryScheduled, failedPermanent, accepted24h, failures24h, lastEvent, lastAcceptedEvent, lastErrorEvent] =
        await Promise.all([
          prisma.whatsAppOutboundMessage.count({
            where: { salonId: salon.id, status: "QUEUED" },
          }),
          prisma.whatsAppOutboundMessage.count({
            where: { salonId: salon.id, status: "LOCKED" },
          }),
          prisma.whatsAppOutboundMessage.count({
            where: { salonId: salon.id, status: "RETRY_SCHEDULED" },
          }),
          prisma.whatsAppOutboundMessage.count({
            where: { salonId: salon.id, status: "FAILED_PERMANENT" },
          }),
          prisma.whatsAppDeliveryEvent.count({
            where: { salonId: salon.id, status: "ACCEPTED", createdAt: { gte: since24h } },
          }),
          prisma.whatsAppDeliveryEvent.count({
            where: {
              salonId: salon.id,
              status: { in: ["FAILED_PERMANENT", "FAILED_TEMPORARY"] },
              createdAt: { gte: since24h },
            },
          }),
          prisma.whatsAppDeliveryEvent.findFirst({
            where: { salonId: salon.id },
            orderBy: { createdAt: "desc" },
            select: {
              createdAt: true,
              eventType: true,
              status: true,
              reasonCode: true,
              reasonMessage: true,
            },
          }),
          prisma.whatsAppDeliveryEvent.findFirst({
            where: { salonId: salon.id, status: "ACCEPTED" },
            orderBy: { createdAt: "desc" },
            select: {
              createdAt: true,
              eventType: true,
              providerStatus: true,
            },
          }),
          prisma.whatsAppDeliveryEvent.findFirst({
            where: {
              salonId: salon.id,
              status: { in: ["FAILED_PERMANENT", "FAILED_TEMPORARY"] },
            },
            orderBy: { createdAt: "desc" },
            select: {
              createdAt: true,
              eventType: true,
              status: true,
              reasonCode: true,
              reasonMessage: true,
            },
          }),
        ]);

      const backlogTotal = queued + locked + retryScheduled;
      const killSwitchActive = salon.whatsappConnection?.status === "DISABLED";
      return {
        salonId: salon.id,
        salonName: salon.nomeSede || salon.nomeAttivita || "Sede",
        connection: salon.whatsappConnection || null,
        killSwitchActive,
        automations: {
          bookingConfirmAlwaysOn: true,
          dayBeforeEnabled: Boolean(salon.whatsappDayBeforeEnabled),
          hourBeforeEnabled: Boolean(salon.whatsappOneHourEnabled),
          birthdayEnabled: Boolean(salon.whatsappBirthdayEnabled),
        },
        queue: {
          queued,
          locked,
          retryScheduled,
          failedPermanent,
          backlogTotal,
        },
        delivery24h: {
          accepted: accepted24h,
          failed: failures24h,
        },
        gateway: {
          configured: isGatewayConfigured(),
          reachable: gatewayStatus ? gatewayStatus.ok : false,
          rawStatus: gatewayStatus && gatewayStatus.ok ? gatewayStatus.data.rawStatus : null,
          mappedStatus: gatewayStatus && gatewayStatus.ok ? gatewayStatus.data.status : null,
          initialized: gatewayStatus && gatewayStatus.ok ? gatewayStatus.data.initialized : false,
          qrAvailable: gatewayQr ? gatewayQr.ok : false,
          lastErrorCode: gatewayStatus && !gatewayStatus.ok ? gatewayStatus.code : null,
          lastErrorMessage: gatewayStatus && !gatewayStatus.ok ? gatewayStatus.message : null,
        },
        signals: {
          lastEvent,
          lastAcceptedEvent,
          lastErrorEvent,
        },
      };
    }),
  );

  return {
    scope,
    gatewayConfigured: Boolean(process.env.WHATSAPP_LINKED_GATEWAY_URL?.trim()),
    generatedAt: now.toISOString(),
    rows,
  };
}
