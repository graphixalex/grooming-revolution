"use client";

import { useState } from "react";

export function SalonSwitcher({
  options,
  currentSalonId,
}: {
  options: Array<{ id: string; label: string }>;
  currentSalonId: string;
}) {
  const [value, setValue] = useState(currentSalonId);
  const [loading, setLoading] = useState(false);

  async function onChange(nextSalonId: string) {
    setValue(nextSalonId);
    setLoading(true);
    const res = await fetch("/api/active-salon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salonId: nextSalonId }),
    });
    setLoading(false);
    if (!res.ok) {
      alert("Impossibile cambiare sede");
      setValue(currentSalonId);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-zinc-500">Sede attiva</span>
      <select
        className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-sm shadow-sm focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
