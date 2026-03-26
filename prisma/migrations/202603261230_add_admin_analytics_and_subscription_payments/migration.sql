CREATE TABLE "public"."PublicAnalyticsEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "path" TEXT,
    "source" TEXT,
    "sessionId" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PublicAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."SubscriptionPayment" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "paddleTransactionId" TEXT NOT NULL,
    "paddleSubscriptionId" TEXT,
    "currency" TEXT NOT NULL,
    "grossAmount" DECIMAL(10,2) NOT NULL,
    "netAmount" DECIMAL(10,2),
    "taxAmount" DECIMAL(10,2),
    "paidAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionPayment_paddleTransactionId_key" ON "public"."SubscriptionPayment"("paddleTransactionId");
CREATE INDEX "PublicAnalyticsEvent_eventType_createdAt_idx" ON "public"."PublicAnalyticsEvent"("eventType", "createdAt");
CREATE INDEX "PublicAnalyticsEvent_sessionId_createdAt_idx" ON "public"."PublicAnalyticsEvent"("sessionId", "createdAt");
CREATE INDEX "SubscriptionPayment_salonId_paidAt_idx" ON "public"."SubscriptionPayment"("salonId", "paidAt");
CREATE INDEX "SubscriptionPayment_paidAt_idx" ON "public"."SubscriptionPayment"("paidAt");

ALTER TABLE "public"."SubscriptionPayment"
ADD CONSTRAINT "SubscriptionPayment_salonId_fkey"
FOREIGN KEY ("salonId") REFERENCES "public"."Salon"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
