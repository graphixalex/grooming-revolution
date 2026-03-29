import { normalizePhoneForWhatsApp } from "@/lib/phone";
export const DEFAULT_SALON_TIMEZONE = "Europe/Zurich";

function formatDateInTimeZone(date: Date, timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).formatToParts(date);
    const day = parts.find((p) => p.type === "day")?.value || "00";
    const month = parts.find((p) => p.type === "month")?.value || "00";
    const year = parts.find((p) => p.type === "year")?.value || "0000";
    return `${day}-${month}-${year}`;
  } catch {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: DEFAULT_SALON_TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).formatToParts(date);
    const day = parts.find((p) => p.type === "day")?.value || "00";
    const month = parts.find((p) => p.type === "month")?.value || "00";
    const year = parts.find((p) => p.type === "year")?.value || "0000";
    return `${day}-${month}-${year}`;
  }
}

function formatTimeInTimeZone(date: Date, timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);
    const hour = parts.find((p) => p.type === "hour")?.value || "00";
    const minute = parts.find((p) => p.type === "minute")?.value || "00";
    return `${hour}:${minute}`;
  } catch {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: DEFAULT_SALON_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);
    const hour = parts.find((p) => p.type === "hour")?.value || "00";
    const minute = parts.find((p) => p.type === "minute")?.value || "00";
    return `${hour}:${minute}`;
  }
}

export function renderTemplate(template: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce((acc, [key, value]) => acc.replaceAll(`%${key}%`, value ?? ""), template);
}

export function normalizePhone(phone: string) {
  return normalizePhoneForWhatsApp(phone);
}

export function reminderVariables(data: {
  nomeCliente: string;
  nomePet: string;
  startAt: Date;
  timeZone?: string;
  nomeAttivita: string;
  indirizzoAttivita: string;
}) {
  const timeZone = data.timeZone || DEFAULT_SALON_TIMEZONE;
  return {
    nome_cliente: data.nomeCliente,
    nome_pet: data.nomePet,
    data_appuntamento: formatDateInTimeZone(data.startAt, timeZone),
    orario_appuntamento: formatTimeInTimeZone(data.startAt, timeZone),
    nome_attivita: data.nomeAttivita,
    indirizzo_attivita: data.indirizzoAttivita,
  };
}

