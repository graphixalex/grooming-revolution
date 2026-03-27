"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type CampaignType = "MARKETING" | "SERVICE";
type CampaignSegment =
  | "ALL_RECENT"
  | "RETURN_MAX_5_WEEKS"
  | "RETURN_MAX_8_WEEKS"
  | "RETURN_MAX_12_WEEKS"
  | "INACTIVE_OVER_12_WEEKS";

type CampaignRow = {
  id: string;
  type: CampaignType;
  title: string;
  status: "DRAFT" | "RUNNING" | "COMPLETED" | "FAILED";
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  createdAt: string;
};

const RECOMMENDED_TEMPLATE =
  "Gentile %nome_cliente%, Le ricordiamo con piacere l'appuntamento di %nome_pet% per il giorno %data_appuntamento% alle ore %orario_appuntamento% presso %nome_attivita% (%indirizzo_attivita%). Saremo felici di prenderci cura del Suo amico a quattro zampe. Per eventuali modifiche, puo rispondere direttamente a questo messaggio. A presto.";
const RECOMMENDED_ONE_HOUR_TEMPLATE =
  "Ciao %nome_cliente%, promemoria veloce: oggi alle %orario_appuntamento% ci prendiamo cura di %nome_pet% da %nome_attivita% (%indirizzo_attivita%). Se hai bisogno scrivici qui.";
const RECOMMENDED_BIRTHDAY_TEMPLATE =
  "Buon compleanno %nome_pet%! Da tutto lo staff di %nome_attivita% tantissimi auguri e coccole speciali.";

export function WhatsAppClient({ initialSalon }: { initialSalon: any }) {
  const [salon, setSalon] = useState(initialSalon);
  const [campaignType, setCampaignType] = useState<CampaignType>("SERVICE");
  const [campaignTitle, setCampaignTitle] = useState("");
  const [campaignMessage, setCampaignMessage] = useState("");
  const [campaignMonthsBack, setCampaignMonthsBack] = useState("12");
  const [campaignSegment, setCampaignSegment] = useState<CampaignSegment>("ALL_RECENT");
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [campaignPreviewCount, setCampaignPreviewCount] = useState<number | null>(null);
  const [campaignPreviewLoading, setCampaignPreviewLoading] = useState(false);

  const isTemplatesConfigured = useMemo(
    () =>
      Boolean(salon.whatsappApiEnabled) &&
      Boolean((salon.whatsappApiPhoneNumberId || "").trim()) &&
      Boolean((salon.whatsappApiAccessToken || "").trim()),
    [salon.whatsappApiAccessToken, salon.whatsappApiEnabled, salon.whatsappApiPhoneNumberId],
  );

  const saveTemplates = async () => {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "templates",
        whatsappTemplate: salon.whatsappTemplate,
        whatsappOneHourTemplate: salon.whatsappOneHourTemplate,
        whatsappBirthdayTemplate: salon.whatsappBirthdayTemplate,
        whatsappDayBeforeEnabled: Boolean(salon.whatsappDayBeforeEnabled),
        whatsappOneHourEnabled: Boolean(salon.whatsappOneHourEnabled),
        whatsappBirthdayEnabled: Boolean(salon.whatsappBirthdayEnabled),
        whatsappApiEnabled: Boolean(salon.whatsappApiEnabled),
        whatsappApiPhoneNumberId: salon.whatsappApiPhoneNumberId || "",
        whatsappApiVersion: salon.whatsappApiVersion || "v23.0",
        whatsappApiAccessToken: salon.whatsappApiAccessToken || "",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Errore salvataggio configurazione WhatsApp");
      return;
    }
    setSalon((prev: any) => ({ ...prev, ...data }));
    alert(data.warning || "Configurazione WhatsApp salvata");
  };

  const loadCampaigns = async () => {
    const res = await fetch("/api/whatsapp/campaigns");
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Errore caricamento campagne");
      return;
    }
    setCampaigns(data);
  };

  useEffect(() => {
    void loadCampaigns();
  }, []);

  async function dispatchCampaign(campaignId: string) {
    setCampaignLoading(true);
    try {
      for (let i = 0; i < 20; i += 1) {
        const res = await fetch(`/api/whatsapp/campaigns/${campaignId}/dispatch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchSize: 100 }),
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || "Errore invio campagna");
          break;
        }
        if (data.status === "COMPLETED" || data.processed === 0) break;
      }
      await loadCampaigns();
    } finally {
      setCampaignLoading(false);
    }
  }

  async function createCampaign() {
    if (!campaignTitle.trim() || !campaignMessage.trim()) {
      alert("Inserisca titolo e messaggio della campagna");
      return;
    }
    setCampaignLoading(true);
    try {
      const res = await fetch("/api/whatsapp/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: campaignType,
          title: campaignTitle.trim(),
          messageTemplate: campaignMessage.trim(),
          monthsBack: Number(campaignMonthsBack) || 12,
          segment: campaignSegment,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Errore creazione campagna");
        return;
      }
      await dispatchCampaign(data.campaignId);
      setCampaignTitle("");
      setCampaignMessage("");
      alert("Campagna avviata");
    } finally {
      setCampaignLoading(false);
    }
  }

  async function previewCampaignRecipients() {
    setCampaignPreviewLoading(true);
    try {
      const query = new URLSearchParams({
        type: campaignType,
        monthsBack: String(Math.max(1, Math.min(36, Number(campaignMonthsBack) || 12))),
        segment: campaignSegment,
      });
      const res = await fetch(`/api/whatsapp/campaigns/preview?${query.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Errore anteprima destinatari");
        return;
      }
      setCampaignPreviewCount(Number(data.recipients) || 0);
    } finally {
      setCampaignPreviewLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="font-semibold">Template automazioni WhatsApp</h2>
        <p className="text-xs text-zinc-500">
          Placeholder disponibili: %nome_cliente% %nome_pet% %data_appuntamento% %orario_appuntamento% %nome_attivita% %indirizzo_attivita%
        </p>
        <div className="space-y-2 rounded-md border border-zinc-200 p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={Boolean(salon.whatsappDayBeforeEnabled)}
              onChange={(e) => setSalon({ ...salon, whatsappDayBeforeEnabled: e.target.checked })}
            />
            Invia reminder automatico il giorno prima
          </label>
          <p className="text-xs font-medium text-zinc-700">Messaggio reminder giorno prima</p>
          <Textarea
            value={salon.whatsappTemplate || ""}
            onChange={(e) => setSalon({ ...salon, whatsappTemplate: e.target.value })}
            placeholder={RECOMMENDED_TEMPLATE}
            className="min-h-[110px]"
          />
        </div>
        <div className="space-y-2 rounded-md border border-zinc-200 p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={Boolean(salon.whatsappOneHourEnabled)}
              onChange={(e) => setSalon({ ...salon, whatsappOneHourEnabled: e.target.checked })}
            />
            Invia reminder automatico 1 ora prima
          </label>
          <p className="text-xs font-medium text-zinc-700">Messaggio reminder 1 ora prima</p>
          <Textarea
            value={salon.whatsappOneHourTemplate || ""}
            onChange={(e) => setSalon({ ...salon, whatsappOneHourTemplate: e.target.value })}
            placeholder={RECOMMENDED_ONE_HOUR_TEMPLATE}
            className="min-h-[100px]"
          />
        </div>
        <div className="space-y-2 rounded-md border border-zinc-200 p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={Boolean(salon.whatsappBirthdayEnabled)}
              onChange={(e) => setSalon({ ...salon, whatsappBirthdayEnabled: e.target.checked })}
            />
            Invia auguri automatici il compleanno del cane
          </label>
          <p className="text-xs font-medium text-zinc-700">Messaggio auguri compleanno</p>
          <Textarea
            value={salon.whatsappBirthdayTemplate || ""}
            onChange={(e) => setSalon({ ...salon, whatsappBirthdayTemplate: e.target.value })}
            placeholder={RECOMMENDED_BIRTHDAY_TEMPLATE}
            className="min-h-[90px]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              setSalon({
                ...salon,
                whatsappTemplate: RECOMMENDED_TEMPLATE,
                whatsappOneHourTemplate: RECOMMENDED_ONE_HOUR_TEMPLATE,
                whatsappBirthdayTemplate: RECOMMENDED_BIRTHDAY_TEMPLATE,
              })
            }
          >
            Usa modelli consigliati
          </Button>
          <Button onClick={saveTemplates}>Salva configurazione WhatsApp</Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">WhatsApp API Meta</h2>
        <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
          <p className="font-semibold">Configurazione completa (consigliata)</p>
          <ol className="mt-2 list-decimal space-y-1 pl-4">
            <li>In Meta for Developers apra la Sua app e aggiunga il prodotto WhatsApp.</li>
            <li>In WhatsApp Manager colleghi e verifichi un numero WhatsApp Business dedicato al salone.</li>
            <li>Crei un System User in Business Manager e generi un token permanente con permessi invio messaggi.</li>
            <li>Copi il Phone Number ID del numero mittente e lo inserisca qui.</li>
            <li>Incolli il token API (se lascia vuoto, il token precedente resta invariato).</li>
            <li>Lasci la versione API su v23.0 salvo specifiche diverse del Suo account Meta.</li>
            <li>Attivi la checkbox e salvi la configurazione.</li>
          </ol>
          <p className="mt-2">
            Con API attiva, il sistema invia reminder automatici (giorno prima e 1 ora prima), auguri compleanno cane e abilita le campagne massivo.
            Se credenziali o permessi non sono validi, la piattaforma torna al metodo manuale (wa.me) senza bloccare l&apos;operatività.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(salon.whatsappApiEnabled)}
            onChange={(e) => setSalon({ ...salon, whatsappApiEnabled: e.target.checked })}
          />
          Abilita invio automatico via WhatsApp API
        </label>
        <div className="grid gap-2 md:grid-cols-2">
          <Input
            value={salon.whatsappApiPhoneNumberId || ""}
            onChange={(e) => setSalon({ ...salon, whatsappApiPhoneNumberId: e.target.value })}
            placeholder="Phone Number ID (es. 123456789012345)"
          />
          <Input
            value={salon.whatsappApiVersion || "v23.0"}
            onChange={(e) => setSalon({ ...salon, whatsappApiVersion: e.target.value })}
            placeholder="Versione API (es. v23.0)"
          />
        </div>
        <Input
          type="password"
          value={salon.whatsappApiAccessToken || ""}
          onChange={(e) => setSalon({ ...salon, whatsappApiAccessToken: e.target.value })}
          placeholder="Access Token API (lasciare vuoto per mantenere quello esistente)"
        />
        <div
          className={`rounded-md border p-2 text-xs ${
            isTemplatesConfigured ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {isTemplatesConfigured
            ? "Configurazione API pronta per invio automatico e campagne."
            : "Configurazione incompleta: controlli Phone Number ID, token e checkbox attiva."}
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">Campagne WhatsApp</h2>
        <div
          className={`rounded-md border p-3 text-sm ${
            salon.whatsappApiEnabled ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {salon.whatsappApiEnabled
            ? "Invio massivo attivo: i messaggi partono tramite API Meta."
            : "Per usare le campagne attivi prima la WhatsApp API in questa pagina."}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className={`rounded-md border p-3 ${campaignType === "SERVICE" ? "border-emerald-300 bg-emerald-50" : "border-zinc-200 bg-white"}`}>
            <p className="text-sm font-semibold">Invio di servizio</p>
            <p className="text-xs text-zinc-600">
              Comunicazioni operative (es. chiusure, variazioni orari, informazioni importanti) su clienti del periodo scelto.
            </p>
            <Button variant={campaignType === "SERVICE" ? "default" : "outline"} className="mt-2" onClick={() => setCampaignType("SERVICE")}>
              Seleziona
            </Button>
          </div>
          <div className={`rounded-md border p-3 ${campaignType === "MARKETING" ? "border-amber-300 bg-amber-50" : "border-zinc-200 bg-white"}`}>
            <p className="text-sm font-semibold">Invio marketing</p>
            <p className="text-xs text-zinc-600">
              Promo e offerte dedicate, inviate solo ai clienti con consenso promemoria attivo.
            </p>
            <Button variant={campaignType === "MARKETING" ? "default" : "outline"} className="mt-2" onClick={() => setCampaignType("MARKETING")}>
              Seleziona
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-600">Titolo campagna</p>
            <Input value={campaignTitle} onChange={(e) => setCampaignTitle(e.target.value)} placeholder="Es. Aggiornamento orari estivi" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-600">Clienti considerati (mesi)</p>
            <Input type="number" min="1" max="36" value={campaignMonthsBack} onChange={(e) => setCampaignMonthsBack(e.target.value)} />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-600">Tipo invio</p>
            <div className="flex h-10 items-center rounded-md border border-zinc-300 bg-zinc-50 px-3 text-sm font-semibold text-zinc-800">
              {campaignType === "SERVICE" ? "Servizio" : "Marketing"}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-600">Segmento clienti</p>
            <select
              className="h-10 rounded-md border border-zinc-300 px-3 text-sm"
              value={campaignSegment}
              onChange={(e) => setCampaignSegment(e.target.value as CampaignSegment)}
            >
              <option value="ALL_RECENT">Tutti i clienti recenti</option>
              <option value="RETURN_MAX_5_WEEKS">Ritorno medio entro 5 settimane</option>
              <option value="RETURN_MAX_8_WEEKS">Ritorno medio 5-8 settimane</option>
              <option value="RETURN_MAX_12_WEEKS">Ritorno medio 8-12 settimane</option>
              <option value="INACTIVE_OVER_12_WEEKS">Assenti da oltre 12 settimane</option>
            </select>
          </div>
        </div>
        <Textarea
          value={campaignMessage}
          onChange={(e) => setCampaignMessage(e.target.value)}
          placeholder="Messaggio campagna. Variabili supportate: %nome_cliente% %nome_attivita%"
        />
        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
          <p className="font-medium text-zinc-800">Anteprima destinatari</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={previewCampaignRecipients} disabled={campaignPreviewLoading || campaignLoading}>
              {campaignPreviewLoading ? "Calcolo..." : "Calcola anteprima"}
            </Button>
            {campaignPreviewCount !== null ? (
              <span className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-700">
                Destinatari stimati: {campaignPreviewCount}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={createCampaign} disabled={campaignLoading || !salon.whatsappApiEnabled}>
            {campaignLoading ? "Invio in corso..." : "Crea e invia campagna"}
          </Button>
          <Button variant="outline" onClick={loadCampaigns} disabled={campaignLoading}>
            Aggiorna storico
          </Button>
        </div>
        <div className="space-y-2">
          {campaigns.length === 0 ? <p className="text-sm text-zinc-500">Nessuna campagna presente.</p> : null}
          {campaigns.map((row) => {
            const remaining = Math.max(0, row.totalRecipients - row.sentCount - row.skippedCount);
            return (
              <div key={row.id} className="rounded-md border border-zinc-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {row.title} - {row.type}
                  </p>
                  <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">{row.status}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-600">
                  Totale: {row.totalRecipients} | Inviati: {row.sentCount} | Falliti: {row.failedCount} | Saltati: {row.skippedCount}
                </p>
                <p className="text-xs text-zinc-600">Restano da inviare: {remaining}</p>
                <p className="text-xs text-zinc-500">Creata: {new Date(row.createdAt).toLocaleString("it-IT")}</p>
                {row.status !== "COMPLETED" ? (
                  <Button variant="outline" className="mt-2" onClick={() => dispatchCampaign(row.id)} disabled={campaignLoading || !salon.whatsappApiEnabled}>
                    Continua invio
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}


