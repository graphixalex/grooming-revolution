"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  clientNome: string;
  clientCognome: string;
  clientTelefono: string;
  dogNome: string;
  dogRazza?: string | null;
  dogTaglia: string;
  dogTipoPelo?: string | null;
  note?: string | null;
  trustFlag: "NEW_CLIENT" | "STALE_CLIENT" | "TRUSTED_CLIENT";
  status: "PENDING" | "APPROVED" | "REJECTED" | "AUTO_CONFIRMED";
  requestedStartAt: string;
  requestedEndAt: string;
  estimatedDurationMin: number;
  createdAt: string;
  treatmentId: string;
  treatment: { nome: string };
  proposedOperator?: { nome: string } | null;
  proposedOperatorId?: string | null;
};

type Treatment = { id: string; nome: string };
type Slot = { startAt: string; endAt: string; operatorId: string | null; operatorName: string | null };

function trustStyle(flag: Row["trustFlag"]) {
  if (flag === "NEW_CLIENT") return "border-red-300 bg-red-50 text-red-800";
  if (flag === "STALE_CLIENT") return "border-amber-300 bg-amber-50 text-amber-800";
  return "border-emerald-300 bg-emerald-50 text-emerald-800";
}

function trustLabel(flag: Row["trustFlag"]) {
  if (flag === "NEW_CLIENT") return "Rosso: nuovo cliente (da verificare)";
  if (flag === "STALE_CLIENT") return "Arancione: cliente oltre 60 giorni";
  return "Verde: cliente affidabile/idoneo";
}

export function MessagesClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIncoming, setNewIncoming] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTreatmentId, setEditTreatmentId] = useState<string>("");
  const [editSlots, setEditSlots] = useState<Slot[]>([]);
  const [editSelectedSlotKey, setEditSelectedSlotKey] = useState<string>("");
  const [editDuration, setEditDuration] = useState<number | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  async function load(showLoader = true) {
    if (showLoader) setLoading(true);
    const res = await fetch("/api/booking-requests", { cache: "no-store" });
    const data = await res.json();
    if (showLoader) setLoading(false);
    if (!res.ok) {
      alert(data.error || "Errore caricamento messaggi");
      return;
    }
    const nextRows: Row[] = Array.isArray(data?.rows) ? data.rows : [];
    const nextPending = nextRows.filter((r) => r.status === "PENDING").length;
    if (!showLoader && nextPending > pendingCount) {
      setNewIncoming(true);
      window.setTimeout(() => setNewIncoming(false), 5000);
    }
    setPendingCount(nextPending);
    setRows(nextRows);
    setTreatments(Array.isArray(data?.treatments) ? data.treatments : []);
  }

  useEffect(() => {
    void load(true);
    const id = window.setInterval(() => void load(false), 20000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editingRow = useMemo(() => rows.find((r) => r.id === editingId) || null, [rows, editingId]);

  async function processRequest(requestId: string, action: "approve" | "reject") {
    const label = action === "approve" ? "confermare" : "rifiutare";
    if (!window.confirm(`Confermi di ${label} la richiesta?`)) return;
    const res = await fetch("/api/booking-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, action }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Errore aggiornamento richiesta");
      return;
    }
    await load(false);
  }

  async function openEditor(row: Row, mode: "service" | "time") {
    setEditingId(row.id);
    setEditTreatmentId(row.treatmentId);
    setEditSelectedSlotKey("");
    setEditSlots([]);
    setEditDuration(null);
    if (mode === "time") {
      await loadOptions(row.id, row.treatmentId);
    }
  }

  async function loadOptions(requestId: string, treatmentId: string) {
    setEditLoading(true);
    const res = await fetch(`/api/booking-requests/options?requestId=${encodeURIComponent(requestId)}&treatmentId=${encodeURIComponent(treatmentId)}`, { cache: "no-store" });
    const data = await res.json();
    setEditLoading(false);
    if (!res.ok) {
      alert(data.error || "Errore caricamento opzioni");
      return;
    }
    setEditDuration(Number(data.estimatedDurationMin || 0) || null);
    const slots: Slot[] = Array.isArray(data.slots) ? data.slots : [];
    setEditSlots(slots);
    setEditSelectedSlotKey(slots[0] ? `${slots[0].startAt}|${slots[0].operatorId || ""}` : "");
  }

  async function saveEdit() {
    if (!editingRow) return;
    if (!editSelectedSlotKey) {
      alert("Seleziona uno slot prima di salvare.");
      return;
    }
    const [selectedStartAt, selectedOperatorIdRaw] = editSelectedSlotKey.split("|");
    setSavingEdit(true);
    const res = await fetch("/api/booking-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: editingRow.id,
        action: "update",
        treatmentId: editTreatmentId,
        selectedStartAt,
        selectedOperatorId: selectedOperatorIdRaw || null,
      }),
    });
    const data = await res.json();
    setSavingEdit(false);
    if (!res.ok) {
      alert(data.error || "Errore salvataggio modifica");
      return;
    }
    setEditingId(null);
    setEditSlots([]);
    setEditSelectedSlotKey("");
    await load(false);
  }

  async function deleteProcessedRequest(requestId: string) {
    if (!window.confirm("Eliminare questo messaggio processato? Questa azione non si può annullare.")) return;
    const res = await fetch(`/api/booking-requests?requestId=${encodeURIComponent(requestId)}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Errore eliminazione messaggio");
      return;
    }
    await load(false);
  }

  if (loading) return <p className="text-sm text-zinc-600">Caricamento richieste...</p>;

  return (
    <div className="space-y-3">
      {newIncoming ? (
        <Card className="border-red-200 bg-red-50 text-sm text-red-800">
          Nuova richiesta booking ricevuta. L&apos;elenco è stato aggiornato.
        </Card>
      ) : null}
      {rows.length === 0 ? <Card>Nessuna richiesta booking online.</Card> : null}
      {rows.map((row) => {
        const start = new Date(row.requestedStartAt);
        const nodiMatch = (row.note || "").match(/Nodi:\s*([^\n\r]+)/i);
        const nodiLabel = nodiMatch?.[1]?.trim() || "-";
        const isEditing = editingId === row.id;
        return (
          <Card key={row.id} className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2 py-1 text-xs font-medium ${trustStyle(row.trustFlag)}`}>
                {trustLabel(row.trustFlag)}
              </span>
              <span className="rounded-full border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs">{row.status}</span>
            </div>
            <p className="text-sm font-semibold">{row.clientNome} {row.clientCognome} - {row.clientTelefono}</p>
            <p className="text-sm">
              Cane: {row.dogNome} ({row.dogRazza || "-"}, {row.dogTaglia}{row.dogTipoPelo ? `, pelo ${row.dogTipoPelo}` : ""})
            </p>
            <p className="text-sm">Nodi dichiarati: {nodiLabel}</p>
            <p className="text-sm">
              Servizio: {row.treatment.nome} - {row.estimatedDurationMin} min
            </p>
            <p className="text-sm">
              Richiesta per: {start.toLocaleString("it-IT", { weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              {row.proposedOperator?.nome ? ` - Operatore: ${row.proposedOperator.nome}` : ""}
            </p>
            <p className="text-sm text-zinc-600">Note: {row.note || "-"}</p>
            {row.status === "PENDING" ? (
              <div className="space-y-2">
                <p className="text-xs text-zinc-600">
                  `Conferma richiesta` crea l&apos;appuntamento in agenda. `Rifiuta richiesta` non crea appuntamento.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => processRequest(row.id, "approve")}>Conferma richiesta</Button>
                  <Button variant="outline" onClick={() => processRequest(row.id, "reject")}>Rifiuta richiesta</Button>
                  <Button variant="outline" onClick={() => void openEditor(row, "service")}>Modifica servizio</Button>
                  <Button variant="outline" onClick={() => void openEditor(row, "time")}>Modifica orario</Button>
                </div>
              </div>
            ) : null}
            {row.status !== "PENDING" ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void deleteProcessedRequest(row.id)}>
                  Elimina messaggio
                </Button>
              </div>
            ) : null}
            {isEditing ? (
              <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-sm font-semibold">Modifica richiesta prima della conferma</p>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <select
                    className="h-10 rounded-md border border-zinc-300 px-3 text-sm"
                    value={editTreatmentId}
                    onChange={(e) => setEditTreatmentId(e.target.value)}
                  >
                    {treatments.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    onClick={() => void loadOptions(row.id, editTreatmentId)}
                    disabled={editLoading}
                  >
                    {editLoading ? "Carico..." : "Carica opzioni orario"}
                  </Button>
                </div>
                {editDuration ? <p className="text-xs text-zinc-600">Nuova durata stimata: {editDuration} minuti</p> : null}
                {editSlots.length > 0 ? (
                  <div className="max-h-64 space-y-2 overflow-auto">
                    {editSlots.map((s) => {
                      const key = `${s.startAt}|${s.operatorId || ""}`;
                      const d = new Date(s.startAt);
                      return (
                        <label key={key} className="flex cursor-pointer items-start gap-2 rounded-md border border-zinc-200 bg-white p-2 text-sm">
                          <input
                            className="mt-1"
                            type="radio"
                            name={`edit-slot-${row.id}`}
                            checked={editSelectedSlotKey === key}
                            onChange={() => setEditSelectedSlotKey(key)}
                          />
                          <span>
                            {d.toLocaleString("it-IT", { weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            <span className="block text-xs text-zinc-500">
                              {s.operatorName ? `Operatore: ${s.operatorName}` : "Operatore assegnato in conferma"}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={saveEdit} disabled={savingEdit || !editSelectedSlotKey}>
                    {savingEdit ? "Salvo..." : "Salva modifica"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingId(null);
                      setEditSlots([]);
                      setEditSelectedSlotKey("");
                    }}
                  >
                    Annulla
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
