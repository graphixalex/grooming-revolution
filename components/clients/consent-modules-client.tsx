"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientConsentsCard } from "@/components/clients/client-consents-card";
import { ClientAnamnesisCard } from "@/components/clients/client-anamnesis-card";
import { ClientMattingConsentCard } from "@/components/clients/client-matting-consent-card";

type ClientRow = {
  id: string;
  nome: string;
  cognome: string;
  telefono: string;
  email?: string | null;
  dogs: Array<{ nome: string }>;
};

type ModuleDocument = {
  id: string;
  moduleType: "PRIVACY" | "ANAMNESI" | "NODI";
  ownerName: string;
  signerName: string;
  signedAt: string;
  status: "ATTIVO" | "REVOCATO";
  title: string;
};

type ApiResponse = {
  clients: ClientRow[];
  selectedClient: ClientRow | null;
  documents: ModuleDocument[];
};

const moduleTypeLabel: Record<ModuleDocument["moduleType"], string> = {
  PRIVACY: "Privacy",
  ANAMNESI: "Anamnesi prima volta",
  NODI: "In caso di nodi",
};

export function ConsentModulesClient() {
  const [activeTab, setActiveTab] = useState<"privacy" | "anamnesi" | "nodi" | "archivio">("privacy");
  const [q, setQ] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApiResponse>({ clients: [], selectedClient: null, documents: [] });

  const load = useCallback(async (search = q, clientId = selectedClientId) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (clientId) params.set("clientId", clientId);
      const res = await fetch(`/api/consent-modules?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Errore caricamento moduli");
        return;
      }
      setData(json);
      if (clientId && !json.selectedClient) {
        setSelectedClientId("");
      }
    } finally {
      setLoading(false);
    }
  }, [q, selectedClientId]);

  useEffect(() => {
    void load("", "");
  }, [load]);

  const selectedClient = data.selectedClient;
  const docs = useMemo(() => data.documents || [], [data.documents]);

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="font-semibold">Ricerca proprietario</h2>
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-lg"
            placeholder="Cerca nome, cognome, telefono o email"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
          <Button variant="outline" onClick={() => load(q, selectedClientId)}>
            Cerca
          </Button>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {data.clients.map((client) => {
            const active = selectedClientId === client.id;
            return (
              <button
                key={client.id}
                type="button"
                className={`rounded-xl border p-3 text-left transition ${
                  active ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white hover:bg-zinc-50"
                }`}
                onClick={() => {
                  setSelectedClientId(client.id);
                  setActiveTab("privacy");
                  void load(q, client.id);
                }}
              >
                <p className="font-medium">{client.nome} {client.cognome}</p>
                <p className="text-sm text-zinc-600">{client.telefono}{client.email ? ` - ${client.email}` : ""}</p>
                <p className="text-xs text-zinc-500">Cani: {client.dogs.map((d) => d.nome).join(", ") || "Nessuno"}</p>
              </button>
            );
          })}
        </div>
      </Card>

      {loading ? <Card><p className="text-sm text-zinc-600">Caricamento...</p></Card> : null}

      {selectedClient ? (
        <>
          <Card className="space-y-2">
            <h2 className="font-semibold">Cliente selezionato</h2>
            <p className="text-sm text-zinc-700">
              {selectedClient.nome} {selectedClient.cognome} - {selectedClient.telefono}
            </p>
            <p className="text-xs text-zinc-600">Qui gestisci Privacy, Anamnesi e Nodi + archivio PDF moduli.</p>
          </Card>

          <Card className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button variant={activeTab === "privacy" ? "default" : "outline"} onClick={() => setActiveTab("privacy")}>
                Privacy
              </Button>
              <Button variant={activeTab === "anamnesi" ? "default" : "outline"} onClick={() => setActiveTab("anamnesi")}>
                Anamnesi
              </Button>
              <Button variant={activeTab === "nodi" ? "default" : "outline"} onClick={() => setActiveTab("nodi")}>
                Nodi
              </Button>
              <Button variant={activeTab === "archivio" ? "default" : "outline"} onClick={() => setActiveTab("archivio")}>
                Archivio PDF
              </Button>
            </div>
          </Card>

          {activeTab === "privacy" ? <ClientConsentsCard clientId={selectedClient.id} /> : null}
          {activeTab === "anamnesi" ? <ClientAnamnesisCard clientId={selectedClient.id} /> : null}
          {activeTab === "nodi" ? <ClientMattingConsentCard clientId={selectedClient.id} /> : null}

          {activeTab === "archivio" ? (
            <Card className="space-y-2">
              <h2 className="font-semibold">Archivio PDF moduli</h2>
              <p className="text-sm text-zinc-600">Scarica una copia stampabile dei moduli firmati (privacy, anamnesi, nodi).</p>
              <div className="max-h-80 overflow-auto rounded-xl border border-zinc-200">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 text-left text-xs text-zinc-600">
                    <tr>
                      <th className="px-3 py-2">Modulo</th>
                      <th className="px-3 py-2">Proprietario</th>
                      <th className="px-3 py-2">Firmatario</th>
                      <th className="px-3 py-2">Data firma</th>
                      <th className="px-3 py-2">Stato</th>
                      <th className="px-3 py-2">PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.length ? (
                      docs.map((doc) => (
                        <tr key={`${doc.moduleType}-${doc.id}`} className="border-t border-zinc-100">
                          <td className="px-3 py-2">{moduleTypeLabel[doc.moduleType]}</td>
                          <td className="px-3 py-2">{doc.ownerName}</td>
                          <td className="px-3 py-2">{doc.signerName}</td>
                          <td className="px-3 py-2">{new Date(doc.signedAt).toLocaleString("it-IT")}</td>
                          <td className="px-3 py-2">{doc.status}</td>
                          <td className="px-3 py-2">
                            <a
                              className="underline"
                              href={`/api/consent-modules/pdf?type=${doc.moduleType}&id=${encodeURIComponent(doc.id)}`}
                            >
                              Scarica PDF
                            </a>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-3 py-3 text-zinc-600" colSpan={6}>Nessun modulo firmato per questo cliente.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}
        </>
      ) : (
        <Card>
          <p className="text-sm text-zinc-600">Seleziona un proprietario per aprire i moduli.</p>
        </Card>
      )}
    </div>
  );
}
