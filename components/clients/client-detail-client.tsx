"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ClientConsentsCard } from "@/components/clients/client-consents-card";

export function ClientDetailClient({
  client,
  quickTags,
  paymentHistory,
}: {
  client: any;
  quickTags: Array<{ id: string; nome: string }>;
  paymentHistory: any[];
}) {
  const [dogForm, setDogForm] = useState({
    nome: "",
    razza: "",
    taglia: "M",
    noteCane: "",
    preferenzeCura: "",
    tagRapidiIds: [] as string[],
  });

  async function addDog() {
    const res = await fetch("/api/dogs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...dogForm, clienteId: client.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Errore creazione cane");
      return;
    }
    location.reload();
  }

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="text-2xl font-semibold">{client.nome} {client.cognome}</h1>
        <p className="text-sm text-zinc-600">{client.telefono} {client.email ? `- ${client.email}` : ""}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm">{client.noteCliente || "Nessuna nota cliente"}</p>
      </Card>

      <Card className="space-y-2">
        <h2 className="font-semibold">Aggiungi cane</h2>
        <div className="grid gap-2 md:grid-cols-2">
          <Input placeholder="Nome" value={dogForm.nome} onChange={(e) => setDogForm({ ...dogForm, nome: e.target.value })} />
          <Input placeholder="Razza" value={dogForm.razza} onChange={(e) => setDogForm({ ...dogForm, razza: e.target.value })} />
          <select className="h-10 rounded-md border border-zinc-300 px-3 text-sm" value={dogForm.taglia} onChange={(e) => setDogForm({ ...dogForm, taglia: e.target.value })}>
            <option value="XS">XS</option><option value="S">S</option><option value="M">M</option><option value="L">L</option><option value="XL">XL</option><option value="XXL">XXL</option>
          </select>
        </div>
        <Textarea placeholder="Note cane" value={dogForm.noteCane} onChange={(e) => setDogForm({ ...dogForm, noteCane: e.target.value })} />
        <Textarea
          placeholder="Preferenze cane (es. taglio preferito, profumo, comportamento, sensibilita...)"
          value={dogForm.preferenzeCura}
          onChange={(e) => setDogForm({ ...dogForm, preferenzeCura: e.target.value })}
        />
        <div className="flex flex-wrap gap-2">
          {quickTags.map((tag) => (
            <label key={tag.id} className="rounded-full border border-zinc-300 px-3 py-1 text-xs">
              <input
                type="checkbox"
                className="mr-1"
                onChange={(e) => {
                  setDogForm((prev) => ({
                    ...prev,
                    tagRapidiIds: e.target.checked ? [...prev.tagRapidiIds, tag.id] : prev.tagRapidiIds.filter((id) => id !== tag.id),
                  }));
                }}
              />
              {tag.nome}
            </label>
          ))}
        </div>
        <Button onClick={addDog}>Salva cane</Button>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Cani</h2>
        <div className="space-y-2">
          {client.dogs.map((dog: any) => (
            <div key={dog.id} className="rounded border border-zinc-200 p-3">
              <p className="font-medium">{dog.nome} {dog.razza ? `(${dog.razza})` : ""}</p>
              <p className="text-sm text-zinc-600">{dog.noteCane || "Nessuna nota"}</p>
              <p className="mt-1 text-sm text-zinc-700">
                <span className="font-medium">Preferenze:</span> {dog.preferenzeCura || "Nessuna preferenza salvata"}
              </p>
              <Link href={`/dogs/${dog.id}`} className="text-sm underline">Apri profilo cane</Link>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Storico pagamenti cliente</h2>
        {paymentHistory.length ? (
          <div className="space-y-2">
            {paymentHistory.map((row: any) => {
              const totaleIncassato = row.transactions.reduce((sum: number, tx: any) => sum + Number(tx.grossAmount || 0), 0);
              const metodi = Array.from(new Set(row.transactions.map((tx: any) => tx.method))).join(", ");
              return (
                <div key={row.id} className="rounded border border-zinc-200 p-3 text-sm">
                  <p className="font-medium">
                    {format(new Date(row.startAt), "dd/MM/yyyy HH:mm")} - {row.cane?.nome || "Cane"}
                  </p>
                  <p>Totale pagato: EUR {totaleIncassato.toFixed(2)}{metodi ? ` (${metodi})` : ""}</p>
                  <p>Servizi: {row.trattamentiSelezionati.map((t: any) => t.treatment.nome).join(", ") || "-"}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-zinc-600">Nessun pagamento registrato.</p>
        )}
      </Card>

      <ClientConsentsCard clientId={client.id} />
    </div>
  );
}

