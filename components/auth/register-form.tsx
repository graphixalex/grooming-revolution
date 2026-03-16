"use client";

import { useMemo, useState } from "react";
import { COUNTRY_OPTIONS, getCountryMeta } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RegisterForm({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  const [country, setCountry] = useState("IT");
  const [timezone, setTimezone] = useState(getCountryMeta("IT").defaultTimezone);
  const currency = useMemo(() => getCountryMeta(country).currency, [country]);

  return (
    <form className="space-y-3" action={action}>
      <Input name="nomeAttivita" placeholder="Nome attivita" required />
      <Input name="nomeSede" placeholder="Nome sede (es. Centro)" required />
      <Input name="indirizzo" placeholder="Indirizzo sede" required />

      <div className="space-y-1">
        <label className="text-sm text-zinc-600">Paese operativo</label>
        <select
          name="paese"
          className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
          value={country}
          onChange={(e) => {
            const next = e.target.value;
            setCountry(next);
            setTimezone(getCountryMeta(next).defaultTimezone);
          }}
        >
          {COUNTRY_OPTIONS.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm text-zinc-600">Valuta (automatica)</label>
        <Input value={currency} readOnly />
        <input type="hidden" name="valuta" value={currency} />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-zinc-600">Timezone</label>
        <Input name="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} required />
      </div>

      <Input name="email" type="email" placeholder="Email" required />
      <Input name="password" type="password" placeholder="Password (min 8)" required />

      <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-zinc-700">
        Piano trial: fino a 100 clienti. Poi piano FULL a 20 EUR/mese + IVA con addebito automatico.
      </div>

      <Button type="submit" className="w-full">
        Registrati
      </Button>
    </form>
  );
}
