ALTER TYPE "AppointmentReminderKind" ADD VALUE IF NOT EXISTS 'HOUR_BEFORE_WHATSAPP';

ALTER TABLE "Salon"
ADD COLUMN IF NOT EXISTS "whatsappOneHourTemplate" TEXT,
ADD COLUMN IF NOT EXISTS "whatsappBirthdayTemplate" TEXT,
ADD COLUMN IF NOT EXISTS "whatsappDayBeforeEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "whatsappOneHourEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "whatsappBirthdayEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Dog"
ADD COLUMN IF NOT EXISTS "birthDate" TIMESTAMP(3);

ALTER TABLE "FirstVisitAnamnesisRecord"
ADD COLUMN IF NOT EXISTS "petBirthDate" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "DogBirthdayGreetingLog" (
  "id" TEXT NOT NULL,
  "salonId" TEXT NOT NULL,
  "dogId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "status" "WhatsAppRecipientStatus" NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "messageId" TEXT,
  "errorMessage" TEXT,
  "lastAttemptAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DogBirthdayGreetingLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DogBirthdayGreetingLog_dogId_year_key" ON "DogBirthdayGreetingLog"("dogId", "year");
CREATE INDEX IF NOT EXISTS "DogBirthdayGreetingLog_salonId_year_status_idx" ON "DogBirthdayGreetingLog"("salonId", "year", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DogBirthdayGreetingLog_salonId_fkey'
  ) THEN
    ALTER TABLE "DogBirthdayGreetingLog"
    ADD CONSTRAINT "DogBirthdayGreetingLog_salonId_fkey"
    FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DogBirthdayGreetingLog_dogId_fkey'
  ) THEN
    ALTER TABLE "DogBirthdayGreetingLog"
    ADD CONSTRAINT "DogBirthdayGreetingLog_dogId_fkey"
    FOREIGN KEY ("dogId") REFERENCES "Dog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;