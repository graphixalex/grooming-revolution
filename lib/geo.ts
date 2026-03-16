export type CountryOption = {
  code: string;
  name: string;
  currency: string;
  defaultTimezone: string;
};

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: "IT", name: "Italia", currency: "EUR", defaultTimezone: "Europe/Rome" },
  { code: "CH", name: "Svizzera", currency: "CHF", defaultTimezone: "Europe/Zurich" },
  { code: "FR", name: "Francia", currency: "EUR", defaultTimezone: "Europe/Paris" },
  { code: "DE", name: "Germania", currency: "EUR", defaultTimezone: "Europe/Berlin" },
  { code: "ES", name: "Spagna", currency: "EUR", defaultTimezone: "Europe/Madrid" },
  { code: "PT", name: "Portogallo", currency: "EUR", defaultTimezone: "Europe/Lisbon" },
  { code: "GB", name: "Regno Unito", currency: "GBP", defaultTimezone: "Europe/London" },
  { code: "US", name: "Stati Uniti", currency: "USD", defaultTimezone: "America/New_York" },
  { code: "CA", name: "Canada", currency: "CAD", defaultTimezone: "America/Toronto" },
  { code: "AU", name: "Australia", currency: "AUD", defaultTimezone: "Australia/Sydney" },
  { code: "AE", name: "Emirati Arabi Uniti", currency: "AED", defaultTimezone: "Asia/Dubai" },
];

export function getCountryMeta(code?: string | null) {
  if (!code) return COUNTRY_OPTIONS[0];
  return COUNTRY_OPTIONS.find((c) => c.code === code.toUpperCase()) ?? COUNTRY_OPTIONS[0];
}
