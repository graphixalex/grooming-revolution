"use client";

import { useMemo, useState } from "react";
import { COUNTRY_OPTIONS, getCountryMeta } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Branch = {
  id: string;
  nomeAttivita: string;
  nomeSede: string | null;
  indirizzo: string | null;
  paese: string;
  valuta: string;
  timezone: string;
};

export function BranchesClient({ initial, canCreate, currentSalonId }: { initial: Branch[]; canCreate: boolean; currentSalonId: string }) {
  const [rows, setRows] = useState(initial);
  const [nomeSede, setNomeSede] = useState("");
  const [indirizzo, setIndirizzo] = useState("");
  const [paese, setPaese] = useState("IT");
  const [timezone, setTimezone] = useState(getCountryMeta("IT").defaultTimezone);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNomeSede, setEditNomeSede] = useState("");
  const [editIndirizzo, setEditIndirizzo] = useState("");
  const [editPaese, setEditPaese] = useState("IT");
  const [editTimezone, setEditTimezone] = useState(getCountryMeta("IT").defaultTimezone);

  const valuta = useMemo(() => getCountryMeta(paese).currency, [paese]);
  const editValuta = useMemo(() => getCountryMeta(editPaese).currency, [editPaese]);

  async function reload() {
    const res = await fetch("/api/branches");
    const data = await res.json();
    if (res.ok) setRows(data);
  }

  async function createBranch() {
    const res = await fetch("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nomeSede, indirizzo, paese, timezone }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Errore creazione sede");
      return;
    }
    setNomeSede("");
    setIndirizzo("");
    await reload();
  }

  async function saveBranch(id: string) {
    const res = await fetch("/api/branches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, nomeSede: editNomeSede, indirizzo: editIndirizzo, paese: editPaese, timezone: editTimezone }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Errore aggiornamento sede");
      return;
    }
    setEditingId(null);
    await reload();
  }

  async function deleteBranch(id: string, sedeLabel: string) {
    const first = confirm(
      `Stai per eliminare la sede "${sedeLabel}". Questa azione elimina agenda, incassi e tutti i dati collegati. Continuare?`,
    );
    if (!first) return;
    const second = prompt('Seconda conferma: scrivi ELIMINA per confermare definitivamente');
    if (second !== "ELIMINA") {
      alert("Conferma non valida. Cancellazione annullata.");
      return;
    }

    const res = await fetch("/api/branches", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, confirmDelete: true, confirmWord: "ELIMINA" }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Errore cancellazione sede");
      return;
    }
    await reload();
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <h2 className="font-semibold">Sedi del gruppo</h2>
        <p className="text-sm text-zinc-600">Totale sedi: {rows.length}</p>
      </Card>

      {canCreate ? (
        <Card className="space-y-2">
          <h2 className="font-semibold">Nuova sede</h2>
          <div className="grid gap-2 md:grid-cols-2">
            <Input placeholder="Nome sede" value={nomeSede} onChange={(e) => setNomeSede(e.target.value)} />
            <Input placeholder="Indirizzo sede" value={indirizzo} onChange={(e) => setIndirizzo(e.target.value)} />
            <select
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm"
              value={paese}
              onChange={(e) => {
                const next = e.target.value;
                setPaese(next);
                setTimezone(getCountryMeta(next).defaultTimezone);
              }}
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            <Input value={valuta} readOnly placeholder="Valuta" />
            <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Timezone" />
          </div>
          <Button onClick={createBranch}>Crea sede</Button>
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-2 font-semibold">Elenco sedi</h2>
        <div className="space-y-2 text-sm">
          {rows.map((r) => (
            <div key={r.id} className="rounded border border-zinc-200 p-3">
              {editingId === r.id ? (
                <div className="space-y-2">
                  <Input value={editNomeSede} onChange={(e) => setEditNomeSede(e.target.value)} placeholder="Nome sede" />
                  <Input value={editIndirizzo} onChange={(e) => setEditIndirizzo(e.target.value)} placeholder="Indirizzo sede" />
                  <div className="grid gap-2 md:grid-cols-3">
                    <select
                      className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm"
                      value={editPaese}
                      onChange={(e) => {
                        const next = e.target.value;
                        setEditPaese(next);
                        setEditTimezone(getCountryMeta(next).defaultTimezone);
                      }}
                    >
                      {COUNTRY_OPTIONS.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <Input value={editValuta} readOnly />
                    <Input value={editTimezone} onChange={(e) => setEditTimezone(e.target.value)} placeholder="Timezone" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => saveBranch(r.id)}>Salva</Button>
                    <Button variant="outline" onClick={() => setEditingId(null)}>
                      Annulla
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="font-medium">{r.nomeSede || "Sede principale"}</p>
                  <p>{r.paese} | {r.valuta} | {r.timezone}</p>
                  <p>{r.indirizzo || "-"}</p>
                  {canCreate ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingId(r.id);
                          setEditNomeSede(r.nomeSede || "");
                          setEditIndirizzo(r.indirizzo || "");
                          setEditPaese(r.paese || "IT");
                          setEditTimezone(r.timezone || getCountryMeta(r.paese || "IT").defaultTimezone);
                        }}
                      >
                        Modifica sede
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => deleteBranch(r.id, r.nomeSede || "Sede principale")}
                        disabled={r.id === currentSalonId}
                      >
                        Elimina sede
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
