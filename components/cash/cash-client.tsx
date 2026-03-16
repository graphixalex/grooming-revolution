"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type CashSessionRow = {
  id: string;
  status: "OPEN" | "CLOSED";
  openingFloat: number | string;
  closingExpected: number | string | null;
  closingCounted: number | string | null;
  difference: number | string | null;
  noteApertura: string | null;
  noteChiusura: string | null;
  openedAt: string;
  closedAt: string | null;
  openedBy: { email: string };
  closedBy: { email: string } | null;
  transactions: Array<{ id: string; grossAmount: number | string }>;
};

export function CashClient({ initial, canManage }: { initial: CashSessionRow[]; canManage: boolean }) {
  const [rows, setRows] = useState(initial);
  const [openingFloat, setOpeningFloat] = useState("0");
  const [openNote, setOpenNote] = useState("");
  const [closingCounted, setClosingCounted] = useState("");
  const [closeNote, setCloseNote] = useState("");

  const openSession = rows.find((r) => r.status === "OPEN") || null;

  async function reload() {
    const res = await fetch("/api/cash-sessions");
    const data = await res.json();
    if (res.ok) setRows(data);
  }

  async function openCash() {
    const amount = Number(openingFloat);
    if (!Number.isFinite(amount) || amount < 0) {
      alert("Fondo cassa non valido");
      return;
    }
    const res = await fetch("/api/cash-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openingFloat: amount, noteApertura: openNote || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Errore apertura cassa");
      return;
    }
    setOpeningFloat("0");
    setOpenNote("");
    await reload();
  }

  async function closeCash() {
    if (!openSession) return;
    const counted = Number(closingCounted);
    if (!Number.isFinite(counted) || counted < 0) {
      alert("Importo contato non valido");
      return;
    }
    const res = await fetch("/api/cash-sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cashSessionId: openSession.id, closingCounted: counted, noteChiusura: closeNote || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Errore chiusura cassa");
      return;
    }
    setClosingCounted("");
    setCloseNote("");
    await reload();
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <h2 className="font-semibold">Stato cassa</h2>
        <p className="text-sm">Cassa attuale: {openSession ? "Aperta" : "Chiusa"}</p>
      </Card>

      {openSession ? (
        <Card className="space-y-2">
          <h2 className="font-semibold">Chiudi cassa</h2>
          <p className="text-sm">Aperta il {format(new Date(openSession.openedAt), "dd/MM/yyyy HH:mm")} da {openSession.openedBy.email}</p>
          <Input type="number" min="0" step="0.01" placeholder="Contante contato a fine turno" value={closingCounted} onChange={(e) => setClosingCounted(e.target.value)} disabled={!canManage} />
          <Textarea placeholder="Nota chiusura (opzionale)" value={closeNote} onChange={(e) => setCloseNote(e.target.value)} disabled={!canManage} />
          <Button onClick={closeCash} disabled={!canManage}>Chiudi cassa</Button>
        </Card>
      ) : (
        <Card className="space-y-2">
          <h2 className="font-semibold">Apri cassa</h2>
          <Input type="number" min="0" step="0.01" placeholder="Fondo cassa iniziale" value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} disabled={!canManage} />
          <Textarea placeholder="Nota apertura (opzionale)" value={openNote} onChange={(e) => setOpenNote(e.target.value)} disabled={!canManage} />
          <Button onClick={openCash} disabled={!canManage}>Apri cassa</Button>
        </Card>
      )}

      <Card>
        <h2 className="mb-2 font-semibold">Storico casse</h2>
        <div className="space-y-2 text-sm">
          {rows.map((r) => (
            <div key={r.id} className="rounded border border-zinc-200 p-3">
              <p className="font-medium">
                {r.status} | Apertura EUR {Number(r.openingFloat).toFixed(2)} | Movimenti cash: {r.transactions.length}
              </p>
              <p>Aperta: {format(new Date(r.openedAt), "dd/MM/yyyy HH:mm")} da {r.openedBy.email}</p>
              <p>Chiusa: {r.closedAt ? `${format(new Date(r.closedAt), "dd/MM/yyyy HH:mm")} da ${r.closedBy?.email ?? "-"}` : "-"}</p>
              {r.status === "CLOSED" ? (
                <p>
                  Atteso: EUR {Number(r.closingExpected || 0).toFixed(2)} | Contato: EUR {Number(r.closingCounted || 0).toFixed(2)} | Differenza: EUR {Number(r.difference || 0).toFixed(2)}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
