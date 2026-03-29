import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { buildDedupKey, enqueueWhatsAppMessage, processWhatsAppQueueBatch } from "@/lib/whatsapp-queue";
import { normalizePhoneCanonical } from "@/lib/phone";

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
    select: { id: true, status: true, totalRecipients: true, type: true },
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

  let enqueued = 0;
  let deduped = 0;
  let skippedInvalidPhone = 0;
  for (const recipient of recipients) {
    const phone = normalizePhoneCanonical(recipient.phone);
    if (!phone) {
      skippedInvalidPhone += 1;
      await prisma.whatsAppCampaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "SKIPPED",
          errorMessage: "invalid_phone",
          lastAttemptAt: new Date(),
        },
      });
      continue;
    }
    const queueResult = await enqueueWhatsAppMessage({
      salonId,
      kind: campaign.type === "MARKETING" ? "CAMPAIGN_MARKETING" : "CAMPAIGN_SERVICE",
      dedupKey: buildDedupKey([salonId, "CAMPAIGN", id, recipient.id, 1]),
      recipientPhone: phone,
      messageText: recipient.renderedMessage,
      priority: 60,
      campaignId: id,
      campaignRecipientId: recipient.id,
      maxAttempts: 3,
      metadataJson: { campaignId: id, campaignRecipientId: recipient.id },
    });
    await prisma.whatsAppCampaignRecipient.update({
      where: { id: recipient.id },
      data: {
        status: "PENDING",
        errorMessage: null,
        lastAttemptAt: new Date(),
      },
    });
    if (queueResult.dedup) deduped += 1;
    else enqueued += 1;
  }
  const worker = await processWhatsAppQueueBatch({ batchSize: Math.max(batchSize, 100), workerId: "campaign-dispatch" });

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
    enqueued,
    deduped,
    skippedInvalidPhone,
    sentCount,
    failedCount,
    skippedCount,
    pendingCount,
    processed: recipients.length,
    worker,
  });
}
