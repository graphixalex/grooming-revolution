-- CreateEnum
CREATE TYPE "WhatsAppProviderType" AS ENUM ('LINKED_SESSION', 'LEGACY_META');

-- CreateEnum
CREATE TYPE "WhatsAppConnectionStatus" AS ENUM ('DISCONNECTED', 'CONNECTING', 'CONNECTED', 'DEGRADED', 'EXPIRED', 'DISABLED');

-- CreateEnum
CREATE TYPE "WhatsAppMessageKind" AS ENUM ('BOOKING_CONFIRM', 'REMINDER_DAY_BEFORE', 'REMINDER_HOUR_BEFORE', 'BIRTHDAY_GREETING', 'CAMPAIGN_SERVICE', 'CAMPAIGN_MARKETING', 'MANUAL_SERVICE');

-- CreateEnum
CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('QUEUED', 'LOCKED', 'SENDING', 'ACCEPTED', 'RETRY_SCHEDULED', 'FAILED_TEMPORARY', 'FAILED_PERMANENT', 'SKIPPED', 'CANCELLED');

-- CreateTable
CREATE TABLE "WhatsAppConnection" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "providerType" "WhatsAppProviderType" NOT NULL DEFAULT 'LINKED_SESSION',
    "status" "WhatsAppConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "displayPhoneNumber" TEXT,
    "connectedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "disabledReason" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppSession" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "status" "WhatsAppConnectionStatus" NOT NULL DEFAULT 'CONNECTING',
    "pairingCode" TEXT,
    "qrData" TEXT,
    "expiresAt" TIMESTAMP(3),
    "pairedAt" TIMESTAMP(3),
    "lastHeartbeatAt" TIMESTAMP(3),
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppOutboundMessage" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "connectionId" TEXT,
    "appointmentId" TEXT,
    "dogId" TEXT,
    "campaignId" TEXT,
    "campaignRecipientId" TEXT,
    "kind" "WhatsAppMessageKind" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "status" "WhatsAppMessageStatus" NOT NULL DEFAULT 'QUEUED',
    "dedupKey" TEXT NOT NULL,
    "logicalVersion" INTEGER NOT NULL DEFAULT 1,
    "recipientPhone" TEXT NOT NULL,
    "messageText" TEXT NOT NULL,
    "messagePreview" TEXT,
    "metadataJson" JSONB,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockExpiresAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "providerType" "WhatsAppProviderType",
    "providerStatus" TEXT,
    "externalMessageId" TEXT,
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppOutboundMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppDeliveryEvent" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "connectionId" TEXT,
    "outboundMessageId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" "WhatsAppMessageStatus" NOT NULL,
    "providerType" "WhatsAppProviderType",
    "providerStatus" TEXT,
    "dedupKey" TEXT NOT NULL,
    "reasonCode" TEXT,
    "reasonMessage" TEXT,
    "attemptNumber" INTEGER NOT NULL DEFAULT 0,
    "workerId" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppDeliveryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppConnection_salonId_key" ON "WhatsAppConnection"("salonId");

-- CreateIndex
CREATE INDEX "WhatsAppConnection_status_updatedAt_idx" ON "WhatsAppConnection"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "WhatsAppSession_salonId_status_updatedAt_idx" ON "WhatsAppSession"("salonId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "WhatsAppSession_connectionId_createdAt_idx" ON "WhatsAppSession"("connectionId", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppOutboundMessage_status_nextAttemptAt_priority_idx" ON "WhatsAppOutboundMessage"("status", "nextAttemptAt", "priority");

-- CreateIndex
CREATE INDEX "WhatsAppOutboundMessage_salonId_status_createdAt_idx" ON "WhatsAppOutboundMessage"("salonId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppOutboundMessage_campaignId_campaignRecipientId_idx" ON "WhatsAppOutboundMessage"("campaignId", "campaignRecipientId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppOutboundMessage_salonId_dedupKey_key" ON "WhatsAppOutboundMessage"("salonId", "dedupKey");

-- CreateIndex
CREATE INDEX "WhatsAppDeliveryEvent_salonId_createdAt_idx" ON "WhatsAppDeliveryEvent"("salonId", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppDeliveryEvent_outboundMessageId_createdAt_idx" ON "WhatsAppDeliveryEvent"("outboundMessageId", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppDeliveryEvent_status_createdAt_idx" ON "WhatsAppDeliveryEvent"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "WhatsAppConnection" ADD CONSTRAINT "WhatsAppConnection_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppSession" ADD CONSTRAINT "WhatsAppSession_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppSession" ADD CONSTRAINT "WhatsAppSession_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "WhatsAppConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppOutboundMessage" ADD CONSTRAINT "WhatsAppOutboundMessage_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppOutboundMessage" ADD CONSTRAINT "WhatsAppOutboundMessage_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "WhatsAppConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppOutboundMessage" ADD CONSTRAINT "WhatsAppOutboundMessage_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppOutboundMessage" ADD CONSTRAINT "WhatsAppOutboundMessage_dogId_fkey" FOREIGN KEY ("dogId") REFERENCES "Dog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppOutboundMessage" ADD CONSTRAINT "WhatsAppOutboundMessage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "WhatsAppCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppOutboundMessage" ADD CONSTRAINT "WhatsAppOutboundMessage_campaignRecipientId_fkey" FOREIGN KEY ("campaignRecipientId") REFERENCES "WhatsAppCampaignRecipient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppDeliveryEvent" ADD CONSTRAINT "WhatsAppDeliveryEvent_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppDeliveryEvent" ADD CONSTRAINT "WhatsAppDeliveryEvent_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "WhatsAppConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppDeliveryEvent" ADD CONSTRAINT "WhatsAppDeliveryEvent_outboundMessageId_fkey" FOREIGN KEY ("outboundMessageId") REFERENCES "WhatsAppOutboundMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

