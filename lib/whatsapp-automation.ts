import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SALON_TIMEZONE, normalizePhone, reminderVariables, renderTemplate } from "@/lib/reminders";
import { getDateKeyInTimeZone } from "@/lib/working-hours";
import {
  DEFAULT_WHATSAPP_BIRTHDAY_TEMPLATE,
  DEFAULT_WHATSAPP_BOOKING_CONFIRM_TEMPLATE,
  DEFAULT_WHATSAPP_ONE_HOUR_TEMPLATE,
  normalizeWhatsAppReminderTemplate,
} from "@/lib/default-templates";
import { buildDedupKey, enqueueWhatsAppMessage } from "@/lib/whatsapp-queue";

type SalonTemplateConfig = {
  id: string;
  nomeAttivita: string | null;
  indirizzo: string | null;
  timezone: string | null;
  whatsappTemplate: string | null;
  whatsappBookingTemplate: string | null;
  whatsappOneHourTemplate: string | null;
  whatsappBirthdayTemplate: string | null;
  whatsappDayBeforeEnabled: boolean;
  whatsappOneHourEnabled: boolean;
  whatsappBirthdayEnabled: boolean;
};

async function getSalonTemplates(salonId: string): Promise<SalonTemplateConfig | null> {
  return prisma.salon.findUnique({
    where: { id: salonId },
    select: {
      id: true,
      nomeAttivita: true,
      indirizzo: true,
      timezone: true,
      whatsappTemplate: true,
      whatsappBookingTemplate: true,
      whatsappOneHourTemplate: true,
      whatsappBirthdayTemplate: true,
      whatsappDayBeforeEnabled: true,
      whatsappOneHourEnabled: true,
      whatsappBirthdayEnabled: true,
    },
  });
}

export async function enqueueBookingConfirmationForAppointment(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      salonId: true,
      stato: true,
      deletedAt: true,
      startAt: true,
      cliente: { select: { id: true, nome: true, cognome: true, telefono: true } },
      cane: { select: { id: true, nome: true } },
    },
  });
  if (!appointment || appointment.deletedAt || appointment.stato !== "PRENOTATO") return { enqueued: false, reason: "appointment_not_active" };
  const normalizedPhone = normalizePhone(appointment.cliente.telefono);
  if (!normalizedPhone || appointment.cliente.telefono === "__NOTE__") return { enqueued: false, reason: "invalid_phone" };

  const salon = await getSalonTemplates(appointment.salonId);
  if (!salon) return { enqueued: false, reason: "salon_not_found" };
  const tz = salon.timezone || DEFAULT_SALON_TIMEZONE;
  const appointmentDateKey = getDateKeyInTimeZone(appointment.startAt, tz);
  const todayDateKey = getDateKeyInTimeZone(new Date(), tz);
  if (appointmentDateKey < todayDateKey) {
    return { enqueued: false, reason: "appointment_date_in_past" };
  }
  const template =
    typeof salon.whatsappBookingTemplate === "string" && salon.whatsappBookingTemplate.trim().length > 0
      ? salon.whatsappBookingTemplate
      : DEFAULT_WHATSAPP_BOOKING_CONFIRM_TEMPLATE;
  const rendered = renderTemplate(
    template,
    reminderVariables({
      nomeCliente: `${appointment.cliente.nome} ${appointment.cliente.cognome}`.trim(),
      nomePet: appointment.cane.nome,
      startAt: appointment.startAt,
      timeZone: tz,
      nomeAttivita: salon.nomeAttivita || "",
      indirizzoAttivita: salon.indirizzo || "",
    }),
  );
  const dedupKey = buildDedupKey([
    appointment.salonId,
    "BOOKING_CONFIRM",
    appointment.id,
    appointment.startAt.toISOString(),
    1,
  ]);
  const enqueued = await enqueueWhatsAppMessage({
    salonId: appointment.salonId,
    kind: "BOOKING_CONFIRM",
    dedupKey,
    recipientPhone: normalizedPhone,
    messageText: rendered,
    priority: 10,
    scheduledAt: new Date(),
    appointmentId: appointment.id,
    dogId: appointment.cane.id,
    maxAttempts: 6,
    metadataJson: {
      kind: "BOOKING_CONFIRM",
      appointmentId: appointment.id,
      appointmentStartAtIso: appointment.startAt.toISOString(),
      clientId: appointment.cliente.id,
      dogId: appointment.cane.id,
    } as Prisma.InputJsonValue,
  });
  return { enqueued: enqueued.created || enqueued.dedup, dedup: enqueued.dedup };
}

export async function enqueueReminderDayBefore(appointment: {
  id: string;
  salonId: string;
  startAt: Date;
  clientName: string;
  dogName: string;
  phone: string;
}) {
  const normalizedPhone = normalizePhone(appointment.phone);
  if (!normalizedPhone) return { enqueued: false, reason: "invalid_phone" };
  const salon = await getSalonTemplates(appointment.salonId);
  if (!salon || salon.whatsappDayBeforeEnabled === false) return { enqueued: false, reason: "disabled" };
  const template = normalizeWhatsAppReminderTemplate(salon.whatsappTemplate);
  const text = renderTemplate(
    template,
    reminderVariables({
      nomeCliente: appointment.clientName,
      nomePet: appointment.dogName,
      startAt: appointment.startAt,
      timeZone: salon.timezone || DEFAULT_SALON_TIMEZONE,
      nomeAttivita: salon.nomeAttivita || "",
      indirizzoAttivita: salon.indirizzo || "",
    }),
  );
  const dedupKey = buildDedupKey([
    appointment.salonId,
    "REMINDER_DAY_BEFORE",
    appointment.id,
    appointment.startAt.toISOString(),
    1,
  ]);
  const result = await enqueueWhatsAppMessage({
    salonId: appointment.salonId,
    kind: "REMINDER_DAY_BEFORE",
    dedupKey,
    recipientPhone: normalizedPhone,
    messageText: text,
    scheduledAt: new Date(),
    appointmentId: appointment.id,
    priority: 30,
    maxAttempts: 5,
    metadataJson: {
      appointmentId: appointment.id,
      appointmentStartAtIso: appointment.startAt.toISOString(),
      kind: "REMINDER_DAY_BEFORE",
    } as Prisma.InputJsonValue,
  });
  return { enqueued: result.created || result.dedup, dedup: result.dedup };
}

export async function enqueueReminderHourBefore(appointment: {
  id: string;
  salonId: string;
  startAt: Date;
  clientName: string;
  dogName: string;
  phone: string;
}) {
  const normalizedPhone = normalizePhone(appointment.phone);
  if (!normalizedPhone) return { enqueued: false, reason: "invalid_phone" };
  const salon = await getSalonTemplates(appointment.salonId);
  if (!salon || salon.whatsappOneHourEnabled === false) return { enqueued: false, reason: "disabled" };
  const template =
    typeof salon.whatsappOneHourTemplate === "string" && salon.whatsappOneHourTemplate.trim().length > 0
      ? salon.whatsappOneHourTemplate
      : DEFAULT_WHATSAPP_ONE_HOUR_TEMPLATE;
  const text = renderTemplate(
    template,
    reminderVariables({
      nomeCliente: appointment.clientName,
      nomePet: appointment.dogName,
      startAt: appointment.startAt,
      timeZone: salon.timezone || DEFAULT_SALON_TIMEZONE,
      nomeAttivita: salon.nomeAttivita || "",
      indirizzoAttivita: salon.indirizzo || "",
    }),
  );
  const dedupKey = buildDedupKey([
    appointment.salonId,
    "REMINDER_HOUR_BEFORE",
    appointment.id,
    appointment.startAt.toISOString(),
    1,
  ]);
  const result = await enqueueWhatsAppMessage({
    salonId: appointment.salonId,
    kind: "REMINDER_HOUR_BEFORE",
    dedupKey,
    recipientPhone: normalizedPhone,
    messageText: text,
    appointmentId: appointment.id,
    priority: 20,
    maxAttempts: 4,
    metadataJson: {
      appointmentId: appointment.id,
      appointmentStartAtIso: appointment.startAt.toISOString(),
      kind: "REMINDER_HOUR_BEFORE",
    } as Prisma.InputJsonValue,
  });
  return { enqueued: result.created || result.dedup, dedup: result.dedup };
}

export async function enqueueBirthdayGreeting(input: {
  salonId: string;
  dogId: string;
  year: number;
  phone: string;
  clientName: string;
  dogName: string;
}) {
  const normalizedPhone = normalizePhone(input.phone);
  if (!normalizedPhone) return { enqueued: false, reason: "invalid_phone" };
  const salon = await getSalonTemplates(input.salonId);
  if (!salon || salon.whatsappBirthdayEnabled === false) return { enqueued: false, reason: "disabled" };
  const template =
    typeof salon.whatsappBirthdayTemplate === "string" && salon.whatsappBirthdayTemplate.trim().length > 0
      ? salon.whatsappBirthdayTemplate
      : DEFAULT_WHATSAPP_BIRTHDAY_TEMPLATE;
  const text = renderTemplate(template, {
    nome_cliente: input.clientName,
    nome_pet: input.dogName,
    data_appuntamento: "",
    orario_appuntamento: "",
    nome_attivita: salon.nomeAttivita || "",
    indirizzo_attivita: salon.indirizzo || "",
  });
  const dedupKey = buildDedupKey([
    input.salonId,
    "BIRTHDAY_GREETING",
    input.dogId,
    input.year,
    1,
  ]);
  const result = await enqueueWhatsAppMessage({
    salonId: input.salonId,
    kind: "BIRTHDAY_GREETING",
    dedupKey,
    recipientPhone: normalizedPhone,
    messageText: text,
    dogId: input.dogId,
    priority: 40,
    maxAttempts: 4,
    metadataJson: { dogId: input.dogId, year: input.year, kind: "BIRTHDAY_GREETING" } as Prisma.InputJsonValue,
  });
  return { enqueued: result.created || result.dedup, dedup: result.dedup };
}
