import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredPaddleEnv, verifyPaddleSignature } from "@/lib/paddle";
import { markIdempotentOnce } from "@/lib/security-controls";
import { assertCriticalEnv } from "@/lib/env-security";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due", "paused"]);

type PaddleWebhookEvent = {
  event_id?: string;
  notification_id?: string;
  event_type?: string;
  occurred_at?: string;
  data?: Record<string, unknown>;
};

function resolveEventId(event: PaddleWebhookEvent) {
  if (typeof event.event_id === "string" && event.event_id.length > 0) return event.event_id;
  if (typeof event.notification_id === "string" && event.notification_id.length > 0) return event.notification_id;

  const dataId =
    typeof event.data?.id === "string"
      ? event.data.id
      : typeof event.data?.subscription_id === "string"
        ? event.data.subscription_id
        : typeof event.data?.customer_id === "string"
          ? event.data.customer_id
          : "unknown";

  return `${String(event.event_type || "unknown")}::${String(event.occurred_at || "na")}::${dataId}`;
}

function getCustomData(data: Record<string, unknown> | undefined) {
  if (!data) return {};
  const customData = data.custom_data;
  if (!customData || typeof customData !== "object") return {};
  return customData as Record<string, unknown>;
}

function amountFromMinorUnits(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value / 100;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed / 100;
  }
  return null;
}

async function resolveSalonId(data: Record<string, unknown> | undefined) {
  const customData = getCustomData(data);
  if (typeof customData.salonId === "string" && customData.salonId.length > 0) {
    return customData.salonId;
  }

  const paddleSubscriptionId =
    typeof data?.id === "string" ? data.id : typeof data?.subscription_id === "string" ? data.subscription_id : null;
  if (paddleSubscriptionId) {
    const bySubscription = await prisma.salon.findFirst({
      where: { paddleSubscriptionId },
      select: { id: true },
    });
    if (bySubscription) return bySubscription.id;
  }

  const paddleCustomerId =
    typeof data?.customer_id === "string" ? data.customer_id : null;
  if (paddleCustomerId) {
    const byCustomer = await prisma.salon.findFirst({
      where: { paddleCustomerId },
      select: { id: true },
    });
    if (byCustomer) return byCustomer.id;
  }

  return null;
}

async function handleSubscriptionEvent(data: Record<string, unknown>) {
  const salonId = await resolveSalonId(data);
  if (!salonId) return;

  const paddleSubscriptionId = typeof data.id === "string" ? data.id : null;
  const paddleCustomerId = typeof data.customer_id === "string" ? data.customer_id : null;
  const status = typeof data.status === "string" ? data.status.toLowerCase() : "";
  const isActive = ACTIVE_SUBSCRIPTION_STATUSES.has(status);

  await prisma.salon.update({
    where: { id: salonId },
    data: {
      paddleSubscriptionId: paddleSubscriptionId || undefined,
      paddleCustomerId: paddleCustomerId || undefined,
      subscriptionPlan: isActive ? "PRO" : "FREE",
    },
  });
}

async function handleTransactionCompletedEvent(data: Record<string, unknown>) {
  const priceId = process.env.PADDLE_PRICE_ID_PRO;
  const items = Array.isArray(data.items) ? data.items : [];
  const includesProPrice = priceId
    ? items.some((item) => {
        if (!item || typeof item !== "object") return false;
        const asRecord = item as Record<string, unknown>;
        if (asRecord.price_id === priceId) return true;
        const price = asRecord.price;
        if (!price || typeof price !== "object") return false;
        return (price as Record<string, unknown>).id === priceId;
      })
    : true;

  if (!includesProPrice) return;

  const salonId = await resolveSalonId(data);
  if (!salonId) return;

  const paddleSubscriptionId =
    typeof data.subscription_id === "string" ? data.subscription_id : null;
  const paddleCustomerId = typeof data.customer_id === "string" ? data.customer_id : null;
  const paddleTransactionId = typeof data.id === "string" ? data.id : null;
  const currencyCode = typeof data.currency_code === "string" ? data.currency_code : "EUR";
  const details = data.details && typeof data.details === "object" ? (data.details as Record<string, unknown>) : null;
  const totals = details?.totals && typeof details.totals === "object" ? (details.totals as Record<string, unknown>) : null;
  const grossAmount =
    amountFromMinorUnits(totals?.grand_total) ??
    amountFromMinorUnits(totals?.total) ??
    amountFromMinorUnits(data?.total) ??
    0;
  const netAmount = amountFromMinorUnits(totals?.subtotal);
  const taxAmount = amountFromMinorUnits(totals?.tax);
  const paidAtRaw =
    typeof data.billed_at === "string"
      ? data.billed_at
      : typeof data.created_at === "string"
        ? data.created_at
        : null;
  const paidAt = paidAtRaw ? new Date(paidAtRaw) : new Date();

  await prisma.salon.update({
    where: { id: salonId },
    data: {
      subscriptionPlan: "PRO",
      paddleSubscriptionId: paddleSubscriptionId || undefined,
      paddleCustomerId: paddleCustomerId || undefined,
    },
  });

  if (paddleTransactionId && grossAmount > 0 && !Number.isNaN(paidAt.getTime())) {
    await prisma.subscriptionPayment.upsert({
      where: { paddleTransactionId },
      update: {
        paddleSubscriptionId: paddleSubscriptionId || undefined,
        currency: currencyCode,
        grossAmount,
        netAmount: netAmount ?? undefined,
        taxAmount: taxAmount ?? undefined,
        paidAt,
      },
      create: {
        salonId,
        paddleTransactionId,
        paddleSubscriptionId: paddleSubscriptionId || undefined,
        currency: currencyCode,
        grossAmount,
        netAmount: netAmount ?? undefined,
        taxAmount: taxAmount ?? undefined,
        paidAt,
      },
    });
  }
}

export async function POST(req: Request) {
  try {
    assertCriticalEnv("paddle");
    assertCriticalEnv("rateLimit");

    const rawBody = await req.text();
    const signature = req.headers.get("paddle-signature") || "";
    const secret = getRequiredPaddleEnv("PADDLE_WEBHOOK_SECRET");

    if (!verifyPaddleSignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "Webhook non valido" }, { status: 400 });
    }

    const event = JSON.parse(rawBody) as PaddleWebhookEvent;
    const eventType = String(event.event_type || "");
    const eventId = resolveEventId(event);
    const firstProcessing = await markIdempotentOnce({
      bucket: "paddle-webhook",
      key: eventId,
      ttlSec: 60 * 60 * 24,
    });
    if (!firstProcessing) {
      return NextResponse.json({ received: true, duplicate: true, type: eventType });
    }

    const data = (event.data || {}) as Record<string, unknown>;

    if (eventType.startsWith("subscription.")) {
      await handleSubscriptionEvent(data);
    } else if (eventType === "transaction.completed") {
      await handleTransactionCompletedEvent(data);
    }

    return NextResponse.json({ received: true, type: eventType });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Errore webhook";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
