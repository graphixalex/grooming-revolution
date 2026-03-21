"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Treatment = { id: string; nome: string };
type Slot = { startAt: string; endAt: string; operatorId: string | null; operatorName: string | null };

const dogSizes = ["XS", "S", "M", "L", "XL", "XXL"] as const;
const knotOptions = [
  { value: "NESSUNO", label: "No, non ci sono nodi" },
  { value: "MODERATI", label: "Ci sono nodi moderati" },
  { value: "MOLTI", label: "Ci sono molti nodi" },
] as const;

export function PublicBookingClient({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [timeZone, setTimeZone] = useState("Europe/Zurich");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [treatments, setTreatments] = useState<Treatment[]>([]);

  const [treatmentId, setTreatmentId] = useState("");
  const [dogNome, setDogNome] = useState("");
  const [dogRazza, setDogRazza] = useState("");
  const [dogTaglia, setDogTaglia] = useState<(typeof dogSizes)[number]>("M");
  const [dogTipoPelo, setDogTipoPelo] = useState("");
  const [dogNodi, setDogNodi] = useState<(typeof knotOptions)[number]["value"]>("NESSUNO");
  const [note, setNote] = useState("");
  const [clientNome, setClientNome] = useState("");
  const [clientCognome, setClientCognome] = useState("");
  const [clientTelefono, setClientTelefono] = useState("");

  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlotKey, setSelectedSlotKey] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchAnchorIso, setSearchAnchorIso] = useState<string>("");
  const [alternativesUsed, setAlternativesUsed] = useState(false);

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
      setLogoUrl(data.logoUrl || "");
      setAddress(data.address || "");
      setPhone(data.phone || "");
      setTreatments(Array.isArray(data.treatments) ? data.treatments : []);
      setTreatmentId(data.treatments?.[0]?.id || "");
      setLoading(false);
    })();
  }, [slug]);

  const selectedSlot = useMemo(() => slots.find((s) => `${s.startAt}|${s.operatorId || ""}` === selectedSlotKey) || null, [slots, selectedSlotKey]);

  async function loadSlots(mode: "initial" | "alternative" = "initial") {
    if (!treatmentId || !dogTaglia) {
      alert("Seleziona servizio e taglia cane");
      return;
    }
    const anchor = mode === "initial" ? new Date().toISOString() : searchAnchorIso || new Date().toISOString();
    const startAtIso =
      mode === "alternative"
        ? new Date(new Date(anchor).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : anchor;
    if (mode === "alternative" && alternativesUsed) {
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
        dogNodi,
        startAt: startAtIso,
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
    if (mode === "initial") {
      setSearchAnchorIso(anchor);
      setAlternativesUsed(false);
    } else {
      setAlternativesUsed(true);
    }
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
        dogNome,
        dogRazza,
        dogTaglia,
        dogTipoPelo,
        dogNodi,
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
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-zinc-100">
      <div className="mx-auto w-full max-w-7xl space-y-4 px-3 py-4 sm:px-4 sm:py-6 md:space-y-6 md:px-8 md:py-8">
        <Card className="overflow-hidden border-zinc-200 bg-white p-0">
          <div className="grid gap-4 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-700 p-4 text-white md:grid-cols-[1fr_auto] md:items-center md:p-6">
            <div className="space-y-2">
              <p className="inline-block rounded-full border border-white/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-100">
                Prenotazione online
              </p>
              <h1 className="text-2xl font-black leading-tight md:text-4xl">
                Prenota il tuo appuntamento in modo smart e veloce
              </h1>
              <p className="max-w-3xl text-sm text-zinc-200 md:text-base">
                Scegli servizio e dati del cane, ottieni 6 orari disponibili reali e invia la richiesta in meno di 1 minuto.
                Il team conferma in base alle regole del salone.
              </p>
              <p className="text-sm font-semibold text-amber-300">{displayName}</p>
              {description ? <p className="text-sm text-zinc-200">{description}</p> : null}
            </div>
            <div className="flex items-center justify-start md:justify-end">
              <Image
                src={logoUrl || "/img/logo-grooming-revolution.png"}
                alt={displayName || "Booking"}
                width={300}
                height={100}
                className="h-16 w-auto rounded-lg bg-white/90 p-2 shadow-sm md:h-20"
                priority
              />
            </div>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold">Servizio e cane</h2>
            <p className="text-xs text-zinc-600">
              Seleziona il servizio desiderato e inserisci i dettagli del cane per ricevere opzioni orarie compatibili.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <p className="sm:col-span-2 text-xs font-medium text-zinc-700">Seleziona servizio desiderato</p>
              <select className="h-11 rounded-md border border-zinc-300 px-3 text-sm" value={treatmentId} onChange={(e) => setTreatmentId(e.target.value)}>
                {treatments.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
              <select className="h-11 rounded-md border border-zinc-300 px-3 text-sm" value={dogTaglia} onChange={(e) => setDogTaglia(e.target.value as any)}>
                {dogSizes.map((s) => <option key={s} value={s}>Taglia {s}</option>)}
              </select>
              <Input className="h-11" placeholder="Nome cane" value={dogNome} onChange={(e) => setDogNome(e.target.value)} />
              <Input className="h-11" placeholder="Razza cane" value={dogRazza} onChange={(e) => setDogRazza(e.target.value)} />
              <Input className="h-11 sm:col-span-2" placeholder="Tipo pelo (es. lungo, riccio)" value={dogTipoPelo} onChange={(e) => setDogTipoPelo(e.target.value)} />
              <p className="sm:col-span-2 text-xs font-medium text-zinc-700">Presenza nodi sul pelo</p>
              <select
                className="h-11 sm:col-span-2 rounded-md border border-zinc-300 px-3 text-sm"
                value={dogNodi}
                onChange={(e) => setDogNodi(e.target.value as (typeof knotOptions)[number]["value"])}
              >
                {knotOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <Button className="h-11 w-full sm:w-auto" onClick={() => void loadSlots("initial")} disabled={slotsLoading}>
              {slotsLoading ? "Calcolo opzioni..." : "Trova 6 opzioni disponibili"}
            </Button>
            <p className="text-xs text-zinc-600">
              Dopo aver compilato i dati e premuto il bottone, il sistema mostra solo slot reali disponibili in agenda.
            </p>
            {estimatedDuration ? <p className="text-sm text-zinc-600">Durata stimata: {estimatedDuration} minuti</p> : null}
          </Card>

          <Card className="space-y-3">
            <h2 className="text-lg font-semibold">Scegli una delle opzioni</h2>
            {slots.length ? (
              <div className="space-y-2">
                {slots.map((s) => {
                  const key = `${s.startAt}|${s.operatorId || ""}`;
                  const d = new Date(s.startAt);
                  return (
                    <label key={key} className="flex cursor-pointer items-start gap-2 rounded-md border border-zinc-200 p-3 text-sm">
                      <input className="mt-1" type="radio" name="slot" checked={selectedSlotKey === key} onChange={() => setSelectedSlotKey(key)} />
                      <span className="flex-1">
                        {d.toLocaleString("it-IT", { timeZone, weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        <span className="block text-xs text-zinc-500">{s.operatorName ? `Operatore: ${s.operatorName}` : "Operatore assegnato in conferma"} - {timeZone}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-zinc-600">Le opzioni orarie appariranno qui.</p>
            )}
            {slots.length > 0 && !alternativesUsed ? (
              <Button
                variant="outline"
                className="h-10 w-full sm:w-auto"
                onClick={() => void loadSlots("alternative")}
                disabled={slotsLoading}
              >
                {slotsLoading ? "Generazione..." : "Genera altre 6 alternative"}
              </Button>
            ) : null}
            {alternativesUsed ? (
              <p className="text-xs text-zinc-600">
                Hai gi&agrave; generato una seconda proposta. Se non trovi un orario adatto, chiama in salone
                {phone ? ` o invia un WhatsApp al team (${phone})` : " o invia un WhatsApp al team"} per prenotare un appuntamento idoneo.
              </p>
            ) : null}
          </Card>
        </div>

        <Card className="space-y-2 border-emerald-200 bg-emerald-50/70">
          <h2 className="text-lg font-semibold text-emerald-900">Prenotazione sicura per il salone</h2>
          <p className="text-sm text-emerald-800">
            Gli slot proposti sono controllati in tempo reale: no overbooking, no sovrapposizioni operatore, rispetto orari e durate servizio.
          </p>
          <p className="text-xs text-emerald-700">
            In caso di conflitto improvviso lo slot viene bloccato e ti viene proposta una nuova scelta.
          </p>
        </Card>

        <Card className="space-y-3">
          <h2 className="text-lg font-semibold">Dati proprietario</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input className="h-11" placeholder="Nome" value={clientNome} onChange={(e) => setClientNome(e.target.value)} />
            <Input className="h-11" placeholder="Cognome" value={clientCognome} onChange={(e) => setClientCognome(e.target.value)} />
            <Input className="h-11 sm:col-span-2" placeholder="Telefono" value={clientTelefono} onChange={(e) => setClientTelefono(e.target.value)} />
          </div>
          <Textarea placeholder="Note (opzionale)" value={note} onChange={(e) => setNote(e.target.value)} />
          <p className="text-xs text-zinc-500">
            Nuovi clienti e clienti con ultima visita oltre 60 giorni richiedono conferma team prima della prenotazione definitiva.
          </p>
          <Button className="h-11 w-full sm:w-auto" onClick={sendRequest} disabled={sending || !slots.length || !selectedSlot}>
            {sending ? "Invio..." : "Invia richiesta / prenotazione"}
          </Button>
        </Card>

        <footer className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-xs text-zinc-600 shadow-sm md:px-6">
          <p className="font-semibold text-zinc-800">Booking {displayName}</p>
          <p>
            {address ? `Sede: ${address}` : "Sede: dati sede non disponibili"}
            {phone ? ` - Tel: ${phone}` : ""}
          </p>
          <p className="mt-1 text-zinc-500">A cura di Grooming Revolution SaaS.</p>
        </footer>
      </div>
    </div>
  );
}
