ALTER TYPE "public"."UserRole" ADD VALUE IF NOT EXISTS 'MANAGER';

CREATE TYPE "public"."CashSessionStatus" AS ENUM ('OPEN', 'CLOSED');

CREATE TABLE "public"."SalonGroup" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalonGroup_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."Salon"
ADD COLUMN "salonGroupId" TEXT,
ADD COLUMN "nomeSede" TEXT;

ALTER TABLE "public"."User"
ADD COLUMN "displayName" TEXT;

CREATE TABLE "public"."ServicePriceRule" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "treatmentId" TEXT NOT NULL,
    "dogSize" "public"."DogSize",
    "razzaPattern" TEXT,
    "extraLabel" TEXT,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "extraPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "durataMinuti" INTEGER NOT NULL,
    "validoDa" TIMESTAMP(3) NOT NULL,
    "validoA" TIMESTAMP(3),
    "attiva" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServicePriceRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."CashSession" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "closedById" TEXT,
    "status" "public"."CashSessionStatus" NOT NULL DEFAULT 'OPEN',
    "openingFloat" DECIMAL(10,2) NOT NULL,
    "closingExpected" DECIMAL(10,2),
    "closingCounted" DECIMAL(10,2),
    "difference" DECIMAL(10,2),
    "noteApertura" TEXT,
    "noteChiusura" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashSession_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."Transaction"
ADD COLUMN "cashSessionId" TEXT;

CREATE INDEX "Salon_salonGroupId_idx" ON "public"."Salon"("salonGroupId");
CREATE INDEX "Transaction_cashSessionId_idx" ON "public"."Transaction"("cashSessionId");
CREATE INDEX "ServicePriceRule_salonId_attiva_validoDa_validoA_idx" ON "public"."ServicePriceRule"("salonId", "attiva", "validoDa", "validoA");
CREATE INDEX "ServicePriceRule_salonId_treatmentId_dogSize_idx" ON "public"."ServicePriceRule"("salonId", "treatmentId", "dogSize");
CREATE INDEX "CashSession_salonId_status_openedAt_idx" ON "public"."CashSession"("salonId", "status", "openedAt");

ALTER TABLE "public"."Salon"
ADD CONSTRAINT "Salon_salonGroupId_fkey" FOREIGN KEY ("salonGroupId") REFERENCES "public"."SalonGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."Transaction"
ADD CONSTRAINT "Transaction_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "public"."CashSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."ServicePriceRule"
ADD CONSTRAINT "ServicePriceRule_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "public"."Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ServicePriceRule"
ADD CONSTRAINT "ServicePriceRule_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "public"."Treatment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ServicePriceRule"
ADD CONSTRAINT "ServicePriceRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."CashSession"
ADD CONSTRAINT "CashSession_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "public"."Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."CashSession"
ADD CONSTRAINT "CashSession_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."CashSession"
ADD CONSTRAINT "CashSession_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
