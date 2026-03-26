"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Treatment = { id: string; nome: string };

type RuleRow = {
  id: string;
  treatmentId?: string;
  treatment: { nome: string };
  dogSize: "XS" | "S" | "M" | "L" | "XL" | "XXL" | null;
  razzaPattern: string | null;
  basePrice: number | string;
  durataMinuti: number;
  validoDa: string;
  validoA: string | null;
  attiva: boolean;
  note: string | null;
};

type EditFormState = {
  treatmentId: string;
  dogSize: string;
  razzaPattern: string;
  basePrice: string;
  durataMinuti: string;
  validoDa: string;
  validoA: string;
  note: string;
};

function toDateTimeLocal(value: string) {
  return new Date(value).toISOString().slice(0, 16);
}

function buildEditForm(rule: RuleRow): EditFormState {
  return {
    treatmentId: rule.treatmentId || "",
    dogSize: rule.dogSize ?? "",
    razzaPattern: rule.razzaPattern || "",
    basePrice: String(rule.basePrice),
    durataMinuti: String(rule.durataMinuti),
    validoDa: toDateTimeLocal(rule.validoDa),
    validoA: rule.validoA ? toDateTimeLocal(rule.validoA) : "",
    note: rule.note || "",
  };
}

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
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [form, setForm] = useState({
    treatmentId: treatments[0]?.id ?? "",
    dogSize: "",
    razzaPattern: "",
    basePrice: "",
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
    const durataMinuti = Number(form.durataMinuti);
    if (!Number.isFinite(basePrice) || basePrice < 0 || !Number.isFinite(durataMinuti)) {
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
        basePrice,
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
    setForm((prev) => ({ ...prev, razzaPattern: "", basePrice: "", note: "" }));
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

  function startEdit(rule: RuleRow) {
    setEditingRuleId(rule.id);
    setEditForm(buildEditForm(rule));
  }

  function cancelEdit() {
    setEditingRuleId(null);
    setEditForm(null);
  }

  async function saveEdit() {
    if (!canEdit || !editingRuleId || !editForm) return;
    const basePrice = Number(editForm.basePrice);
    const durataMinuti = Number(editForm.durataMinuti);
    if (!Number.isFinite(basePrice) || basePrice < 0 || !Number.isFinite(durataMinuti) || durataMinuti < 15) {
      alert("Controlla i valori inseriti");
      return;
    }

    const res = await fetch("/api/pricing-rules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingRuleId,
        treatmentId: editForm.treatmentId || undefined,
        dogSize: editForm.dogSize || null,
        razzaPattern: editForm.razzaPattern || null,
        basePrice,
        durataMinuti,
        validoDa: new Date(editForm.validoDa).toISOString(),
        validoA: editForm.validoA ? new Date(editForm.validoA).toISOString() : null,
        note: editForm.note || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Errore modifica regola");
      return;
    }
    await loadRules();
    cancelEdit();
  }

  async function deleteRule(id: string) {
    if (!canEdit) return;
    if (!window.confirm("Eliminare questa regola listino?")) return;

    const res = await fetch("/api/pricing-rules", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Errore eliminazione regola");
      return;
    }
    if (editingRuleId === id) {
      cancelEdit();
    }
    await loadRules();
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
          I campi servono a creare regole specifiche per taglia/razza, con durata e periodo di validità.
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
        </div>
        <Textarea placeholder="Note regola (opzionale)" value={form.note} onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))} disabled={!canEdit} />
        <Button onClick={createRule} disabled={!canEdit}>
          Aggiungi regola
        </Button>
        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
          Come compilare: &quot;Durata&quot; sono i minuti previsti per il servizio.
          Se metti &quot;Taglia qualsiasi&quot;, la regola vale per tutte le taglie.
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Storico regole</h2>
        <div className="space-y-2 text-sm">
          {rules.map((r) => (
            <div key={r.id} className="rounded border border-zinc-200 p-3">
              {editingRuleId === r.id && editForm ? (
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-600">Trattamento</label>
                      <select
                        className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
                        value={editForm.treatmentId}
                        onChange={(e) => setEditForm((prev) => (prev ? { ...prev, treatmentId: e.target.value } : prev))}
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
                        value={editForm.dogSize}
                        onChange={(e) => setEditForm((prev) => (prev ? { ...prev, dogSize: e.target.value } : prev))}
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
                      <Input
                        value={editForm.razzaPattern}
                        onChange={(e) => setEditForm((prev) => (prev ? { ...prev, razzaPattern: e.target.value } : prev))}
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-600">Prezzo base ({currency})</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.basePrice}
                        onChange={(e) => setEditForm((prev) => (prev ? { ...prev, basePrice: e.target.value } : prev))}
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-600">Durata (minuti)</label>
                      <Input
                        type="number"
                        min="15"
                        step="15"
                        value={editForm.durataMinuti}
                        onChange={(e) => setEditForm((prev) => (prev ? { ...prev, durataMinuti: e.target.value } : prev))}
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-600">Valida dal</label>
                      <Input
                        type="datetime-local"
                        value={editForm.validoDa}
                        onChange={(e) => setEditForm((prev) => (prev ? { ...prev, validoDa: e.target.value } : prev))}
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-600">Valida fino al (opzionale)</label>
                      <Input
                        type="datetime-local"
                        value={editForm.validoA}
                        onChange={(e) => setEditForm((prev) => (prev ? { ...prev, validoA: e.target.value } : prev))}
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                  <Textarea value={editForm.note} onChange={(e) => setEditForm((prev) => (prev ? { ...prev, note: e.target.value } : prev))} disabled={!canEdit} />
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={saveEdit} disabled={!canEdit}>
                      Salva modifica
                    </Button>
                    <Button variant="outline" onClick={cancelEdit}>
                      Annulla
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="font-medium">
                    {r.treatment.nome} | {currency} {Number(r.basePrice).toFixed(2)} | {r.durataMinuti} min
                  </p>
                  <p>Taglia: {r.dogSize ?? "qualsiasi"} | Razza: {r.razzaPattern || "-"}</p>
                  <p>
                    validità: {new Date(r.validoDa).toLocaleString("it-IT")} - {r.validoA ? new Date(r.validoA).toLocaleString("it-IT") : "aperta"}
                  </p>
                  <p>Stato: {r.attiva ? "Attiva" : "Disattivata"}</p>
                  {canEdit ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => startEdit(r)}>
                        Modifica
                      </Button>
                      <Button variant="outline" onClick={() => toggleRule(r.id, !r.attiva)}>
                        {r.attiva ? "Disattiva" : "Riattiva"}
                      </Button>
                      <Button variant="destructive" onClick={() => deleteRule(r.id)}>
                        Elimina
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
