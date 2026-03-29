import { NextRequest, NextResponse } from "next/server";
import { processWhatsAppQueueBatch } from "@/lib/whatsapp-queue";
import { assertCriticalEnv } from "@/lib/env-security";

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;
  const alt = req.headers.get("x-cron-secret");
  return token === secret || alt === secret;
}

export async function GET(req: NextRequest) {
  assertCriticalEnv("cron");
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const batchSize = Math.max(10, Math.min(300, Number(req.nextUrl.searchParams.get("batchSize")) || 120));
  const worker = await processWhatsAppQueueBatch({ workerId: "cron-queue-dispatch", batchSize });
  return NextResponse.json({ ok: true, worker });
}

