import { redirect } from "next/navigation";
import { getRequiredSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { WhatsAppClient } from "@/components/whatsapp/whatsapp-client";
import { Prisma } from "@prisma/client";
import {
  DEFAULT_WHATSAPP_BIRTHDAY_TEMPLATE,
  DEFAULT_WHATSAPP_ONE_HOUR_TEMPLATE,
  DEFAULT_WHATSAPP_REMINDER_TEMPLATE,
} from "@/lib/default-templates";

export default async function WhatsAppPage() {
  const session = await getRequiredSession();
  if (session.user.role === "STAFF") {
    redirect("/planner");
  }

  const salon = await (async () => {
    try {
      return await prisma.salon.findUnique({
        where: { id: session.user.salonId },
        select: {
          id: true,
          whatsappTemplate: true,
          whatsappOneHourTemplate: true,
          whatsappBirthdayTemplate: true,
          whatsappDayBeforeEnabled: true,
          whatsappOneHourEnabled: true,
          whatsappBirthdayEnabled: true,
          whatsappApiEnabled: true,
          whatsappApiPhoneNumberId: true,
          whatsappApiVersion: true,
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
            whatsappApiVersion: true,
          },
        });
        return legacy
          ? {
              ...legacy,
              whatsappTemplate: legacy.whatsappTemplate || DEFAULT_WHATSAPP_REMINDER_TEMPLATE,
              whatsappOneHourTemplate: DEFAULT_WHATSAPP_ONE_HOUR_TEMPLATE,
              whatsappBirthdayTemplate: DEFAULT_WHATSAPP_BIRTHDAY_TEMPLATE,
              whatsappDayBeforeEnabled: true,
              whatsappOneHourEnabled: true,
              whatsappBirthdayEnabled: true,
            }
          : legacy;
      }
      throw error;
    }
  })();

  const initialSalon = {
    ...(salon || {}),
    whatsappTemplate: salon?.whatsappTemplate || DEFAULT_WHATSAPP_REMINDER_TEMPLATE,
    whatsappOneHourTemplate: salon?.whatsappOneHourTemplate || DEFAULT_WHATSAPP_ONE_HOUR_TEMPLATE,
    whatsappBirthdayTemplate: salon?.whatsappBirthdayTemplate || DEFAULT_WHATSAPP_BIRTHDAY_TEMPLATE,
    whatsappDayBeforeEnabled: Boolean(salon?.whatsappDayBeforeEnabled ?? true),
    whatsappOneHourEnabled: Boolean(salon?.whatsappOneHourEnabled ?? true),
    whatsappBirthdayEnabled: Boolean(salon?.whatsappBirthdayEnabled ?? true),
    whatsappApiAccessToken: "",
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">WhatsApp</h1>
      <p className="text-sm text-zinc-600">
        Gestisca in un unico punto template promemoria, API Meta e campagne WhatsApp.
      </p>
      <WhatsAppClient initialSalon={initialSalon} />
    </div>
  );
}
