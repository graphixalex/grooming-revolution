import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { sendWhatsAppTextViaApi } from "@/lib/whatsapp";

type DispatchBody = {
  batchSize?: number;
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as DispatchBody;
  const batchSize = Math.max(10, Math.min(200, Number(body.batchSize) || 100));

  const campaign = await prisma.whatsAppCampaign.findFirst({
    where: { id, salonId },
    select: { id: true, status: true, totalRecipients: true },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Campagna non trovata" }, { status: 404 });
  }

  if (campaign.status === "COMPLETED") {
    return NextResponse.json({ ok: true, status: "COMPLETED" });
  }

  if (campaign.status === "DRAFT") {
    await prisma.whatsAppCampaign.update({
      where: { id },
      data: { status: "RUNNING", startedAt: new Date() },
    });
  }

  const recipients = await prisma.whatsAppCampaignRecipient.findMany({
    where: {
      campaignId: id,
      OR: [
        { status: "PENDING" },
        { status: "FAILED", attemptCount: { lt: 3 } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: batchSize,
    select: { id: true, phone: true, renderedMessage: true, attemptCount: true },
  });

  for (const recipient of recipients) {
    const now = new Date();
    const result = await sendWhatsAppTextViaApi({
      salonId,
      phone: recipient.phone,
      text: recipient.renderedMessage,
    });
    if (result.ok) {
      await prisma.whatsAppCampaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "SENT",
          messageId: result.messageId || null,
          errorMessage: null,
          attemptCount: recipient.attemptCount + 1,
          lastAttemptAt: now,
        },
      });
    } else {
      const nextAttempt = recipient.attemptCount + 1;
      const terminal = result.error === "invalid_phone" || nextAttempt >= 3;
      await prisma.whatsAppCampaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: terminal ? "SKIPPED" : "FAILED",
          errorMessage: result.error,
          attemptCount: nextAttempt,
          lastAttemptAt: now,
        },
      });
    }
  }

  const [sentCount, failedCount, skippedCount, pendingCount] = await Promise.all([
    prisma.whatsAppCampaignRecipient.count({ where: { campaignId: id, status: "SENT" } }),
    prisma.whatsAppCampaignRecipient.count({ where: { campaignId: id, status: "FAILED" } }),
    prisma.whatsAppCampaignRecipient.count({ where: { campaignId: id, status: "SKIPPED" } }),
    prisma.whatsAppCampaignRecipient.count({
      where: {
        campaignId: id,
        OR: [{ status: "PENDING" }, { status: "FAILED", attemptCount: { lt: 3 } }],
      },
    }),
  ]);

  const completed = pendingCount === 0;
  await prisma.whatsAppCampaign.update({
    where: { id },
    data: {
      sentCount,
      failedCount,
      skippedCount,
      status: completed ? "COMPLETED" : "RUNNING",
      completedAt: completed ? new Date() : null,
    },
  });

  return NextResponse.json({
    ok: true,
    status: completed ? "COMPLETED" : "RUNNING",
    sentCount,
    failedCount,
    skippedCount,
    pendingCount,
    processed: recipients.length,
  });
}
