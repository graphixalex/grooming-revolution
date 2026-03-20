-- CreateEnum
CREATE TYPE "BookingRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'AUTO_CONFIRMED');

-- CreateEnum
CREATE TYPE "BookingTrustFlag" AS ENUM ('NEW_CLIENT', 'STALE_CLIENT', 'TRUSTED_CLIENT');

-- AlterTable
ALTER TABLE "Salon"
ADD COLUMN "bookingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "bookingSlug" TEXT,
ADD COLUMN "bookingDisplayName" TEXT,
ADD COLUMN "bookingDescription" TEXT,
ADD COLUMN "bookingLogoUrl" TEXT;

-- CreateTable
CREATE TABLE "BookingRequest" (
  "id" TEXT NOT NULL,
  "salonId" TEXT NOT NULL,
  "treatmentId" TEXT NOT NULL,
  "existingClientId" TEXT,
  "existingDogId" TEXT,
  "proposedOperatorId" TEXT,
  "clientNome" TEXT NOT NULL,
  "clientCognome" TEXT NOT NULL,
  "clientTelefono" TEXT NOT NULL,
  "clientEmail" TEXT,
  "dogNome" TEXT NOT NULL,
  "dogRazza" TEXT,
  "dogTaglia" "DogSize" NOT NULL,
  "dogTipoPelo" TEXT,
  "note" TEXT,
  "estimatedDurationMin" INTEGER NOT NULL,
  "requestedStartAt" TIMESTAMP(3) NOT NULL,
  "requestedEndAt" TIMESTAMP(3) NOT NULL,
  "trustFlag" "BookingTrustFlag" NOT NULL,
  "status" "BookingRequestStatus" NOT NULL DEFAULT 'PENDING',
  "appointmentId" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BookingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Salon_bookingSlug_key" ON "Salon"("bookingSlug");

-- CreateIndex
CREATE INDEX "BookingRequest_salonId_status_createdAt_idx" ON "BookingRequest"("salonId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "BookingRequest_salonId_trustFlag_createdAt_idx" ON "BookingRequest"("salonId", "trustFlag", "createdAt");

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "Treatment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_existingClientId_fkey" FOREIGN KEY ("existingClientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_existingDogId_fkey" FOREIGN KEY ("existingDogId") REFERENCES "Dog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_proposedOperatorId_fkey" FOREIGN KEY ("proposedOperatorId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
