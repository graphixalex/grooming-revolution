ALTER TABLE "Salon"
ADD COLUMN "mattingConsentEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "MattingConsentTemplate" (
  "id" TEXT NOT NULL,
  "salonId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "legalText" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MattingConsentTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MattingConsentRecord" (
  "id" TEXT NOT NULL,
  "salonId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "ownerFullName" TEXT NOT NULL,
  "petName" TEXT NOT NULL,
  "consentDematting" BOOLEAN NOT NULL,
  "consentUnderMatsShave" BOOLEAN NOT NULL,
  "formDate" TIMESTAMP(3) NOT NULL,
  "additionalNotes" TEXT,
  "acknowledgedRisk" BOOLEAN NOT NULL,
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
  CONSTRAINT "MattingConsentRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MattingConsentTemplate_salonId_version_key"
ON "MattingConsentTemplate"("salonId", "version");

CREATE INDEX "MattingConsentTemplate_salonId_isActive_idx"
ON "MattingConsentTemplate"("salonId", "isActive");

CREATE INDEX "MattingConsentRecord_salonId_clientId_signedAt_idx"
ON "MattingConsentRecord"("salonId", "clientId", "signedAt");

CREATE INDEX "MattingConsentRecord_clientId_signedAt_idx"
ON "MattingConsentRecord"("clientId", "signedAt");

CREATE INDEX "MattingConsentRecord_salonId_revokedAt_idx"
ON "MattingConsentRecord"("salonId", "revokedAt");

ALTER TABLE "MattingConsentTemplate"
ADD CONSTRAINT "MattingConsentTemplate_salonId_fkey"
FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MattingConsentRecord"
ADD CONSTRAINT "MattingConsentRecord_salonId_fkey"
FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MattingConsentRecord"
ADD CONSTRAINT "MattingConsentRecord_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MattingConsentRecord"
ADD CONSTRAINT "MattingConsentRecord_templateId_fkey"
FOREIGN KEY ("templateId") REFERENCES "MattingConsentTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MattingConsentRecord"
ADD CONSTRAINT "MattingConsentRecord_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MattingConsentRecord"
ADD CONSTRAINT "MattingConsentRecord_revokedById_fkey"
FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
