import { prisma } from "@/lib/prisma";
import { createMetaWebhookHandlers } from "@/lib/whatsapp-webhook";

export const runtime = "nodejs";

const handlers = createMetaWebhookHandlers({
  getVerifyToken: () => process.env.META_WHATSAPP_VERIFY_TOKEN,
  getAppSecret: () => process.env.META_APP_SECRET,
  findSalons: (phoneNumberIds) => prisma.salon.findMany({
    where: { whatsappApiPhoneNumberId: { in: phoneNumberIds } },
    select: {
      id: true,
      whatsappApiPhoneNumberId: true,
      whatsappApiBusinessAccountId: true,
      whatsappApiEnabled: true,
      whatsappConnection: { select: { providerType: true } },
    },
  }),
  findOutbound: (pairs) => prisma.whatsAppOutboundMessage.findMany({
    where: { providerType: "META_EMBEDDED", OR: pairs.map(({ salonId, externalMessageId }) => ({ salonId, externalMessageId })) },
    select: { id: true, salonId: true, externalMessageId: true },
  }),
  log: (level, event, ids) => console[level](event, ids || {}),
});

export const GET = handlers.GET;
export const POST = handlers.POST;
