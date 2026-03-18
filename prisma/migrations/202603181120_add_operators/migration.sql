CREATE TABLE "public"."Operator" (
  "id" TEXT NOT NULL,
  "salonId" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "attivo" BOOLEAN NOT NULL DEFAULT true,
  "ordine" INTEGER NOT NULL DEFAULT 0,
  "color" TEXT DEFAULT '#2563eb',
  "workingHoursJson" JSONB,
  "kpiTargetRevenue" DECIMAL(10,2),
  "kpiTargetAppointments" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Operator_salonId_nome_key" ON "public"."Operator"("salonId", "nome");
CREATE INDEX "Operator_salonId_ordine_idx" ON "public"."Operator"("salonId", "ordine");

ALTER TABLE "public"."Appointment" ADD COLUMN "operatorId" TEXT;
CREATE INDEX "Appointment_salonId_operatorId_startAt_idx" ON "public"."Appointment"("salonId", "operatorId", "startAt");

ALTER TABLE "public"."Operator" ADD CONSTRAINT "Operator_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "public"."Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "public"."Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
