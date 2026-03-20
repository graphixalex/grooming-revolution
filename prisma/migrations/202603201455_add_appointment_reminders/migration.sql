-- CreateEnum
CREATE TYPE "AppointmentReminderKind" AS ENUM ('DAY_BEFORE_WHATSAPP');

-- CreateTable
CREATE TABLE "AppointmentReminder" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "kind" "AppointmentReminderKind" NOT NULL,
    "status" "WhatsAppRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "messageId" TEXT,
    "errorMessage" TEXT,
    "lastAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentReminder_appointmentId_kind_key" ON "AppointmentReminder"("appointmentId", "kind");

-- CreateIndex
CREATE INDEX "AppointmentReminder_kind_status_idx" ON "AppointmentReminder"("kind", "status");

-- AddForeignKey
ALTER TABLE "AppointmentReminder" ADD CONSTRAINT "AppointmentReminder_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;