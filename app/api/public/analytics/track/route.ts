import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/request";

const ALLOWED_EVENTS = new Set(["homepage_view", "register_click"]);

function hashIp(ip: string) {
  const salt = process.env.ANALYTICS_SALT || process.env.NEXTAUTH_SECRET || "analytics-default-salt";
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function cleanText(value: unknown, max = 200) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const eventTypeRaw = cleanText(body.eventType, 64);
    if (!eventTypeRaw || !ALLOWED_EVENTS.has(eventTypeRaw)) {
      return NextResponse.json({ error: "Evento non valido" }, { status: 400 });
    }

    const ip = getClientIp(req);
    const ipHash = ip === "unknown" ? null : hashIp(ip);
    const path = cleanText(body.path, 500);
    const source = cleanText(body.source, 120);
    const sessionId = cleanText(body.sessionId, 120);
    const userAgent = cleanText(req.headers.get("user-agent"), 500);
    const referrer = cleanText(req.headers.get("referer"), 500);

    await prisma.publicAnalyticsEvent.create({
      data: {
        eventType: eventTypeRaw,
        path,
        source,
        sessionId,
        ipHash,
        userAgent,
        referrer,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Errore tracking";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
