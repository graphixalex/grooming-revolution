"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { renderTemplate, normalizePhone, reminderVariables } from "@/lib/reminders";

export function DogDetailClient({ payload, salon }: { payload: any; salon: any }) {
  const [page, setPage] = useState(payload.page);
  const [data, setData] = useState(payload);
  const [preferenzeCura, setPreferenzeCura] = useState(payload.dog.preferenzeCura || "");
  const [savingPreferenze, setSavingPreferenze] = useState(false);

  async function goTo(nextPage: number) {
    const res = await fetch(`/api/dogs/${payload.dog.id}?page=${nextPage}&pageSize=${payload.pageSize}`);
    const json = await res.json();
    setData(json);
    setPage(nextPage);
  }

  const totalPages = Math.ceil(data.total / data.pageSize);

  const latestAppointment = useMemo(() => data.history[0], [data.history]);

  const waPayload = useMemo(() => {
    if (!latestAppointment) return { phone: "", text: "", manualUrl: "#" };
    const vars = reminderVariables({
      nomeCliente: data.dog.cliente.nome,
      nomePet: data.dog.nome,
      startAt: new Date(latestAppointment.startAt),
      nomeAttivita: salon.nomeAttivita,
      indirizzoAttivita: salon.indirizzo || "",
    });
    const text = renderTemplate(salon.whatsappTemplate || "Promemoria appuntamento", vars);
    const normalized = normalizePhone(data.dog.cliente.telefono);
    const manualUrl = normalized
      ? `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    return { phone: data.dog.cliente.telefono, text, manualUrl };
  }, [latestAppointment, data, salon]);

  async function sendWhatsapp() {
    if (!latestAppointment) return;
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: waPayload.phone, text: waPayload.text }),
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error || "Errore invio WhatsApp");
      return;
    }
    if (json.mode === "api") {
      alert("Messaggio inviato via WhatsApp API");
      return;
    }
    if (json.warning) alert(json.warning);
    if (json.url) {
      window.open(json.url, "_blank");
      return;
    }
    window.open(waPayload.manualUrl, "_blank");
  }

  const mailtoLink = useMemo(() => {
    if (!latestAppointment || !data.dog.cliente.email) return "#";
    const vars = reminderVariables({
      nomeCliente: data.dog.cliente.nome,
      nomePet: data.dog.nome,
      startAt: new Date(latestAppointment.startAt),
      nomeAttivita: salon.nomeAttivita,
      indirizzoAttivita: salon.indirizzo || "",
    });
    const body = renderTemplate(salon.emailTemplate || "Promemoria appuntamento", vars);
    return `mailto:${data.dog.cliente.email}?subject=${encodeURIComponent("Promemoria appuntamento toelettatura")}&body=${encodeURIComponent(body)}`;
  }, [latestAppointment, data, salon]);

  async function savePreferenze() {
    setSavingPreferenze(true);
    const res = await fetch(`/api/dogs/${data.dog.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferenzeCura }),
    });
    const json = await res.json();
    setSavingPreferenze(false);
    if (!res.ok) {
      alert(json.error || "Errore salvataggio preferenze");
      return;
    }
    setData((prev: any) => ({ ...prev, dog: { ...prev.dog, preferenzeCura } }));
    alert("Preferenze salvate");
  }

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="text-2xl font-semibold">{data.dog.nome}</h1>
        <p className="text-sm text-zinc-600">Razza: {data.dog.razza || "-"} - Taglia: {data.dog.taglia}</p>
        <p className="text-sm">Cliente: {data.dog.cliente.nome} {data.dog.cliente.cognome}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm">{data.dog.noteCane || "Nessuna nota cane"}</p>
        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium">Preferenze cane</p>
          <Textarea
            placeholder="Es. taglio preferito, profumo, sensibilita, comportamento in asciugatura..."
            value={preferenzeCura}
            onChange={(e) => setPreferenzeCura(e.target.value)}
          />
          <Button onClick={savePreferenze} disabled={savingPreferenze}>
            {savingPreferenze ? "Salvataggio..." : "Salva preferenze"}
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {data.dog.tagRapidi.map((t: any) => <Badge key={t.quickTagId}>{t.quickTag.nome}</Badge>)}
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Promemoria WhatsApp</h2>
        <div className="flex gap-2">
          <Button onClick={sendWhatsapp}>Invia promemoria WhatsApp</Button>
          {data.dog.cliente.email ? <a href={mailtoLink}><Button variant="outline">Invia promemoria Email</Button></a> : null}
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Storico completo cane</h2>
        <div className="space-y-2">
          {data.history.map((h: any) => (
            <div key={h.id} className="rounded border border-zinc-200 p-3 text-sm">
              <p className="font-medium">{format(new Date(h.startAt), "dd/MM/yyyy HH:mm")} - {h.stato}</p>
              <p>
                Incasso: {h.transactions?.length ? "Incassato" : "Non incassato"}
                {h.transactions?.length
                  ? ` - EUR ${h.transactions.reduce((sum: number, tx: any) => sum + Number(tx.grossAmount || 0), 0).toFixed(2)} (${Array.from(new Set(h.transactions.map((tx: any) => tx.method))).join(", ")})`
                  : ""}
              </p>
              <p>Durata: {h.durataMinuti} min</p>
              <p>Trattamenti: {h.trattamentiSelezionati.map((t: any) => t.treatment.nome).join(", ") || "-"}</p>
              <p>Note: {h.noteAppuntamento || "-"}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button variant="outline" disabled={page <= 1} onClick={() => goTo(page - 1)}>Precedente</Button>
          <span className="text-sm">Pagina {page} / {totalPages || 1}</span>
          <Button variant="outline" disabled={page >= totalPages} onClick={() => goTo(page + 1)}>Successiva</Button>
        </div>
      </Card>
    </div>
  );
}

