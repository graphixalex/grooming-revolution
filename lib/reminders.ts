import { format } from "date-fns";

export function renderTemplate(template: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce((acc, [key, value]) => acc.replaceAll(`%${key}%`, value ?? ""), template);
}

export function normalizePhone(phone: string) {
  const normalized = phone.replace(/[^\d+]/g, "");
  if (normalized.startsWith("+")) return normalized.slice(1);
  if (normalized.startsWith("00")) return normalized.slice(2);
  if (normalized.startsWith("3") && normalized.length >= 9) return normalized;
  return "";
}

export function reminderVariables(data: {
  nomeCliente: string;
  nomePet: string;
  startAt: Date;
  nomeAttivita: string;
  indirizzoAttivita: string;
}) {
  return {
    nome_cliente: data.nomeCliente,
    nome_pet: data.nomePet,
    data_appuntamento: format(data.startAt, "dd-MM-yyyy"),
    orario_appuntamento: format(data.startAt, "HH:mm"),
    nome_attivita: data.nomeAttivita,
    indirizzo_attivita: data.indirizzoAttivita,
  };
}

