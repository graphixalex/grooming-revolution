"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRY_OPTIONS, getCountryMeta } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RegisterForm() {
  const router = useRouter();
  const [country, setCountry] = useState("IT");
  const [timezone, setTimezone] = useState(getCountryMeta("IT").defaultTimezone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const currency = useMemo(() => getCountryMeta(country).currency, [country]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      const formData = new FormData(event.currentTarget);
      const payload = {
        nomeAttivita: String(formData.get("nomeAttivita") || ""),
        nomeSede: String(formData.get("nomeSede") || ""),
        indirizzo: String(formData.get("indirizzo") || ""),
        paese: String(formData.get("paese") || ""),
        valuta: String(formData.get("valuta") || ""),
        timezone: String(formData.get("timezone") || ""),
        email: String(formData.get("email") || ""),
        password: String(formData.get("password") || ""),
      };

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Errore registrazione");
        return;
      }
      router.push("/login");
      router.refresh();
    } catch {
      setError("Errore registrazione");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
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

      <div className="rounded-md border border-[#d4af37]/60 bg-[#f7f2df] p-3 text-sm text-zinc-700">
        Piano trial: fino a 100 clienti. Poi piano FULL a 20 EUR/mese + IVA con addebito automatico.
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creazione account in corso..." : "Registrati"}
      </Button>
    </form>
  );
}
