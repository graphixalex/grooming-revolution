"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Treatment = { id: string; nome: string };
type Slot = { startAt: string; endAt: string; operatorId: string | null; operatorName: string | null };

const dogSizes = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export function PublicBookingClient({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [timeZone, setTimeZone] = useState("Europe/Zurich");
  const [description, setDescription] = useState("");
  const [treatments, setTreatments] = useState<Treatment[]>([]);

  const [treatmentId, setTreatmentId] = useState("");
  const [dogNome, setDogNome] = useState("");
  const [dogRazza, setDogRazza] = useState("");
  const [dogTaglia, setDogTaglia] = useState<(typeof dogSizes)[number]>("M");
  const [dogTipoPelo, setDogTipoPelo] = useState("");
  const [note, setNote] = useState("");
  const [clientNome, setClientNome] = useState("");
  const [clientCognome, setClientCognome] = useState("");
  const [clientTelefono, setClientTelefono] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlotKey, setSelectedSlotKey] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/public/booking/${encodeURIComponent(slug)}/config`);
      const data = await res.json();
      if (!res.ok) {
        setConfigError(data.error || "Booking non disponibile");
        setLoading(false);
        return;
      }
      setDisplayName(data.displayName || "");
      setTimeZone(data.timeZone || "Europe/Zurich");
      setDescription(data.description || "");
      setTreatments(Array.isArray(data.treatments) ? data.treatments : []);
      setTreatmentId(data.treatments?.[0]?.id || "");
      setLoading(false);
    })();
  }, [slug]);

  const selectedSlot = useMemo(() => slots.find((s) => `${s.startAt}|${s.operatorId || ""}` === selectedSlotKey) || null, [slots, selectedSlotKey]);

  async function loadSlots() {
    if (!treatmentId || !dogTaglia) {
      alert("Seleziona servizio e taglia cane");
      return;
    }
    setSlotsLoading(true);
    const res = await fetch(`/api/public/booking/${encodeURIComponent(slug)}/slots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        treatmentId,
        dogSize: dogTaglia,
        dogRazza,
        dogTipoPelo,
      }),
    });
    const data = await res.json();
    setSlotsLoading(false);
    if (!res.ok) {
      alert(data.error || "Errore calcolo slot");
      return;
    }
    setEstimatedDuration(data.estimatedDurationMin || null);
    setSlots(data.slots || []);
    setSelectedSlotKey("");
  }

  async function sendRequest() {
    if (!selectedSlot) {
      alert("Seleziona uno slot");
      return;
    }
    if (!clientNome.trim() || !clientCognome.trim() || !clientTelefono.trim() || !dogNome.trim()) {
      alert("Compila i campi obbligatori");
      return;
    }
    setSending(true);
    const res = await fetch(`/api/public/booking/${encodeURIComponent(slug)}/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        treatmentId,
        selectedStartAt: selectedSlot.startAt,
        selectedOperatorId: selectedSlot.operatorId,
        clientNome,
        clientCognome,
        clientTelefono,
        clientEmail,
        dogNome,
        dogRazza,
        dogTaglia,
        dogTipoPelo,
        note,
      }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      alert(data.error || "Errore invio richiesta");
      return;
    }
    alert(data.message || "Richiesta inviata");
    setSlots([]);
    setSelectedSlotKey("");
    setEstimatedDuration(null);
  }

  if (loading) return <div className="p-6 text-sm text-zinc-600">Caricamento booking...</div>;
  if (configError) return <div className="p-6 text-sm text-red-700">{configError}</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-8">
      <Card className="space-y-1">
        <h1 className="text-2xl font-semibold">{displayName}</h1>
        {description ? <p className="text-sm text-zinc-600">{description}</p> : null}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">1) Servizio e cane</h2>
        <div className="grid gap-2 md:grid-cols-2">
          <select className="h-10 rounded-md border border-zinc-300 px-3 text-sm" value={treatmentId} onChange={(e) => setTreatmentId(e.target.value)}>
            {treatments.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
          <select className="h-10 rounded-md border border-zinc-300 px-3 text-sm" value={dogTaglia} onChange={(e) => setDogTaglia(e.target.value as any)}>
            {dogSizes.map((s) => <option key={s} value={s}>Taglia {s}</option>)}
          </select>
          <Input placeholder="Nome cane" value={dogNome} onChange={(e) => setDogNome(e.target.value)} />
          <Input placeholder="Razza cane" value={dogRazza} onChange={(e) => setDogRazza(e.target.value)} />
          <Input placeholder="Tipo pelo (es. lungo, riccio)" value={dogTipoPelo} onChange={(e) => setDogTipoPelo(e.target.value)} />
        </div>
        <Button onClick={loadSlots} disabled={slotsLoading}>{slotsLoading ? "Calcolo opzioni..." : "Trova 6 opzioni disponibili"}</Button>
        {estimatedDuration ? <p className="text-sm text-zinc-600">Durata stimata: {estimatedDuration} minuti</p> : null}
      </Card>

      {slots.length ? (
        <Card className="space-y-3">
          <h2 className="font-semibold">2) Scegli una delle opzioni</h2>
          <div className="space-y-2">
            {slots.map((s) => {
              const key = `${s.startAt}|${s.operatorId || ""}`;
              const d = new Date(s.startAt);
              return (
                <label key={key} className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 p-2 text-sm">
                  <input type="radio" name="slot" checked={selectedSlotKey === key} onChange={() => setSelectedSlotKey(key)} />
                  <span>{d.toLocaleString("it-IT", { timeZone, weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="text-zinc-500">({timeZone})</span>
                  <span className="text-zinc-500">{s.operatorName ? `- ${s.operatorName}` : ""}</span>
                </label>
              );
            })}
          </div>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <h2 className="font-semibold">3) Dati proprietario</h2>
        <div className="grid gap-2 md:grid-cols-2">
          <Input placeholder="Nome" value={clientNome} onChange={(e) => setClientNome(e.target.value)} />
          <Input placeholder="Cognome" value={clientCognome} onChange={(e) => setClientCognome(e.target.value)} />
          <Input placeholder="Telefono" value={clientTelefono} onChange={(e) => setClientTelefono(e.target.value)} />
          <Input placeholder="Email (opzionale)" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
        </div>
        <Textarea placeholder="Note (opzionale)" value={note} onChange={(e) => setNote(e.target.value)} />
        <p className="text-xs text-zinc-500">
          Nuovi clienti e clienti con ultima visita oltre 60 giorni richiedono conferma team prima della prenotazione definitiva.
        </p>
        <Button onClick={sendRequest} disabled={sending || !slots.length || !selectedSlot}>
          {sending ? "Invio..." : "Invia richiesta / prenotazione"}
        </Button>
      </Card>
    </div>
  );
}
