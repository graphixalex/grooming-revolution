import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { canManageSettings } from "@/lib/rbac";
import { paddleApiRequest, getRequiredPaddleEnv } from "@/lib/paddle";

type PaddleCustomer = { id: string };
type PaddleTransaction = { checkout?: { url?: string } };

function resolveAppUrl(req: Request) {
  const configured = process.env.NEXTAUTH_URL;
  if (configured) return configured.replace(/\/$/, "");
  return new URL(req.url).origin;
}

export async function POST(req: Request) {
  try {
    const auth = await requireApiSession();
    if ("error" in auth) return auth.error;
    if (!canManageSettings(auth.session.user.role as any)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    if (!body?.accepted) {
      return NextResponse.json({ error: "Consenso obbligatorio" }, { status: 400 });
    }

    const priceId = getRequiredPaddleEnv("PADDLE_PRICE_ID_PRO");
    const salon = await prisma.salon.findUnique({
      where: { id: auth.session.user.salonId },
      select: {
        id: true,
        nomeAttivita: true,
        email: true,
        subscriptionPlan: true,
        paddleSubscriptionId: true,
        paddleCustomerId: true,
      },
    });
    if (!salon) {
      return NextResponse.json({ error: "Sede non trovata" }, { status: 404 });
    }
    if (salon.paddleSubscriptionId) {
      return NextResponse.json(
        { error: "Abbonamento Paddle gia attivo: usa il portale gestione." },
        { status: 409 },
      );
    }
    if (salon.subscriptionPlan !== "FREE") {
      return NextResponse.json(
        {
          error:
            "Questo account e gia in piano PRO manuale. Checkout disabilitato per evitare duplicazioni.",
        },
        { status: 409 },
      );
    }

    let customerId = salon.paddleCustomerId;
    if (!customerId) {
      const customer = await paddleApiRequest<PaddleCustomer>("/customers", {
        method: "POST",
        body: {
          email: salon.email || auth.session.user.email,
          name: salon.nomeAttivita,
          custom_data: { salonId: salon.id },
        },
      });
      customerId = customer.id;
      await prisma.salon.update({
        where: { id: salon.id },
        data: { paddleCustomerId: customerId },
      });
    }

    const appUrl = resolveAppUrl(req);
    const transaction = await paddleApiRequest<PaddleTransaction>("/transactions", {
      method: "POST",
      body: {
        items: [{ price_id: priceId, quantity: 1 }],
        customer_id: customerId,
        collection_mode: "automatic",
        custom_data: { salonId: salon.id },
        checkout: {
          success_url: `${appUrl}/billing?checkout=success`,
        },
      },
    });

    const checkoutUrl = transaction.checkout?.url;
    if (!checkoutUrl) {
      return NextResponse.json({ error: "Checkout URL non disponibile" }, { status: 502 });
    }
    return NextResponse.json({ checkoutUrl });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Errore durante creazione checkout";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
