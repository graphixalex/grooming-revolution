"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Treatment = { id: string; nome: string };

type RuleRow = {
  id: string;
  treatment: { nome: string };
  dogSize: "XS" | "S" | "M" | "L" | "XL" | "XXL" | null;
  razzaPattern: string | null;
  extraLabel: string | null;
  basePrice: number | string;
  extraPrice: number | string;
  durataMinuti: number;
  validoDa: string;
  validoA: string | null;
  attiva: boolean;
  note: string | null;
};

export function PricingClient({
  treatments,
  initialRules,
  canEdit,
  currency,
}: {
  treatments: Treatment[];
  initialRules: RuleRow[];
  canEdit: boolean;
  currency: string;
}) {
  const [rules, setRules] = useState(initialRules);
  const [form, setForm] = useState({
    treatmentId: treatments[0]?.id ?? "",
    dogSize: "",
    razzaPattern: "",
    extraLabel: "",
    basePrice: "",
    extraPrice: "0",
    durataMinuti: "60",
    validoDa: new Date().toISOString().slice(0, 16),
    validoA: "",
    note: "",
  });

  async function loadRules() {
    const res = await fetch("/api/pricing-rules");
    const data = await res.json();
    if (res.ok) setRules(data);
  }

  async function createRule() {
    if (!canEdit) return;
    const basePrice = Number(form.basePrice);
    const extraPrice = Number(form.extraPrice || "0");
    const durataMinuti = Number(form.durataMinuti);
    if (!Number.isFinite(basePrice) || basePrice < 0 || !Number.isFinite(extraPrice) || extraPrice < 0 || !Number.isFinite(durataMinuti)) {
      alert("Controlla i valori inseriti");
      return;
    }

    const res = await fetch("/api/pricing-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        treatmentId: form.treatmentId,
        dogSize: form.dogSize || null,
        razzaPattern: form.razzaPattern || null,
        extraLabel: form.extraLabel || null,
        basePrice,
        extraPrice,
        durataMinuti,
        validoDa: new Date(form.validoDa).toISOString(),
        validoA: form.validoA ? new Date(form.validoA).toISOString() : null,
        note: form.note || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Errore creazione regola");
      return;
    }
    await loadRules();
  }

  async function toggleRule(id: string, attiva: boolean) {
    if (!canEdit) return;
    const res = await fetch("/api/pricing-rules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, attiva }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Errore aggiornamento regola");
      return;
    }
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, attiva } : r)));
  }

  const activeRules = useMemo(() => rules.filter((r) => r.attiva), [rules]);

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <h2 className="font-semibold">Regole attive</h2>
        <p className="text-sm text-zinc-600">Totale regole attive: {activeRules.length}</p>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">Nuova regola prezzo</h2>
        <p className="text-sm text-zinc-600">
          I campi servono a creare regole specifiche per taglia/razza/extra, con durata e periodo di validita.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600">Trattamento</label>
            <select
              className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
              value={form.treatmentId}
              onChange={(e) => setForm((prev) => ({ ...prev, treatmentId: e.target.value }))}
              disabled={!canEdit}
            >
              {treatments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600">Taglia</label>
            <select
              className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
              value={form.dogSize}
              onChange={(e) => setForm((prev) => ({ ...prev, dogSize: e.target.value }))}
              disabled={!canEdit}
            >
              <option value="">Taglia qualsiasi</option>
              <option value="XS">XS</option>
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="L">L</option>
              <option value="XL">XL</option>
              <option value="XXL">XXL</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600">Razza (opzionale)</label>
            <Input placeholder="Es. Barboncino" value={form.razzaPattern} onChange={(e) => setForm((prev) => ({ ...prev, razzaPattern: e.target.value }))} disabled={!canEdit} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600">Prezzo base ({currency})</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder={`Es. 45.00 ${currency}`}
              value={form.basePrice}
              onChange={(e) => setForm((prev) => ({ ...prev, basePrice: e.target.value }))}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600">Extra ({currency})</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder={`Es. 10.00 ${currency}`}
              value={form.extraPrice}
              onChange={(e) => setForm((prev) => ({ ...prev, extraPrice: e.target.value }))}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600">Durata (minuti)</label>
            <Input
              type="number"
              min="15"
              step="15"
              placeholder="Es. 60"
              value={form.durataMinuti}
              onChange={(e) => setForm((prev) => ({ ...prev, durataMinuti: e.target.value }))}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600">Valida dal</label>
            <Input type="datetime-local" value={form.validoDa} onChange={(e) => setForm((prev) => ({ ...prev, validoDa: e.target.value }))} disabled={!canEdit} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600">Valida fino al (opzionale)</label>
            <Input type="datetime-local" value={form.validoA} onChange={(e) => setForm((prev) => ({ ...prev, validoA: e.target.value }))} disabled={!canEdit} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600">Nome extra (opzionale)</label>
            <Input placeholder="Es. Snodatura intensa" value={form.extraLabel} onChange={(e) => setForm((prev) => ({ ...prev, extraLabel: e.target.value }))} disabled={!canEdit} />
          </div>
        </div>
        <Textarea placeholder="Note regola (opzionale)" value={form.note} onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))} disabled={!canEdit} />
        <Button onClick={createRule} disabled={!canEdit}>
          Aggiungi regola
        </Button>
        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
          Come compilare: &quot;Extra&quot; e il supplemento da sommare al prezzo base quando serve un lavoro aggiuntivo.
          &quot;Durata&quot; sono i minuti previsti per il servizio. Se metti &quot;Taglia qualsiasi&quot;, la regola vale per tutte le taglie.
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Storico regole</h2>
        <div className="space-y-2 text-sm">
          {rules.map((r) => (
            <div key={r.id} className="rounded border border-zinc-200 p-3">
              <p className="font-medium">
                {r.treatment.nome} | {currency} {Number(r.basePrice).toFixed(2)} + {currency} {Number(r.extraPrice).toFixed(2)} extra | {r.durataMinuti} min
              </p>
              <p>Taglia: {r.dogSize ?? "qualsiasi"} | Razza: {r.razzaPattern || "-"} | Extra: {r.extraLabel || "-"}</p>
              <p>Validita: {new Date(r.validoDa).toLocaleString("it-IT")} - {r.validoA ? new Date(r.validoA).toLocaleString("it-IT") : "aperta"}</p>
              <p>Stato: {r.attiva ? "Attiva" : "Disattivata"}</p>
              {canEdit ? (
                <Button variant="outline" onClick={() => toggleRule(r.id, !r.attiva)}>
                  {r.attiva ? "Disattiva" : "Riattiva"}
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
