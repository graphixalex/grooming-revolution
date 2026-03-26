"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Client = {
  id: string;
  nome: string;
  cognome: string;
  telefono: string;
  email?: string | null;
  noteCliente?: string | null;
  dogs: Array<{ id: string; nome: string; razza?: string | null }>;
};

type NewDogForm = {
  nome: string;
  razza: string;
  taglia: "XS" | "S" | "M" | "L" | "XL" | "XXL";
  noteCane: string;
};

export function ClientsClient() {
  const [q, setQ] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [form, setForm] = useState({ nome: "", cognome: "", telefono: "", email: "", noteCliente: "", consensoPromemoria: false });
  const [dogsForm, setDogsForm] = useState<NewDogForm[]>([{ nome: "", razza: "", taglia: "M", noteCane: "" }]);
  const [importFile, setImportFile] = useState<File | null>(null);

  async function load(search = "") {
    const res = await fetch(`/api/clients?q=${encodeURIComponent(search)}`);
    const data = await res.json();
    setClients(data);
    setSelectedIds([]);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit() {
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Errore creazione cliente");
      return;
    }

    const validDogs = dogsForm.filter((d) => d.nome.trim());
    if (validDogs.length) {
      const dogResults = await Promise.all(
        validDogs.map(async (dog) => {
          const dogRes = await fetch("/api/dogs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clienteId: data.id,
              nome: dog.nome.trim(),
              razza: dog.razza.trim(),
              taglia: dog.taglia,
              noteCane: dog.noteCane.trim(),
              tagRapidiIds: [],
            }),
          });
          const dogData = await dogRes.json();
          return { ok: dogRes.ok, error: dogData?.error as string | undefined };
        }),
      );

      const failed = dogResults.filter((r) => !r.ok);
      if (failed.length) {
        alert("Cliente creato, ma alcuni cani non sono stati salvati. Controlla i dati cane.");
      }
    }

    setForm({ nome: "", cognome: "", telefono: "", email: "", noteCliente: "", consensoPromemoria: false });
    setDogsForm([{ nome: "", razza: "", taglia: "M", noteCane: "" }]);
    load(q);
  }

  async function importContactsFile() {
    if (!importFile) {
      alert("Seleziona un file CSV o VCF");
      return;
    }
    const formData = new FormData();
    formData.append("file", importFile);
    const res = await fetch("/api/clients/import", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Import non riuscito");
      return;
    }
    alert(`Import completato. Creati: ${data.created}, Scartati: ${data.skipped}`);
    load(q);
  }

  function toggleClientSelection(clientId: string) {
    setSelectedIds((prev) => (prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]));
  }

  function toggleSelectAllVisible(checked: boolean) {
    if (checked) {
      setSelectedIds(clients.map((c) => c.id));
      return;
    }
    setSelectedIds([]);
  }

  async function deleteSelectedClients() {
    if (!selectedIds.length) {
      alert("Seleziona almeno un contatto");
      return;
    }

    const isAllVisibleSelected = clients.length > 0 && selectedIds.length === clients.length;
    if (isAllVisibleSelected) {
      if (!window.confirm("Sei sicuro di voler eliminare tutti i contatti?")) return;
      if (!window.confirm("Sicuro di procedere realmente all'eliminazione?")) return;
      if (!window.confirm("Eliminare tutti i contatti?")) return;
    } else {
      if (!window.confirm(`Eliminare ${selectedIds.length} contatti selezionati?`)) return;
    }

    const res = await fetch("/api/clients", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Errore eliminazione contatti");
      return;
    }
    alert(`Contatti eliminati: ${data.deleted}`);
    load(q);
  }

  async function deleteSingleClient(clientId: string, fullName: string) {
    if (!window.confirm(`Eliminare il contatto ${fullName}?`)) return;
    const res = await fetch("/api/clients", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [clientId] }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Errore eliminazione contatto");
      return;
    }
    load(q);
  }

  const allVisibleSelected = clients.length > 0 && selectedIds.length === clients.length;

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="font-semibold">Nuovo cliente</h2>
        <p className="text-sm text-zinc-600">Compila i dati cliente e aggiungi subito uno o più cani.</p>
        <div className="grid gap-2 md:grid-cols-2">
          <Input placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <Input placeholder="Cognome" value={form.cognome} onChange={(e) => setForm({ ...form, cognome: e.target.value })} />
          <Input placeholder="Telefono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <Textarea placeholder="Note cliente" value={form.noteCliente} onChange={(e) => setForm({ ...form, noteCliente: e.target.value })} />

        <div className="space-y-2 rounded-md border border-zinc-200 p-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Cani del cliente</h3>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDogsForm((prev) => [...prev, { nome: "", razza: "", taglia: "M", noteCane: "" }])}
            >
              Aggiungi cane
            </Button>
          </div>
          {dogsForm.map((dog, index) => (
            <div key={index} className="space-y-2 rounded-md border border-zinc-200 p-3">
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  placeholder="Nome cane"
                  value={dog.nome}
                  onChange={(e) =>
                    setDogsForm((prev) => prev.map((d, i) => (i === index ? { ...d, nome: e.target.value } : d)))
                  }
                />
                <Input
                  placeholder="Razza"
                  value={dog.razza}
                  onChange={(e) =>
                    setDogsForm((prev) => prev.map((d, i) => (i === index ? { ...d, razza: e.target.value } : d)))
                  }
                />
                <select
                  className="h-10 rounded-md border border-zinc-300 px-3 text-sm"
                  value={dog.taglia}
                  onChange={(e) =>
                    setDogsForm((prev) =>
                      prev.map((d, i) => (i === index ? { ...d, taglia: e.target.value as NewDogForm["taglia"] } : d)),
                    )
                  }
                >
                  <option value="XS">Taglia XS</option>
                  <option value="S">Taglia S</option>
                  <option value="M">Taglia M</option>
                  <option value="L">Taglia L</option>
                  <option value="XL">Taglia XL</option>
                  <option value="XXL">Taglia XXL</option>
                </select>
                {dogsForm.length > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDogsForm((prev) => prev.filter((_, i) => i !== index))}
                  >
                    Rimuovi cane
                  </Button>
                ) : (
                  <div />
                )}
              </div>
              <Textarea
                placeholder="Note cane"
                value={dog.noteCane}
                onChange={(e) =>
                  setDogsForm((prev) => prev.map((d, i) => (i === index ? { ...d, noteCane: e.target.value } : d)))
                }
              />
            </div>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.consensoPromemoria} onChange={(e) => setForm({ ...form, consensoPromemoria: e.target.checked })} />
          Consenso promemoria
        </label>
        <Button onClick={submit}>Salva cliente e cani</Button>
      </Card>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Cerca nome/cognome/telefono/email" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-lg" />
          <Button variant="outline" onClick={() => load(q)}>Cerca</Button>
          <a href="/api/clients/export"><Button variant="outline">Scarica contatti</Button></a>
          <a href="/api/clients/import-template"><Button variant="outline">Template CSV</Button></a>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="file" accept=".csv,text/csv,.vcf,text/vcard" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} className="max-w-sm" />
          <Button onClick={importContactsFile}>Importa clienti (CSV/VCF)</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-zinc-200 p-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={(e) => toggleSelectAllVisible(e.target.checked)}
            />
            Seleziona tutti i contatti visibili
          </label>
          <span className="text-zinc-600">Selezionati: {selectedIds.length}</span>
          <Button variant="outline" onClick={deleteSelectedClients} disabled={!selectedIds.length}>
            Elimina selezionati
          </Button>
        </div>
        <div className="space-y-2">
          {clients.map((client) => (
            <div key={client.id} className="rounded-md border border-zinc-200 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selectedIds.includes(client.id)}
                    onChange={() => toggleClientSelection(client.id)}
                  />
                  <div>
                    <p className="font-medium">{client.nome} {client.cognome}</p>
                    <p className="text-sm text-zinc-600">{client.telefono} {client.email ? `- ${client.email}` : ""}</p>
                    <p className="text-sm text-zinc-600">Cani: {client.dogs.map((d) => d.nome).join(", ") || "Nessuno"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    className="text-sm text-red-700 underline"
                    onClick={() => deleteSingleClient(client.id, `${client.nome} ${client.cognome}`)}
                  >
                    Elimina
                  </button>
                  <Link className="text-sm underline" href={`/clients/${client.id}`}>Apri scheda</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}


