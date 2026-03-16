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

export function ClientsClient() {
  const [q, setQ] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState({ nome: "", cognome: "", telefono: "", email: "", noteCliente: "", consensoPromemoria: false });
  const [importFile, setImportFile] = useState<File | null>(null);

  async function load(search = "") {
    const res = await fetch(`/api/clients?q=${encodeURIComponent(search)}`);
    const data = await res.json();
    setClients(data);
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
    setForm({ nome: "", cognome: "", telefono: "", email: "", noteCliente: "", consensoPromemoria: false });
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

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="font-semibold">Nuovo cliente</h2>
        <div className="grid gap-2 md:grid-cols-2">
          <Input placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <Input placeholder="Cognome" value={form.cognome} onChange={(e) => setForm({ ...form, cognome: e.target.value })} />
          <Input placeholder="Telefono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <Textarea placeholder="Note cliente" value={form.noteCliente} onChange={(e) => setForm({ ...form, noteCliente: e.target.value })} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.consensoPromemoria} onChange={(e) => setForm({ ...form, consensoPromemoria: e.target.checked })} />
          Consenso promemoria
        </label>
        <Button onClick={submit}>Salva cliente</Button>
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
        <div className="space-y-2">
          {clients.map((client) => (
            <div key={client.id} className="rounded-md border border-zinc-200 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{client.nome} {client.cognome}</p>
                  <p className="text-sm text-zinc-600">{client.telefono} {client.email ? `- ${client.email}` : ""}</p>
                  <p className="text-sm text-zinc-600">Cani: {client.dogs.map((d) => d.nome).join(", ") || "Nessuno"}</p>
                </div>
                <Link className="text-sm underline" href={`/clients/${client.id}`}>Apri scheda</Link>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

