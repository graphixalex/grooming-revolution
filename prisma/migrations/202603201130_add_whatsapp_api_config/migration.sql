-- AlterTable
ALTER TABLE "Salon"
ADD COLUMN "whatsappApiEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "whatsappApiPhoneNumberId" TEXT,
ADD COLUMN "whatsappApiAccessToken" TEXT,
ADD COLUMN "whatsappApiVersion" TEXT DEFAULT 'v23.0';