import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredPaddleEnv, verifyPaddleSignature } from "@/lib/paddle";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due", "paused"]);

type PaddleWebhookEvent = {
  event_type?: string;
  data?: Record<string, unknown>;
};

function getCustomData(data: Record<string, unknown> | undefined) {
  if (!data) return {};
  const customData = data.custom_data;
  if (!customData || typeof customData !== "object") return {};
  return customData as Record<string, unknown>;
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

  await prisma.salon.update({
    where: { id: salonId },
    data: {
      subscriptionPlan: "PRO",
      paddleSubscriptionId: paddleSubscriptionId || undefined,
      paddleCustomerId: paddleCustomerId || undefined,
    },
  });
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("paddle-signature") || "";
    const secret = getRequiredPaddleEnv("PADDLE_WEBHOOK_SECRET");

    if (!verifyPaddleSignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "Webhook non valido" }, { status: 400 });
    }

    const event = JSON.parse(rawBody) as PaddleWebhookEvent;
    const eventType = String(event.event_type || "");
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
