-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('OWNER', 'STAFF');

-- CreateEnum
CREATE TYPE "public"."DogSize" AS ENUM ('S', 'M', 'L');

-- CreateEnum
CREATE TYPE "public"."AppointmentStatus" AS ENUM ('PRENOTATO', 'COMPLETATO', 'NO_SHOW', 'CANCELLATO');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('POS', 'CASH');

-- CreateEnum
CREATE TYPE "public"."SubscriptionPlan" AS ENUM ('FREE', 'PRO');

-- CreateTable
CREATE TABLE "public"."Salon" (
    "id" TEXT NOT NULL,
    "nomeAttivita" TEXT NOT NULL,
    "paese" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "valuta" TEXT NOT NULL DEFAULT 'EUR',
    "vatRate" DECIMAL(65,30) NOT NULL DEFAULT 22,
    "vatIncluded" BOOLEAN NOT NULL DEFAULT true,
    "indirizzo" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "whatsappTemplate" TEXT,
    "emailTemplate" TEXT,
    "overlapAllowed" BOOLEAN NOT NULL DEFAULT false,
    "workingHoursJson" JSONB,
    "holidaysJson" JSONB,
    "subscriptionPlan" "public"."SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "billingVatNumber" TEXT,
    "billingCountry" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Salon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "ruolo" "public"."UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Client" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cognome" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT,
    "noteCliente" TEXT,
    "consensoPromemoria" BOOLEAN NOT NULL DEFAULT false,
    "consensoTimestamp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Dog" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "razza" TEXT,
    "taglia" "public"."DogSize" NOT NULL,
    "noteCane" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Dog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QuickTag" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordine" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuickTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DogQuickTag" (
    "dogId" TEXT NOT NULL,
    "quickTagId" TEXT NOT NULL,

    CONSTRAINT "DogQuickTag_pkey" PRIMARY KEY ("dogId","quickTagId")
);

-- CreateTable
CREATE TABLE "public"."Treatment" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "ordine" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Treatment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Appointment" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "caneId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "durataMinuti" INTEGER NOT NULL,
    "noteAppuntamento" TEXT,
    "stato" "public"."AppointmentStatus" NOT NULL DEFAULT 'PRENOTATO',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AppointmentTreatment" (
    "appointmentId" TEXT NOT NULL,
    "treatmentId" TEXT NOT NULL,

    CONSTRAINT "AppointmentTreatment_pkey" PRIMARY KEY ("appointmentId","treatmentId")
);

-- CreateTable
CREATE TABLE "public"."Transaction" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "public"."PaymentMethod" NOT NULL,
    "vatRate" DECIMAL(5,2) NOT NULL,
    "vatAmount" DECIMAL(10,2) NOT NULL,
    "netAmount" DECIMAL(10,2) NOT NULL,
    "grossAmount" DECIMAL(10,2) NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_salonId_idx" ON "public"."User"("salonId");

-- CreateIndex
CREATE UNIQUE INDEX "User_salonId_email_key" ON "public"."User"("salonId", "email");

-- CreateIndex
CREATE INDEX "Client_salonId_deletedAt_idx" ON "public"."Client"("salonId", "deletedAt");

-- CreateIndex
CREATE INDEX "Client_salonId_telefono_idx" ON "public"."Client"("salonId", "telefono");

-- CreateIndex
CREATE INDEX "Client_salonId_nome_cognome_idx" ON "public"."Client"("salonId", "nome", "cognome");

-- CreateIndex
CREATE INDEX "Dog_salonId_clienteId_deletedAt_idx" ON "public"."Dog"("salonId", "clienteId", "deletedAt");

-- CreateIndex
CREATE INDEX "QuickTag_salonId_ordine_idx" ON "public"."QuickTag"("salonId", "ordine");

-- CreateIndex
CREATE UNIQUE INDEX "QuickTag_salonId_nome_key" ON "public"."QuickTag"("salonId", "nome");

-- CreateIndex
CREATE INDEX "Treatment_salonId_ordine_idx" ON "public"."Treatment"("salonId", "ordine");

-- CreateIndex
CREATE INDEX "Appointment_salonId_startAt_endAt_idx" ON "public"."Appointment"("salonId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "Appointment_salonId_clienteId_idx" ON "public"."Appointment"("salonId", "clienteId");

-- CreateIndex
CREATE INDEX "Appointment_salonId_caneId_idx" ON "public"."Appointment"("salonId", "caneId");

-- CreateIndex
CREATE INDEX "Appointment_salonId_stato_idx" ON "public"."Appointment"("salonId", "stato");

-- CreateIndex
CREATE INDEX "Transaction_salonId_dateTime_idx" ON "public"."Transaction"("salonId", "dateTime");

-- CreateIndex
CREATE INDEX "AuditLog_salonId_createdAt_idx" ON "public"."AuditLog"("salonId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "public"."Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Client" ADD CONSTRAINT "Client_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "public"."Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Dog" ADD CONSTRAINT "Dog_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "public"."Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Dog" ADD CONSTRAINT "Dog_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuickTag" ADD CONSTRAINT "QuickTag_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "public"."Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DogQuickTag" ADD CONSTRAINT "DogQuickTag_dogId_fkey" FOREIGN KEY ("dogId") REFERENCES "public"."Dog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DogQuickTag" ADD CONSTRAINT "DogQuickTag_quickTagId_fkey" FOREIGN KEY ("quickTagId") REFERENCES "public"."QuickTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Treatment" ADD CONSTRAINT "Treatment_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "public"."Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "public"."Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_caneId_fkey" FOREIGN KEY ("caneId") REFERENCES "public"."Dog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AppointmentTreatment" ADD CONSTRAINT "AppointmentTreatment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AppointmentTreatment" ADD CONSTRAINT "AppointmentTreatment_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "public"."Treatment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "public"."Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "public"."Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

