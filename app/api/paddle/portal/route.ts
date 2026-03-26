import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { canManageSettings } from "@/lib/rbac";
import { paddleApiRequest } from "@/lib/paddle";
import { assertCriticalEnv } from "@/lib/env-security";

type PaddleSubscription = {
  management_urls?: {
    update_payment_method?: string;
    cancel?: string;
  };
};

export async function GET() {
  try {
    assertCriticalEnv("paddle");

    const auth = await requireApiSession();
    if ("error" in auth) return auth.error;
    if (!canManageSettings(auth.session.user.role as any)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const salon = await prisma.salon.findUnique({
      where: { id: auth.session.user.salonId },
      select: { paddleSubscriptionId: true },
    });

    if (!salon?.paddleSubscriptionId) {
      return NextResponse.json(
        { error: "Nessun abbonamento Paddle attivo. Attiva prima il piano FULL." },
        { status: 400 },
      );
    }

    const subscription = await paddleApiRequest<PaddleSubscription>(
      `/subscriptions/${salon.paddleSubscriptionId}`,
    );
    const url =
      subscription.management_urls?.update_payment_method ||
      subscription.management_urls?.cancel;

    if (!url) {
      return NextResponse.json(
        { error: "URL gestione abbonamento non disponibile" },
        { status: 502 },
      );
    }

    return NextResponse.json({ url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Errore apertura portale";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
