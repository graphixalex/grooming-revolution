"use client";

import { useEffect, useState } from "react";
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
  treatment: { nome: string };
  proposedOperator?: { nome: string } | null;
};

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
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/booking-requests");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      alert(data.error || "Errore caricamento messaggi");
      return;
    }
    setRows(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    void load();
  }, []);

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
    await load();
  }

  if (loading) return <p className="text-sm text-zinc-600">Caricamento richieste...</p>;

  return (
    <div className="space-y-3">
      {rows.length === 0 ? <Card>Nessuna richiesta booking online.</Card> : null}
      {rows.map((row) => {
        const start = new Date(row.requestedStartAt);
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
            <p className="text-sm">
              Servizio: {row.treatment.nome} - {row.estimatedDurationMin} min
            </p>
            <p className="text-sm">
              Richiesta per: {start.toLocaleString("it-IT", { weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              {row.proposedOperator?.nome ? ` - Operatore: ${row.proposedOperator.nome}` : ""}
            </p>
            <p className="text-sm text-zinc-600">Note: {row.note || "-"}</p>
            {row.status === "PENDING" ? (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => processRequest(row.id, "approve")}>Conferma richiesta</Button>
                <Button variant="outline" onClick={() => processRequest(row.id, "reject")}>Rifiuta richiesta</Button>
              </div>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}

