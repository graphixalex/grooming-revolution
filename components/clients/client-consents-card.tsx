"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ConsentKind = "DATA_PROCESSING" | "PHOTO_INTERNAL" | "PHOTO_SOCIAL";

type ConsentTemplate = {
  id: string;
  kind: ConsentKind;
  title: string;
  legalText: string;
  version: number;
};

type ConsentHistoryRow = {
  id: string;
  kind: ConsentKind;
  granted: boolean;
  signerFullName: string;
  signerDocumentId?: string | null;
  templateVersion: number;
  signedAt: string;
  revokedAt?: string | null;
  revokedReason?: string | null;
  template: { title: string };
};

type ConsentApiResponse = {
  templates: ConsentTemplate[];
  history: ConsentHistoryRow[];
  active: Partial<Record<ConsentKind, ConsentHistoryRow>>;
};

const kindLabel: Record<ConsentKind, string> = {
  DATA_PROCESSING: "Trattamento dati cliente",
  PHOTO_INTERNAL: "Foto/video uso interno",
  PHOTO_SOCIAL: "Pubblicazione social/web",
};

export function ClientConsentsCard({ clientId }: { clientId: string }) {
  const [data, setData] = useState<ConsentApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [signerFullName, setSignerFullName] = useState("");
  const [signerDocumentId, setSignerDocumentId] = useState("");
  const [dataProcessingGranted, setDataProcessingGranted] = useState(false);
  const [photoInternalGranted, setPhotoInternalGranted] = useState(false);
  const [photoSocialGranted, setPhotoSocialGranted] = useState(false);

  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const hasSignatureRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/consents`);
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Errore caricamento consensi");
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

  const templatesByKind = useMemo(() => {
    const out: Partial<Record<ConsentKind, ConsentTemplate>> = {};
    for (const template of data?.templates ?? []) {
      if (!out[template.kind]) out[template.kind] = template;
    }
    return out;
  }, [data]);

  const resetForm = useCallback(() => {
    setSignerFullName("");
    setSignerDocumentId("");
    setDataProcessingGranted(false);
    setPhotoInternalGranted(false);
    setPhotoSocialGranted(false);
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

  async function saveConsents() {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    if (!signerFullName.trim()) {
      alert("Inserisci nome e cognome del firmatario");
      return;
    }
    if (!dataProcessingGranted) {
      alert("Il consenso al trattamento dati e richiesto per completare la firma");
      return;
    }
    if (!hasSignatureRef.current) {
      alert("Inserisci la firma nel riquadro");
      return;
    }

    setSaving(true);
    try {
      const signatureDataUrl = canvas.toDataURL("image/png");
      const res = await fetch(`/api/clients/${clientId}/consents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signerFullName: signerFullName.trim(),
          signerDocumentId: signerDocumentId.trim(),
          signatureDataUrl,
          dataProcessingGranted,
          photoInternalGranted,
          photoSocialGranted,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Errore salvataggio consensi");
        return;
      }
      setShowModal(false);
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function revoke(kind: ConsentKind) {
    const reason = prompt("Motivo revoca (opzionale):") || "";
    const res = await fetch(`/api/clients/${clientId}/consents/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, reason }),
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error || "Errore revoca consenso");
      return;
    }
    await load();
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Consensi privacy e immagini</h2>
        <Button
          onClick={() => {
            setShowModal(true);
            resetForm();
          }}
        >
          Raccogli consenso (tablet)
        </Button>
      </div>

      {loading ? <p className="text-sm text-zinc-600">Caricamento consensi...</p> : null}

      {!loading && data ? (
        <div className="grid gap-2 md:grid-cols-3">
          {(Object.keys(kindLabel) as ConsentKind[]).map((kind) => {
            const active = data.active[kind];
            return (
              <div key={kind} className="rounded-xl border border-zinc-200 p-3">
                <p className="text-sm font-medium">{kindLabel[kind]}</p>
                {active ? (
                  <>
                    <p className="mt-1 text-xs text-emerald-700">Attivo dal {new Date(active.signedAt).toLocaleString("it-IT")}</p>
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => revoke(kind)}>
                      Revoca
                    </Button>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-zinc-600">Non attivo</p>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {!loading && data ? (
        <div className="space-y-2">
          <h3 className="font-medium">Storico firme</h3>
          <div className="max-h-56 overflow-auto rounded-xl border border-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs text-zinc-600">
                <tr>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Esito</th>
                  <th className="px-3 py-2">Firmatario</th>
                  <th className="px-3 py-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((row) => (
                  <tr key={row.id} className="border-t border-zinc-100">
                    <td className="px-3 py-2">{kindLabel[row.kind]}</td>
                    <td className="px-3 py-2">
                      {row.granted ? (row.revokedAt ? "Revocato" : "Concesso") : "Negato"}
                    </td>
                    <td className="px-3 py-2">{row.signerFullName}</td>
                    <td className="px-3 py-2">{new Date(row.signedAt).toLocaleString("it-IT")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {showModal ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-0 md:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowModal(false);
          }}
        >
          <Card className="mx-auto flex h-full w-full max-w-none flex-col space-y-4 rounded-none p-4 md:h-[calc(100vh-2rem)] md:rounded-2xl md:p-6">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-xl font-semibold">Firma consensi cliente</h3>
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Chiudi
              </Button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1">
              {(Object.keys(kindLabel) as ConsentKind[]).map((kind) => {
                const template = templatesByKind[kind];
                if (!template) return null;
                return (
                  <div key={kind} className="rounded-xl border border-zinc-200 p-3">
                    <p className="font-medium">
                      {template.title} (v{template.version})
                    </p>
                    <Textarea
                      className="mt-2 min-h-56 text-sm leading-relaxed"
                      value={template.legalText}
                      readOnly
                    />
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 rounded-xl border border-zinc-200 p-3">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={dataProcessingGranted}
                  onChange={(event) => setDataProcessingGranted(event.target.checked)}
                  className="mt-1"
                />
                Acconsento al trattamento dei dati per la gestione del servizio
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={photoInternalGranted}
                  onChange={(event) => setPhotoInternalGranted(event.target.checked)}
                  className="mt-1"
                />
                Acconsento all&apos;uso interno di foto/video del mio animale
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={photoSocialGranted}
                  onChange={(event) => setPhotoSocialGranted(event.target.checked)}
                  className="mt-1"
                />
                Acconsento alla pubblicazione social/web di foto/video del mio animale
              </label>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <Input
                placeholder="Nome e cognome firmatario"
                value={signerFullName}
                onChange={(event) => setSignerFullName(event.target.value)}
              />
              <Input
                placeholder="Documento (opzionale)"
                value={signerDocumentId}
                onChange={(event) => setSignerDocumentId(event.target.value)}
              />
            </div>

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
              <Button onClick={saveConsents} disabled={saving}>
                {saving ? "Salvataggio..." : "Conferma e salva firma"}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </Card>
  );
}
