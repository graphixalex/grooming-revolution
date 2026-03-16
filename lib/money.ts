export function formatCurrencyTotals(totalsByCurrency: Record<string, number>) {
  const entries = Object.entries(totalsByCurrency);
  if (entries.length === 0) return "0.00";
  return entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, value]) => `${currency} ${value.toFixed(2)}`)
    .join(" | ");
}

export function aggregateByCurrency<T>(
  rows: T[],
  getCurrency: (row: T) => string,
  getAmount: (row: T) => number,
) {
  const out: Record<string, number> = {};
  for (const row of rows) {
    const currency = (getCurrency(row) || "EUR").toUpperCase();
    out[currency] = (out[currency] ?? 0) + getAmount(row);
  }
  return out;
}
