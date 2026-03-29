const DIAL_CODE_BY_COUNTRY: Record<string, string> = {
  AT: "43",
  BE: "32",
  CH: "41",
  DE: "49",
  ES: "34",
  FR: "33",
  GB: "44",
  IT: "39",
  NL: "31",
  PT: "351",
  US: "1",
};

function sanitizePhoneInput(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  // Keep digits and plus only, then normalize plus position/count.
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (!cleaned) return "";

  const hasLeadingPlus = cleaned.startsWith("+");
  const digits = cleaned.replace(/[^\d]/g, "");
  if (!digits) return "";

  return hasLeadingPlus ? `+${digits}` : digits;
}

function normalizeCountryCode(countryCode?: string | null) {
  const code = String(countryCode || "").trim().toUpperCase();
  return code || null;
}

export function normalizePhoneCanonical(input: string, options?: { countryCode?: string | null }) {
  const sanitized = sanitizePhoneInput(input);
  if (!sanitized) return "";

  if (sanitized.startsWith("+")) return sanitized;
  if (sanitized.startsWith("00")) {
    const digits = sanitized.slice(2).replace(/[^\d]/g, "");
    return digits ? `+${digits}` : "";
  }

  const countryCode = normalizeCountryCode(options?.countryCode);
  const dial = countryCode ? DIAL_CODE_BY_COUNTRY[countryCode] : null;
  if (dial) {
    if (sanitized.startsWith(dial)) return `+${sanitized}`;
    return `+${dial}${sanitized}`;
  }

  // Conservative fallback: keep international-style canonical marker.
  return `+${sanitized}`;
}

export function normalizePhoneForWhatsApp(input: string, options?: { countryCode?: string | null }) {
  const canonical = normalizePhoneCanonical(input, options);
  return canonical.replace(/^\+/, "");
}

export function buildPhoneMatchCandidates(input: string, options?: { countryCode?: string | null }) {
  const set = new Set<string>();

  const canonical = normalizePhoneCanonical(input, options);
  const sanitized = sanitizePhoneInput(input);
  const noSpaceLegacy = String(input || "").replace(/\s+/g, "").trim();

  if (canonical) {
    set.add(canonical);
    set.add(canonical.replace(/^\+/, ""));
  }
  if (sanitized) {
    set.add(sanitized);
    set.add(sanitized.replace(/^\+/, ""));
    if (sanitized.startsWith("00")) {
      const intl = `+${sanitized.slice(2)}`;
      set.add(intl);
      set.add(intl.replace(/^\+/, ""));
    }
  }
  if (noSpaceLegacy) set.add(noSpaceLegacy);

  return Array.from(set).filter((v) => v.length > 0);
}
