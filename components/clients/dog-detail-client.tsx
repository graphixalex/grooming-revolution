"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { renderTemplate, normalizePhone, reminderVariables } from "@/lib/reminders";

export function DogDetailClient({ payload, salon }: { payload: any; salon: any }) {
  const [page, setPage] = useState(payload.page);
  const [data, setData] = useState(payload);

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

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="text-2xl font-semibold">{data.dog.nome}</h1>
        <p className="text-sm text-zinc-600">Razza: {data.dog.razza || "-"} - Taglia: {data.dog.taglia}</p>
        <p className="text-sm">Cliente: {data.dog.cliente.nome} {data.dog.cliente.cognome}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm">{data.dog.noteCane || "Nessuna nota cane"}</p>
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

