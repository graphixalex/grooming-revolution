import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MetaError } from "@/lib/meta-errors";
import { createSignupService, type SignupRepository } from "@/lib/meta-signup-service";

const pending = ["QUEUED", "RETRY_SCHEDULED", "LOCKED", "SENDING"] as const;
async function checkAvailable(db: Prisma.TransactionClient, salonId: string, phoneNumberId?: string) {
  const connection = await db.whatsAppConnection.findUnique({ where: { salonId } });
  if (connection?.providerType === "META_EMBEDDED") throw new MetaError("meta_already_connected", 409);
  if (connection && !["DISCONNECTED", "DISABLED", "EXPIRED"].includes(connection.status))
    throw new MetaError("meta_disconnect_current_provider_first", 409);
  if (await db.whatsAppOutboundMessage.count({ where: { salonId, status: { in: [...pending] } } }))
    throw new MetaError("meta_pending_messages", 409);
  if (phoneNumberId && await db.salon.count({ where: {
    id: { not: salonId }, whatsappApiPhoneNumberId: phoneNumberId,
    whatsappConnection: { is: { providerType: "META_EMBEDDED" } },
  } })) throw new MetaError("meta_phone_already_assigned", 409);
  return connection?.updatedAt.toISOString() || null;
}
async function lockAssignments(tx: Prisma.TransactionClient, salonId: string) {
  // Fixed global advisory lock serializes all Meta asset assignments without a new DB constraint.
  // Acquire before reads under READ COMMITTED, so a waiter sees the previous commit.
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(1965515324, 1593016965)`;
  await tx.$queryRaw`SELECT "id" FROM "Salon" WHERE "id" = ${salonId} FOR UPDATE`;
}
const repository: SignupRepository = {
  available: (salonId, phoneId) => checkAvailable(prisma, salonId, phoneId),
  async claim(id, scope) {
    try {
      await prisma.auditLog.create({ data: {
        id, ...scope, action: "META_SIGNUP_STATE_CONSUMED", entityType: "MetaSignup", entityId: scope.salonId,
      } });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
      throw error; // Persistence failures fail closed; no in-memory fallback.
    }
  },
  async activate(scope, assets, revision) {
    return prisma.$transaction(async tx => {
      await lockAssignments(tx, scope.salonId);
      if (await checkAvailable(tx, scope.salonId, assets.phoneNumberId) !== revision)
        throw new MetaError("meta_connection_changed_retry", 409);
      const now = new Date();
      const salon = await tx.salon.update({
        where: { id: scope.salonId },
        data: {
          whatsappApiEnabled: true, whatsappApiPhoneNumberId: assets.phoneNumberId,
          whatsappApiBusinessAccountId: assets.businessAccountId,
          whatsappApiAccessToken: assets.encryptedToken, whatsappApiVersion: assets.graphVersion,
          whatsappApiDisplayPhoneNumber: assets.displayPhoneNumber, whatsappApiConnectedAt: now,
        },
        select: { whatsappApiEnabled: true, whatsappApiPhoneNumberId: true, whatsappApiBusinessAccountId: true,
          whatsappApiDisplayPhoneNumber: true, whatsappApiVersion: true, whatsappApiConnectedAt: true },
      });
      const connectionData = {
        providerType: "META_EMBEDDED" as const, status: "CONNECTED" as const,
        displayPhoneNumber: assets.displayPhoneNumber, connectedAt: now, lastSeenAt: now,
        failureCount: 0, disabledReason: null,
        metadataJson: { metaFinalized: true, phoneNumberId: assets.phoneNumberId, businessAccountId: assets.businessAccountId },
      };
      const connection = await tx.whatsAppConnection.upsert({
        where: { salonId: scope.salonId }, create: { salonId: scope.salonId, ...connectionData }, update: connectionData,
      });
      return { salon, connection };
    });
  },
  async disconnect(scope) {
    return prisma.$transaction(async tx => {
      await lockAssignments(tx, scope.salonId);
      const current = await tx.whatsAppConnection.findUnique({ where: { salonId: scope.salonId } });
      if (current?.providerType !== "META_EMBEDDED") throw new MetaError("meta_provider_not_active", 409);
      if (await tx.whatsAppOutboundMessage.count({ where: { salonId: scope.salonId, status: { in: [...pending] } } }))
        throw new MetaError("meta_pending_messages", 409);
      const salon = await tx.salon.update({
        where: { id: scope.salonId },
        data: { whatsappApiEnabled: false, whatsappApiAccessToken: null, whatsappApiPhoneNumberId: null,
          whatsappApiBusinessAccountId: null, whatsappApiDisplayPhoneNumber: null, whatsappApiConnectedAt: null },
        select: { whatsappApiEnabled: true, whatsappApiPhoneNumberId: true, whatsappApiBusinessAccountId: true,
          whatsappApiDisplayPhoneNumber: true, whatsappApiVersion: true, whatsappApiConnectedAt: true },
      });
      const connection = await tx.whatsAppConnection.update({
        where: { id: current.id, providerType: "META_EMBEDDED" },
        data: { providerType: "LINKED_SESSION", status: "DISCONNECTED", displayPhoneNumber: null,
          connectedAt: null, lastSeenAt: new Date(), failureCount: 0, disabledReason: null, metadataJson: {} },
      });
      return { salon, connection };
    });
  },
};
export const metaSignup = createSignupService(repository);
