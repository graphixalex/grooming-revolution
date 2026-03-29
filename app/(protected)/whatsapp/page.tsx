import { redirect } from "next/navigation";
import { getRequiredSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { WhatsAppClient } from "@/components/whatsapp/whatsapp-client";
import { Prisma } from "@prisma/client";
import {
  DEFAULT_WHATSAPP_BIRTHDAY_TEMPLATE,
  DEFAULT_WHATSAPP_BOOKING_CONFIRM_TEMPLATE,
  DEFAULT_WHATSAPP_ONE_HOUR_TEMPLATE,
  normalizeWhatsAppReminderTemplate,
} from "@/lib/default-templates";
import { getWhatsAppConnectionDiagnostics } from "@/lib/whatsapp-connection";

export default async function WhatsAppPage() {
  const session = await getRequiredSession();
  if (session.user.role === "STAFF") {
    redirect("/planner");
  }

  const [salon, connectionState] = await Promise.all([
    (async () => {
    try {
      return await prisma.salon.findUnique({
        where: { id: session.user.salonId },
        select: {
          id: true,
          whatsappTemplate: true,
          whatsappBookingTemplate: true,
          whatsappOneHourTemplate: true,
          whatsappBirthdayTemplate: true,
          whatsappDayBeforeEnabled: true,
          whatsappOneHourEnabled: true,
          whatsappBirthdayEnabled: true,
          whatsappApiEnabled: true,
          whatsappApiPhoneNumberId: true,
          whatsappApiBusinessAccountId: true,
          whatsappApiDisplayPhoneNumber: true,
          whatsappApiVersion: true,
          whatsappApiConnectedAt: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2021" || error.code === "P2022")
      ) {
        const legacy = await prisma.salon.findUnique({
          where: { id: session.user.salonId },
          select: {
            id: true,
            whatsappTemplate: true,
            whatsappApiEnabled: true,
            whatsappApiPhoneNumberId: true,
            whatsappApiBusinessAccountId: true,
            whatsappApiDisplayPhoneNumber: true,
            whatsappApiVersion: true,
            whatsappApiConnectedAt: true,
          },
        });
        return legacy
          ? {
              ...legacy,
              whatsappTemplate: normalizeWhatsAppReminderTemplate(legacy.whatsappTemplate),
              whatsappBookingTemplate: DEFAULT_WHATSAPP_BOOKING_CONFIRM_TEMPLATE,
              whatsappOneHourTemplate: DEFAULT_WHATSAPP_ONE_HOUR_TEMPLATE,
              whatsappBirthdayTemplate: DEFAULT_WHATSAPP_BIRTHDAY_TEMPLATE,
              whatsappDayBeforeEnabled: true,
              whatsappOneHourEnabled: true,
              whatsappBirthdayEnabled: true,
              whatsappApiBusinessAccountId: null,
              whatsappApiDisplayPhoneNumber: null,
              whatsappApiConnectedAt: null,
            }
          : legacy;
      }
      throw error;
    }
  })(),
    getWhatsAppConnectionDiagnostics(session.user.salonId),
  ]);

  const initialSalon = {
    ...(salon || {}),
    whatsappTemplate: normalizeWhatsAppReminderTemplate(salon?.whatsappTemplate),
    whatsappBookingTemplate: salon?.whatsappBookingTemplate || DEFAULT_WHATSAPP_BOOKING_CONFIRM_TEMPLATE,
    whatsappOneHourTemplate: salon?.whatsappOneHourTemplate || DEFAULT_WHATSAPP_ONE_HOUR_TEMPLATE,
    whatsappBirthdayTemplate: salon?.whatsappBirthdayTemplate || DEFAULT_WHATSAPP_BIRTHDAY_TEMPLATE,
    whatsappDayBeforeEnabled: Boolean(salon?.whatsappDayBeforeEnabled ?? true),
    whatsappOneHourEnabled: Boolean(salon?.whatsappOneHourEnabled ?? true),
    whatsappBirthdayEnabled: Boolean(salon?.whatsappBirthdayEnabled ?? true),
    whatsappApiBusinessAccountId: salon?.whatsappApiBusinessAccountId || null,
    whatsappApiDisplayPhoneNumber: salon?.whatsappApiDisplayPhoneNumber || null,
    whatsappApiConnectedAt: salon?.whatsappApiConnectedAt || null,
    whatsappApiAccessToken: "",
    whatsappConnection: connectionState.connection,
    whatsappGateway: connectionState.gateway,
    whatsappDiagnostics: connectionState.diagnostics,
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">WhatsApp</h1>
      <p className="text-sm text-zinc-600">
        Gestisca connessione canale, automazioni transazionali e diagnostica invii in un unico punto.
      </p>
      <WhatsAppClient initialSalon={initialSalon} />
    </div>
  );
}
