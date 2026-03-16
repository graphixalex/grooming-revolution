import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY mancante" }, { status: 400 });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-02-25.clover" });

  const body = await req.text();
  const signature = req.headers.get("stripe-signature") || "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) return NextResponse.json({ error: "Webhook secret mancante" }, { status: 400 });

  try {
    const event = stripe.webhooks.constructEvent(body, signature, secret);
    return NextResponse.json({ received: true, type: event.type });
  } catch {
    return NextResponse.json({ error: "Webhook non valido" }, { status: 400 });
  }
}

