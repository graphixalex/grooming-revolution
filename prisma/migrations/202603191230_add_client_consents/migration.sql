-- CreateEnum
CREATE TYPE "ConsentKind" AS ENUM ('DATA_PROCESSING', 'PHOTO_INTERNAL', 'PHOTO_SOCIAL');

-- CreateTable
CREATE TABLE "ConsentTemplate" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "kind" "ConsentKind" NOT NULL,
    "title" TEXT NOT NULL,
    "legalText" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientConsent" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "kind" "ConsentKind" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "signerFullName" TEXT NOT NULL,
    "signerDocumentId" TEXT,
    "legalTextSnapshot" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "signatureDataUrl" TEXT NOT NULL,
    "evidenceHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdById" TEXT NOT NULL,
    "revokedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsentTemplate_salonId_kind_version_key" ON "ConsentTemplate"("salonId", "kind", "version");

-- CreateIndex
CREATE INDEX "ConsentTemplate_salonId_kind_isActive_idx" ON "ConsentTemplate"("salonId", "kind", "isActive");

-- CreateIndex
CREATE INDEX "ClientConsent_salonId_clientId_kind_signedAt_idx" ON "ClientConsent"("salonId", "clientId", "kind", "signedAt");

-- CreateIndex
CREATE INDEX "ClientConsent_clientId_signedAt_idx" ON "ClientConsent"("clientId", "signedAt");

-- AddForeignKey
ALTER TABLE "ConsentTemplate" ADD CONSTRAINT "ConsentTemplate_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientConsent" ADD CONSTRAINT "ClientConsent_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientConsent" ADD CONSTRAINT "ClientConsent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientConsent" ADD CONSTRAINT "ClientConsent_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ConsentTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientConsent" ADD CONSTRAINT "ClientConsent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientConsent" ADD CONSTRAINT "ClientConsent_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;