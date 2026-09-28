ALTER TABLE "Salon"
ADD COLUMN IF NOT EXISTS "whatsappApiBusinessAccountId" TEXT,
ADD COLUMN IF NOT EXISTS "whatsappApiDisplayPhoneNumber" TEXT,
ADD COLUMN IF NOT EXISTS "whatsappApiConnectedAt" TIMESTAMP(3);
