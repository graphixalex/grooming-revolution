import { NextRequest, NextResponse } from "next/server";
import { WhatsAppCampaignType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { renderTemplate } from "@/lib/reminders";
import { CampaignAudienceSegment, listCampaignAudienceRecipients } from "@/lib/client-frequency";

type CreateCampaignBody = {
  type?: WhatsAppCampaignType;
  title?: string;
  messageTemplate?: string;
  monthsBack?: number;
  segment?: CampaignAudienceSegment;
};

function isValidType(value: unknown): value is WhatsAppCampaignType {
  return value === "SERVICE";
}

function parseCampaignSegment(value: unknown): CampaignAudienceSegment {
  if (
    value === "ALL_RECENT" ||
    value === "RETURN_MAX_5_WEEKS" ||
    value === "RETURN_MAX_8_WEEKS" ||
    value === "RETURN_MAX_12_WEEKS" ||
    value === "INACTIVE_OVER_12_WEEKS"
  ) {
    return value;
  }
  return "ALL_RECENT";
}

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;

  const campaigns = await prisma.whatsAppCampaign.findMany({
    where: { salonId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      type: true,
      title: true,
      status: true,
      totalRecipients: true,
      sentCount: true,
      failedCount: true,
      skippedCount: true,
      createdAt: true,
      startedAt: true,
      completedAt: true,
    },
  });
  return NextResponse.json(campaigns);
}

export async function POST(req: NextRequest) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;
  const salonId = auth.session.user.salonId;
  const body = (await req.json()) as CreateCampaignBody;

  if (!isValidType(body.type)) {
    return NextResponse.json({ error: "Sono consentiti solo invii di servizio" }, { status: 400 });
  }
  const title = String(body.title || "").trim();
  const messageTemplate = String(body.messageTemplate || "").trim();
  if (!title || !messageTemplate) {
    return NextResponse.json({ error: "Titolo e messaggio sono obbligatori" }, { status: 400 });
  }
  const monthsBack = Math.max(1, Math.min(36, Number(body.monthsBack) || 12));
  const segment = parseCampaignSegment(body.segment);

  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { nomeAttivita: true },
  });

  const clients = await listCampaignAudienceRecipients({
    salonId,
    type: body.type,
    segment,
    monthsBack,
  });

  const campaign = await prisma.whatsAppCampaign.create({
    data: {
      salonId,
      createdById: auth.session.user.id,
      type: body.type,
      title,
      messageTemplate,
      totalRecipients: clients.length,
      status: "DRAFT",
    },
    select: { id: true },
  });

  if (clients.length) {
    await prisma.whatsAppCampaignRecipient.createMany({
      data: clients.map((client) => ({
        campaignId: campaign.id,
        clientId: client.id,
        phone: client.telefono,
        renderedMessage: renderTemplate(messageTemplate, {
          nome_cliente: `${client.nome} ${client.cognome}`.trim(),
          nome_attivita: salon?.nomeAttivita || "",
        }),
      })),
    });
  }

  return NextResponse.json({
    ok: true,
    campaignId: campaign.id,
    recipients: clients.length,
  });
}
