"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type MattingTemplate = {
  id: string;
  title: string;
  legalText: string;
  version: number;
};

type MattingHistoryRow = {
  id: string;
  ownerFullName: string;
  petName: string;
  consentDematting: boolean;
  consentUnderMatsShave: boolean;
  formDate: string;
  additionalNotes?: string | null;
  acknowledgedRisk: boolean;
  signerFullName: string;
  signerDocumentId?: string | null;
  templateVersion: number;
  signedAt: string;
  revokedAt?: string | null;
  revokedReason?: string | null;
};

type MattingApiResponse = {
  enabled: boolean;
  template: MattingTemplate | null;
  history: MattingHistoryRow[];
  active: MattingHistoryRow | null;
};

function toInputDate(value: Date) {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function ClientMattingConsentCard({ clientId }: { clientId: string }) {
  const [data, setData] = useState<MattingApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [ownerFullName, setOwnerFullName] = useState("");
  const [petName, setPetName] = useState("");
  const [formDate, setFormDate] = useState(toInputDate(new Date()));
  const [consentDematting, setConsentDematting] = useState(false);
  const [consentUnderMatsShave, setConsentUnderMatsShave] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [acknowledgedRisk, setAcknowledgedRisk] = useState(false);
  const [signerFullName, setSignerFullName] = useState("");
  const [signerDocumentId, setSignerDocumentId] = useState("");

  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const hasSignatureRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/matting-consent`);
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Errore caricamento modulo nodi");
        return;
      }
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = useCallback(() => {
    setOwnerFullName("");
    setPetName("");
    setFormDate(toInputDate(new Date()));
    setConsentDematting(false);
    setConsentUnderMatsShave(false);
    setAdditionalNotes("");
    setAcknowledgedRisk(false);
    setSignerFullName("");
    setSignerDocumentId("");
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    hasSignatureRef.current = false;
  }, []);

  const setupCanvas = useCallback(() => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.clearRect(0, 0, rect.width, rect.height);
    hasSignatureRef.current = false;
  }, []);

  useEffect(() => {
    if (!showModal) return;
    setupCanvas();
  }, [showModal, setupCanvas]);

  function getPoint(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const point = getPoint(event);
    if (!ctx || !point) return;
    isDrawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function onPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const point = getPoint(event);
    if (!ctx || !point) return;
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    hasSignatureRef.current = true;
  }

  function onPointerUp(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    isDrawingRef.current = false;
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      // No-op
    }
  }

  async function saveConsent() {
    if (!data?.enabled) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;

    if (!ownerFullName.trim() || !petName.trim() || !formDate) {
      alert("Compila proprietario, nome cane e data");
      return;
    }
    if (!signerFullName.trim()) {
      alert("Inserisci nome e cognome del firmatario");
      return;
    }
    if (!acknowledgedRisk) {
      alert("Devi confermare la presa visione delle clausole di rischio");
      return;
    }
    if (!hasSignatureRef.current) {
      alert("Inserisci la firma nel riquadro");
      return;
    }

    setSaving(true);
    try {
      const signatureDataUrl = canvas.toDataURL("image/png");
      const dateIso = new Date(`${formDate}T00:00:00.000Z`).toISOString();
      const res = await fetch(`/api/clients/${clientId}/matting-consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerFullName: ownerFullName.trim(),
          petName: petName.trim(),
          formDate: dateIso,
          consentDematting,
          consentUnderMatsShave,
          additionalNotes: additionalNotes.trim(),
          acknowledgedRisk,
          signerFullName: signerFullName.trim(),
          signerDocumentId: signerDocumentId.trim(),
          signatureDataUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Errore salvataggio modulo nodi");
        return;
      }
      setShowModal(false);
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function revoke(recordId: string) {
    const reason = prompt("Motivo revoca (opzionale):") || "";
    const res = await fetch(`/api/clients/${clientId}/matting-consent/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordId, reason }),
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error || "Errore revoca modulo nodi");
      return;
    }
    await load();
  }

  if (loading) {
    return (
      <Card>
        <h2 className="text-lg font-semibold">Consenso in caso di nodi</h2>
        <p className="mt-2 text-sm text-zinc-600">Caricamento modulo nodi...</p>
      </Card>
    );
  }

  if (!data?.enabled) return null;

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Consenso in caso di nodi</h2>
        <Button
          onClick={() => {
            setShowModal(true);
            resetForm();
          }}
        >
          Raccogli firma (tablet)
        </Button>
      </div>

      {data.active ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <p>
            Modulo attivo firmato il {new Date(data.active.signedAt).toLocaleString("it-IT")} da {data.active.signerFullName}
          </p>
          <p className="mt-1 text-xs">
            Snodatura: {data.active.consentDematting ? "Si" : "No"} - Tosatura sotto nodi: {data.active.consentUnderMatsShave ? "Si" : "No"}
          </p>
          <div className="mt-2">
            <Button size="sm" variant="outline" onClick={() => revoke(data.active!.id)}>
              Revoca modulo attivo
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-zinc-600">Nessun modulo nodi attivo per questo cliente.</p>
      )}

      <div className="space-y-2">
        <h3 className="font-medium">Storico moduli firmati</h3>
        <div className="max-h-56 overflow-auto rounded-xl border border-zinc-200">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs text-zinc-600">
              <tr>
                <th className="px-3 py-2">Firmatario</th>
                <th className="px-3 py-2">Animale</th>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Stato</th>
              </tr>
            </thead>
            <tbody>
              {data.history.map((row) => (
                <tr key={row.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2">{row.signerFullName}</td>
                  <td className="px-3 py-2">{row.petName}</td>
                  <td className="px-3 py-2">{new Date(row.signedAt).toLocaleString("it-IT")}</td>
                  <td className="px-3 py-2">{row.revokedAt ? "Revocato" : "Attivo"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-0 md:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowModal(false);
          }}
        >
          <Card className="mx-auto flex h-full w-full max-w-none flex-col space-y-4 rounded-none p-4 md:h-[calc(100vh-2rem)] md:rounded-2xl md:p-6">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-xl font-semibold">Firma consenso in caso di nodi</h3>
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Chiudi
              </Button>
            </div>

            {data.template ? (
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="font-medium">
                  {data.template.title} (v{data.template.version})
                </p>
                <Textarea className="mt-2 min-h-64 text-sm leading-relaxed" value={data.template.legalText} readOnly />
              </div>
            ) : null}

            <div className="grid gap-2 md:grid-cols-2 overflow-y-auto pr-1">
              <Input placeholder="Nome e cognome proprietario" value={ownerFullName} onChange={(event) => setOwnerFullName(event.target.value)} />
              <Input placeholder="Nome cane" value={petName} onChange={(event) => setPetName(event.target.value)} />
              <Input type="date" value={formDate} onChange={(event) => setFormDate(event.target.value)} />
              <Input placeholder="Documento firmatario (opzionale)" value={signerDocumentId} onChange={(event) => setSignerDocumentId(event.target.value)} />
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={consentDematting} onChange={(event) => setConsentDematting(event.target.checked)} className="mt-1" />
              Il cane presenta nodi/feltri: acconsento alla snodatura.
            </label>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={consentUnderMatsShave}
                onChange={(event) => setConsentUnderMatsShave(event.target.checked)}
                className="mt-1"
              />
              Il cane e pieno di nodi/feltri: acconsento alla tosatura sotto i nodi (corta).
            </label>

            <Textarea
              placeholder="Note aggiuntive"
              value={additionalNotes}
              onChange={(event) => setAdditionalNotes(event.target.value)}
            />

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={acknowledgedRisk}
                onChange={(event) => setAcknowledgedRisk(event.target.checked)}
                className="mt-1"
              />
              Confermo di aver letto il modulo e di accettare le clausole sui rischi e sulla gestione del servizio.
            </label>

            <Input placeholder="Nome e cognome firmatario" value={signerFullName} onChange={(event) => setSignerFullName(event.target.value)} />

            <div className="rounded-xl border border-zinc-200 p-3">
              <p className="mb-2 text-sm font-medium">Firma</p>
              <canvas
                ref={signatureCanvasRef}
                className="h-56 w-full touch-none rounded-lg border border-zinc-300 bg-white"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
              />
              <div className="mt-2 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    const canvas = signatureCanvasRef.current;
                    if (!canvas) return;
                    const ctx = canvas.getContext("2d");
                    if (!ctx) return;
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    hasSignatureRef.current = false;
                  }}
                >
                  Pulisci firma
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Annulla
              </Button>
              <Button onClick={saveConsent} disabled={saving}>
                {saving ? "Salvataggio..." : "Conferma e salva modulo"}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </Card>
  );
}
