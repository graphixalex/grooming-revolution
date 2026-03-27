export const DEFAULT_WHATSAPP_REMINDER_TEMPLATE =
  "Gentile %nome_cliente%, con piacere Le ricordiamo l'appuntamento di %nome_pet% previsto per %data_appuntamento% alle ore %orario_appuntamento%, presso %nome_attivita% (%indirizzo_attivita%). Saremo felici di accoglierLa. Per modifiche o disdette può rispondere direttamente a questo messaggio. Grazie.";
export const LEGACY_WHATSAPP_REMINDER_TEMPLATE =
  "Ciao %nome_cliente%, promemoria per %nome_pet% il %data_appuntamento% alle %orario_appuntamento% presso %nome_attivita% (%indirizzo_attivita%).";

export const DEFAULT_WHATSAPP_BOOKING_CONFIRM_TEMPLATE =
  "Gentile %nome_cliente%, La ringraziamo per la prenotazione. Confermiamo l'appuntamento di %nome_pet% per %data_appuntamento% alle ore %orario_appuntamento% presso %nome_attivita% (%indirizzo_attivita%). Saremo lieti di accoglierLa.";

export const DEFAULT_WHATSAPP_ONE_HOUR_TEMPLATE =
  "Gentile %nome_cliente%, Le ricordiamo che oggi alle ore %orario_appuntamento% è previsto l'appuntamento di %nome_pet% presso %nome_attivita% (%indirizzo_attivita%). La aspettiamo con piacere. Se desidera aggiornare l'orario, può rispondere a questo messaggio.";

export const DEFAULT_WHATSAPP_BIRTHDAY_TEMPLATE =
  "Gentile %nome_cliente%, oggi è un giorno speciale: buon compleanno a %nome_pet%! Da tutto lo staff di %nome_attivita% i nostri auguri più affettuosi. Saremo lieti di festeggiarLo presto in salone.";

export function normalizeWhatsAppReminderTemplate(template: string | null | undefined) {
  if (typeof template !== "string") return DEFAULT_WHATSAPP_REMINDER_TEMPLATE;
  const normalized = template.trim();
  if (!normalized) return DEFAULT_WHATSAPP_REMINDER_TEMPLATE;
  if (normalized === LEGACY_WHATSAPP_REMINDER_TEMPLATE) return DEFAULT_WHATSAPP_REMINDER_TEMPLATE;
  return template;
}
