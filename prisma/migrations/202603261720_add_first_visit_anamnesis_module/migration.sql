ALTER TABLE "Salon"
ADD COLUMN "firstVisitAnamnesisEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "FirstVisitAnamnesisTemplate" (
  "id" TEXT NOT NULL,
  "salonId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "legalText" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FirstVisitAnamnesisTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FirstVisitAnamnesisRecord" (
  "id" TEXT NOT NULL,
  "salonId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "ownerFullName" TEXT NOT NULL,
  "ownerPhone" TEXT NOT NULL,
  "petName" TEXT NOT NULL,
  "petType" TEXT,
  "petBreed" TEXT,
  "petAge" TEXT,
  "isSeniorDeclared" BOOLEAN NOT NULL,
  "diseasesDeclared" TEXT,
  "veterinarianName" TEXT,
  "hasMicrochip" BOOLEAN,
  "socialPhotoConsent" BOOLEAN,
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
  CONSTRAINT "FirstVisitAnamnesisRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FirstVisitAnamnesisTemplate_salonId_version_key"
ON "FirstVisitAnamnesisTemplate"("salonId", "version");

CREATE INDEX "FirstVisitAnamnesisTemplate_salonId_isActive_idx"
ON "FirstVisitAnamnesisTemplate"("salonId", "isActive");

CREATE INDEX "FirstVisitAnamnesisRecord_salonId_clientId_signedAt_idx"
ON "FirstVisitAnamnesisRecord"("salonId", "clientId", "signedAt");

CREATE INDEX "FirstVisitAnamnesisRecord_clientId_signedAt_idx"
ON "FirstVisitAnamnesisRecord"("clientId", "signedAt");

CREATE INDEX "FirstVisitAnamnesisRecord_salonId_revokedAt_idx"
ON "FirstVisitAnamnesisRecord"("salonId", "revokedAt");

ALTER TABLE "FirstVisitAnamnesisTemplate"
ADD CONSTRAINT "FirstVisitAnamnesisTemplate_salonId_fkey"
FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FirstVisitAnamnesisRecord"
ADD CONSTRAINT "FirstVisitAnamnesisRecord_salonId_fkey"
FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FirstVisitAnamnesisRecord"
ADD CONSTRAINT "FirstVisitAnamnesisRecord_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FirstVisitAnamnesisRecord"
ADD CONSTRAINT "FirstVisitAnamnesisRecord_templateId_fkey"
FOREIGN KEY ("templateId") REFERENCES "FirstVisitAnamnesisTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FirstVisitAnamnesisRecord"
ADD CONSTRAINT "FirstVisitAnamnesisRecord_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FirstVisitAnamnesisRecord"
ADD CONSTRAINT "FirstVisitAnamnesisRecord_revokedById_fkey"
FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
