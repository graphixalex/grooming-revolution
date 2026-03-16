"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ClientDetailClient({
  client,
  quickTags,
}: {
  client: any;
  quickTags: Array<{ id: string; nome: string }>;
}) {
  const [dogForm, setDogForm] = useState({ nome: "", razza: "", taglia: "M", noteCane: "", tagRapidiIds: [] as string[] });

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
              <Link href={`/dogs/${dog.id}`} className="text-sm underline">Apri profilo cane</Link>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

