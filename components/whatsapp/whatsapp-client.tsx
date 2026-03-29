"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type CampaignSegment =
  | "ALL_RECENT"
  | "RETURN_MAX_5_WEEKS"
  | "RETURN_MAX_8_WEEKS"
  | "RETURN_MAX_12_WEEKS"
  | "INACTIVE_OVER_12_WEEKS";

type CampaignRow = {
  id: string;
  type: "SERVICE" | "MARKETING";
  title: string;
  status: "DRAFT" | "RUNNING" | "COMPLETED" | "FAILED";
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  createdAt: string;
};

type ConnectionStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "DEGRADED" | "EXPIRED" | "DISABLED";

type ConnectionData = {
  id: string;
  providerType: "LINKED_SESSION" | "LEGACY_META";
  status: ConnectionStatus;
  displayPhoneNumber?: string | null;
  connectedAt?: string | null;
  lastSeenAt?: string | null;
  failureCount: number;
  disabledReason?: string | null;
};

type DiagnosticsData = {
  queued: number;
  retrying: number;
  recentEvents: Array<{
    createdAt: string;
    eventType: string;
    status: string;
    reasonCode?: string | null;
    reasonMessage?: string | null;
    attemptNumber: number;
    providerStatus?: string | null;
  }>;
};

type DiagnosticsRow = {
  salonId: string;
  salonName: string;
  connection: ConnectionData | null;
  killSwitchActive: boolean;
  automations: {
    bookingConfirmAlwaysOn: boolean;
    dayBeforeEnabled: boolean;
    hourBeforeEnabled: boolean;
    birthdayEnabled: boolean;
  };
  queue: {
    queued: number;
    locked: number;
    retryScheduled: number;
    failedPermanent: number;
    backlogTotal: number;
  };
  delivery24h: {
    accepted: number;
    failed: number;
  };
  gateway: {
    configured: boolean;
    reachable: boolean;
    rawStatus: string | null;
    mappedStatus: ConnectionStatus | null;
    initialized: boolean;
    qrAvailable: boolean;
    lastErrorCode: string | null;
    lastErrorMessage: string | null;
  };
  signals: {
    lastEvent?: {
      createdAt: string;
      eventType: string;
      status: string;
      reasonCode?: string | null;
      reasonMessage?: string | null;
    } | null;
    lastAcceptedEvent?: {
      createdAt: string;
      eventType: string;
      providerStatus?: string | null;
    } | null;
    lastErrorEvent?: {
      createdAt: string;
      eventType: string;
      status: string;
      reasonCode?: string | null;
      reasonMessage?: string | null;
    } | null;
  };
};

const RECOMMENDED_TEMPLATE =
  "Gentile %nome_cliente%, con piacere Le ricordiamo l'appuntamento di %nome_pet% previsto per %data_appuntamento% alle ore %orario_appuntamento%, presso %nome_attivita% (%indirizzo_attivita%). Saremo felici di accoglierLa. Per modifiche o disdette può rispondere direttamente a questo messaggio. Grazie.";
const RECOMMENDED_BOOKING_TEMPLATE =
  "Gentile %nome_cliente%, La ringraziamo per la prenotazione. Confermiamo l'appuntamento di %nome_pet% per %data_appuntamento% alle ore %orario_appuntamento% presso %nome_attivita% (%indirizzo_attivita%). Saremo lieti di accoglierLa.";
const RECOMMENDED_ONE_HOUR_TEMPLATE =
  "Gentile %nome_cliente%, Le ricordiamo che oggi alle ore %orario_appuntamento% è previsto l'appuntamento di %nome_pet% presso %nome_attivita% (%indirizzo_attivita%). La aspettiamo con piacere. Se desidera aggiornare l'orario, può rispondere a questo messaggio.";
const RECOMMENDED_BIRTHDAY_TEMPLATE =
  "Gentile %nome_cliente%, oggi è un giorno speciale: buon compleanno a %nome_pet%! Da tutto lo staff di %nome_attivita% i nostri auguri più affettuosi. Saremo lieti di festeggiarLo presto in salone.";

function statusText(status: ConnectionStatus) {
  if (status === "CONNECTED") return "Operativo";
  if (status === "DEGRADED") return "Operativo con errori";
  if (status === "CONNECTING") return "Collegamento in corso";
  if (status === "EXPIRED") return "Sessione scaduta";
  if (status === "DISABLED") return "Disabilitato";
  return "Non collegato";
}

function isConnected(status: ConnectionStatus) {
  return status === "CONNECTED" || status === "DEGRADED";
}

function providerText(provider?: ConnectionData["providerType"] | null) {
  if (provider === "LINKED_SESSION") return "Collegamento QR della sede";
  if (provider === "LEGACY_META") return "Canale storico";
  return "-";
}

function campaignStatusText(status: CampaignRow["status"]) {
  if (status === "DRAFT") return "Bozza";
  if (status === "RUNNING") return "In corso";
  if (status === "COMPLETED") return "Completato";
  return "Errore";
}

export function WhatsAppClient({ initialSalon }: { initialSalon: any }) {
  const [salon, setSalon] = useState(initialSalon);
  const [connection, setConnection] = useState<ConnectionData | null>(initialSalon.whatsappConnection || null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(initialSalon.whatsappDiagnostics || null);
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrExpiresAt, setQrExpiresAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [diagRows, setDiagRows] = useState<DiagnosticsRow[]>([]);
  const [diagScope, setDiagScope] = useState<"CURRENT_SALON" | "GROUP">("CURRENT_SALON");
  const [gatewayConfigured, setGatewayConfigured] = useState(true);

  const [campaignTitle, setCampaignTitle] = useState("");
  const [campaignMessage, setCampaignMessage] = useState("");
  const [campaignMonthsBack, setCampaignMonthsBack] = useState("12");
  const [campaignSegment, setCampaignSegment] = useState<CampaignSegment>("ALL_RECENT");
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [campaignPreviewCount, setCampaignPreviewCount] = useState<number | null>(null);
  const [campaignPreviewLoading, setCampaignPreviewLoading] = useState(false);

  const channelReady = useMemo(() => {
    if (!connection) return false;
    return isConnected(connection.status);
  }, [connection]);

  async function loadConnection() {
    const res = await fetch("/api/whatsapp/connection", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Non riesco a leggere lo stato del canale WhatsApp");
      return;
    }
    setConnection(data.connection);
    setDiagnostics(data.diagnostics);
  }

  async function loadDiagnosticsSummary() {
    const res = await fetch("/api/whatsapp/diagnostics", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) return;
    setDiagScope(data.scope || "CURRENT_SALON");
    setGatewayConfigured(Boolean(data.gatewayConfigured));
    setDiagRows(Array.isArray(data.rows) ? data.rows : []);
  }

  async function startPairing() {
    setBusy(true);
    try {
      const res = await fetch("/api/whatsapp/connection?includeQr=1", { method: "POST", headers: { "Content-Type": "application/json" } });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Non riesco ad avviare il collegamento WhatsApp");
        return;
      }
      const qrPayload = data?.qr?.qrData;
      if (typeof qrPayload === "string" && qrPayload.trim().length > 0) {
        setQrData(qrPayload);
      } else {
        setQrData(null);
      }
      setQrExpiresAt(typeof data?.qr?.expiresAt === "string" ? data.qr.expiresAt : null);
      await loadConnection();
      await loadDiagnosticsSummary();
    } finally {
      setBusy(false);
    }
  }

  async function refreshGatewayState() {
    setBusy(true);
    try {
      const res = await fetch("/api/whatsapp/connection?mode=sync", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Non riesco ad aggiornare lo stato del canale");
        return;
      }
      setConnection(data.connection);
      setDiagnostics(data.diagnostics);
      await loadDiagnosticsSummary();
    } finally {
      setBusy(false);
    }
  }

  async function refreshQr() {
    setBusy(true);
    try {
      const res = await fetch("/api/whatsapp/connection?mode=qr", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Codice QR non disponibile");
        setQrData(null);
        setQrExpiresAt(null);
        return;
      }
      setQrData(typeof data?.qr?.qrData === "string" ? data.qr.qrData : null);
      setQrExpiresAt(typeof data?.qr?.expiresAt === "string" ? data.qr.expiresAt : null);
      await refreshGatewayState();
    } finally {
      setBusy(false);
    }
  }

  async function disconnectWhatsApp() {
    if (!confirm("Vuole davvero disconnettere WhatsApp per questa sede?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/whatsapp/connection", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Disconnessione manuale" }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Errore durante la disconnessione del canale");
        return;
      }
      setConnection(data.connection);
      setDiagnostics(data.diagnostics);
      setQrData(null);
      setQrExpiresAt(null);
      await loadDiagnosticsSummary();
    } finally {
      setBusy(false);
    }
  }

  async function toggleKillSwitch(enable: boolean) {
    setBusy(true);
    try {
      const res = await fetch("/api/whatsapp/connection", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enable ? { action: "enable" } : { action: "disable", reason: "Kill-switch manuale da UI" }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Operazione non riuscita");
        return;
      }
      setConnection(data.connection);
      setDiagnostics(data.diagnostics);
      await loadDiagnosticsSummary();
    } finally {
      setBusy(false);
    }
  }

  const saveTemplates = async () => {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "templates",
        whatsappTemplate: salon.whatsappTemplate,
        whatsappBookingTemplate: salon.whatsappBookingTemplate,
        whatsappOneHourTemplate: salon.whatsappOneHourTemplate,
        whatsappBirthdayTemplate: salon.whatsappBirthdayTemplate,
        whatsappDayBeforeEnabled: Boolean(salon.whatsappDayBeforeEnabled),
        whatsappOneHourEnabled: Boolean(salon.whatsappOneHourEnabled),
        whatsappBirthdayEnabled: Boolean(salon.whatsappBirthdayEnabled),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Errore nel salvataggio della configurazione WhatsApp");
      return;
    }
    setSalon((prev: any) => ({ ...prev, ...data }));
    alert(data.warning || "Configurazione WhatsApp salvata con successo");
  };

  const loadCampaigns = async () => {
    const res = await fetch("/api/whatsapp/campaigns", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Errore nel caricamento dello storico invii");
      return;
    }
    setCampaigns(data);
  };

  useEffect(() => {
    void loadCampaigns();
    void loadConnection();
    void loadDiagnosticsSummary();
  }, []);

  async function dispatchCampaign(campaignId: string) {
    setCampaignLoading(true);
    try {
      const res = await fetch(`/api/whatsapp/campaigns/${campaignId}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize: 120 }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Errore durante l'invio");
        return;
      }
      await loadCampaigns();
    } finally {
      setCampaignLoading(false);
    }
  }

  async function createCampaign() {
    if (!campaignTitle.trim() || !campaignMessage.trim()) {
      alert("Inserisca titolo e testo del messaggio");
      return;
    }
    setCampaignLoading(true);
    try {
      const res = await fetch("/api/whatsapp/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "SERVICE",
          title: campaignTitle.trim(),
          messageTemplate: campaignMessage.trim(),
          monthsBack: Number(campaignMonthsBack) || 12,
          segment: campaignSegment,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Errore nella creazione dell'invio");
        return;
      }
      await dispatchCampaign(data.campaignId);
      setCampaignTitle("");
      setCampaignMessage("");
      alert("Invio messo in coda");
    } finally {
      setCampaignLoading(false);
    }
  }

  async function previewCampaignRecipients() {
    setCampaignPreviewLoading(true);
    try {
      const query = new URLSearchParams({
        type: "SERVICE",
        monthsBack: String(Math.max(1, Math.min(36, Number(campaignMonthsBack) || 12))),
        segment: campaignSegment,
      });
      const res = await fetch(`/api/whatsapp/campaigns/preview?${query.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Errore nel calcolo destinatari");
        return;
      }
      setCampaignPreviewCount(Number(data.recipients) || 0);
    } finally {
      setCampaignPreviewLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-4 sm:p-5">
        <h2 className="text-base font-semibold">Collegamento WhatsApp della sede</h2>
        {!gatewayConfigured ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            Il servizio di collegamento WhatsApp non è configurato correttamente. Gli invii automatici possono fermarsi.
          </div>
        ) : null}
        <div
          className={`rounded-md border p-2 text-xs ${
            channelReady ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          Stato WhatsApp: <strong>{connection ? statusText(connection.status) : "Non configurato"}</strong>
          {connection?.disabledReason ? <span> - {connection.disabledReason}</span> : null}
        </div>
        {connection?.status === "DEGRADED" ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            La connessione è instabile: alcuni messaggi potrebbero subire ritardi o più tentativi di invio.
          </div>
        ) : null}
        {connection?.status === "DISABLED" ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
            Blocco sicurezza attivo: gli invii automatici restano fermi finché non riattiva il canale.
          </div>
        ) : null}
        <div className="grid gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700 md:grid-cols-2">
          <p>
            <span className="font-semibold">Tecnologia usata:</span> {providerText(connection?.providerType)}
          </p>
          <p>
            <span className="font-semibold">Numero collegato:</span> {connection?.displayPhoneNumber || "-"}
          </p>
          <p>
            <span className="font-semibold">Connesso il:</span>{" "}
            {connection?.connectedAt ? new Date(connection.connectedAt).toLocaleString("it-IT") : "-"}
          </p>
          <p>
            <span className="font-semibold">Ultimo heartbeat:</span>{" "}
            {connection?.lastSeenAt ? new Date(connection.lastSeenAt).toLocaleString("it-IT") : "-"}
          </p>
          <p>
            <span className="font-semibold">Messaggi in attesa:</span> {diagnostics?.queued ?? 0}
          </p>
          <p>
            <span className="font-semibold">Messaggi da ritentare:</span> {diagnostics?.retrying ?? 0}
          </p>
        </div>

        <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
          <p className="font-semibold">Come collegare WhatsApp in modo semplice</p>
          <ol className="mt-2 list-decimal space-y-1 pl-4">
            <li>Premi &quot;Avvia collegamento&quot;.</li>
            <li>Apri WhatsApp Business sul telefono della sede e inquadra il codice QR.</li>
            <li>Premi &quot;Aggiorna stato&quot; per confermare che il collegamento è attivo.</li>
          </ol>
          {qrData ? (
            <div className="mt-2 rounded border border-sky-200 bg-white p-2 text-[11px]">
              <p className="mb-2"><strong>Codice QR disponibile</strong></p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrData} alt="QR WhatsApp" className="h-52 w-52 rounded border border-zinc-200 object-contain sm:h-56 sm:w-56" />
              {qrExpiresAt ? <p className="mt-2"><strong>Scade:</strong> {new Date(qrExpiresAt).toLocaleString("it-IT")}</p> : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => startPairing()} disabled={busy}>Avvia collegamento</Button>
          <Button variant="outline" onClick={refreshQr} disabled={busy}>
            Mostra/Aggiorna QR
          </Button>
          <Button variant="outline" onClick={refreshGatewayState} disabled={busy}>
            Aggiorna stato
          </Button>
          <Button variant="outline" onClick={disconnectWhatsApp} disabled={busy || !connection || connection.status === "DISCONNECTED"}>
            Disconnetti
          </Button>
          <Button
            variant="outline"
            onClick={() => toggleKillSwitch(false)}
            disabled={busy || !connection || connection.status === "DISABLED"}
          >
            Blocca invii automatici
          </Button>
          <Button
            variant="outline"
            onClick={() => toggleKillSwitch(true)}
            disabled={busy || !connection || connection.status !== "DISABLED"}
          >
            Riattiva invii automatici
          </Button>
        </div>
      </Card>

      <Card className="space-y-3 p-4 sm:p-5">
        <h2 className="text-base font-semibold">Controllo stato invii</h2>
        <p className="text-xs text-zinc-600">
          Area analizzata: {diagScope === "GROUP" ? "tutte le sedi del gruppo" : "solo sede corrente"}
        </p>
        <div className="space-y-2">
          {diagRows.length === 0 ? <p className="text-sm text-zinc-500">Nessun dato diagnostico disponibile.</p> : null}
          {diagRows.map((row) => {
            const conn = row.connection;
            const status = conn?.status || "DISCONNECTED";
            const statusClass =
              status === "CONNECTED"
                ? "bg-emerald-100 text-emerald-800"
                : status === "DEGRADED"
                  ? "bg-amber-100 text-amber-800"
                  : status === "DISABLED"
                    ? "bg-rose-100 text-rose-800"
                    : "bg-zinc-100 text-zinc-700";
            const anomaly =
              row.queue.backlogTotal > 40 ||
              row.delivery24h.failed > row.delivery24h.accepted ||
              !row.gateway.reachable;
            return (
              <div key={row.salonId} className="rounded-md border border-zinc-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{row.salonName}</p>
                  <span className={`rounded px-2 py-1 text-xs font-semibold ${statusClass}`}>{statusText(status)}</span>
                </div>
                <div className="mt-2 grid gap-2 text-xs text-zinc-700 md:grid-cols-3">
                  <p>Tecnologia: <strong>{providerText(conn?.providerType)}</strong></p>
                  <p>Errori consecutivi: <strong>{conn?.failureCount ?? 0}</strong></p>
                  <p>Blocco sicurezza: <strong>{row.killSwitchActive ? "ATTIVO" : "DISATTIVO"}</strong></p>
                  <p>Servizio raggiungibile: <strong>{row.gateway.reachable ? "SI" : "NO"}</strong></p>
                  <p>Stato tecnico: <strong>{row.gateway.rawStatus || "-"}</strong></p>
                  <p>QR disponibile: <strong>{row.gateway.qrAvailable ? "SI" : "NO"}</strong></p>
                  <p>In attesa: <strong>{row.queue.queued}</strong></p>
                  <p>In lavorazione: <strong>{row.queue.locked}</strong></p>
                  <p>Da ritentare: <strong>{row.queue.retryScheduled}</strong></p>
                  <p>Errori definitivi: <strong>{row.queue.failedPermanent}</strong></p>
                  <p>Inviati ultime 24h: <strong>{row.delivery24h.accepted}</strong></p>
                  <p>Errori ultime 24h: <strong>{row.delivery24h.failed}</strong></p>
                  <p>Ultimo controllo: <strong>{conn?.lastSeenAt ? new Date(conn.lastSeenAt).toLocaleString("it-IT") : "-"}</strong></p>
                  <p>Ultimo invio riuscito: <strong>{row.signals.lastAcceptedEvent?.createdAt ? new Date(row.signals.lastAcceptedEvent.createdAt).toLocaleString("it-IT") : "-"}</strong></p>
                  <p>Ultimo errore: <strong>{row.signals.lastErrorEvent?.createdAt ? new Date(row.signals.lastErrorEvent.createdAt).toLocaleString("it-IT") : "-"}</strong></p>
                  <p>Auto 24h: <strong>{row.automations.dayBeforeEnabled ? "ON" : "OFF"}</strong></p>
                  <p>Auto 1h: <strong>{row.automations.hourBeforeEnabled ? "ON" : "OFF"}</strong></p>
                  <p>Compleanno: <strong>{row.automations.birthdayEnabled ? "ON" : "OFF"}</strong></p>
                </div>
                {conn?.disabledReason ? (
                  <p className="mt-2 text-xs text-rose-700">Motivo: {conn.disabledReason}</p>
                ) : null}
                {!row.gateway.reachable && row.gateway.lastErrorCode ? (
                  <p className="mt-1 text-xs text-rose-700">
                    Errore collegamento: {row.gateway.lastErrorCode} {row.gateway.lastErrorMessage ? `- ${row.gateway.lastErrorMessage}` : ""}
                  </p>
                ) : null}
                {row.signals.lastErrorEvent?.reasonMessage ? (
                  <p className="mt-1 text-xs text-rose-700">
                    Ultimo errore: {row.signals.lastErrorEvent.reasonMessage}
                  </p>
                ) : null}
                {anomaly ? (
                  <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">
                    Attenzione: coda alta o troppi errori nelle ultime 24 ore.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="space-y-3 p-4 sm:p-5">
        <h2 className="text-base font-semibold">Messaggi automatici</h2>
        <p className="text-xs text-zinc-500">
          Campi dinamici disponibili: %nome_cliente% %nome_pet% %data_appuntamento% %orario_appuntamento% %nome_attivita% %indirizzo_attivita%
        </p>
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
          La conferma prenotazione parte automaticamente quando WhatsApp è collegato.
        </div>
        <div className="space-y-2 rounded-md border border-zinc-200 p-3">
          <p className="text-xs font-medium text-zinc-700">Messaggio conferma immediata dopo prenotazione</p>
          <Textarea
            value={salon.whatsappBookingTemplate || ""}
            onChange={(e) => setSalon({ ...salon, whatsappBookingTemplate: e.target.value })}
            placeholder={RECOMMENDED_BOOKING_TEMPLATE}
            className="min-h-[100px]"
          />
        </div>
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
                whatsappBookingTemplate: RECOMMENDED_BOOKING_TEMPLATE,
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

      <Card className="space-y-3 p-4 sm:p-5">
        <h2 className="text-base font-semibold">Invii di servizio</h2>
        <div
          className={`rounded-md border p-3 text-sm ${
            channelReady ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {channelReady
            ? "Può inviare comunicazioni utili ai clienti in modo controllato e tracciato."
            : "WhatsApp non è collegato: prima attivi il collegamento, poi potrà inviare."}
        </div>

        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
          In questa sezione il marketing è disattivato: sono consentiti solo invii legati al servizio del salone.
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-600">Titolo invio</p>
            <Input value={campaignTitle} onChange={(e) => setCampaignTitle(e.target.value)} placeholder="Es. Aggiornamento orari estivi" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-600">Clienti considerati (mesi)</p>
            <Input type="number" min="1" max="36" value={campaignMonthsBack} onChange={(e) => setCampaignMonthsBack(e.target.value)} />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-600">Tipo invio</p>
            <div className="flex h-10 items-center rounded-md border border-zinc-300 bg-zinc-50 px-3 text-sm font-semibold text-zinc-800">
              Servizio
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
          placeholder="Scriva il testo da inviare. Campi disponibili: %nome_cliente% %nome_attivita%"
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
          <Button onClick={createCampaign} disabled={campaignLoading || !channelReady}>
            {campaignLoading ? "Invio in corso..." : "Crea e invia"}
          </Button>
          <Button variant="outline" onClick={loadCampaigns} disabled={campaignLoading}>
            Aggiorna storico
          </Button>
        </div>

        <div className="space-y-2">
          {campaigns.length === 0 ? <p className="text-sm text-zinc-500">Nessuno storico invii presente.</p> : null}
          {campaigns.map((row) => {
            const remaining = Math.max(0, row.totalRecipients - row.sentCount - row.skippedCount);
            return (
              <div key={row.id} className="rounded-md border border-zinc-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {row.title} - {row.type === "MARKETING" ? "Marketing (disattivato)" : "Servizio"}
                  </p>
                  <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">{campaignStatusText(row.status)}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-600">
                  Totale: {row.totalRecipients} | Inviati: {row.sentCount} | Falliti: {row.failedCount} | Saltati: {row.skippedCount}
                </p>
                <p className="text-xs text-zinc-600">Restano da inviare: {remaining}</p>
                <p className="text-xs text-zinc-500">Creata: {new Date(row.createdAt).toLocaleString("it-IT")}</p>
                {row.status !== "COMPLETED" && row.type !== "MARKETING" ? (
                  <Button variant="outline" className="mt-2" onClick={() => dispatchCampaign(row.id)} disabled={campaignLoading || !channelReady}>
                    Continua invio
                  </Button>
                ) : null}
                {row.type === "MARKETING" ? (
                  <p className="mt-2 text-xs text-amber-700">
                    Questo tipo di invio non è più attivo nella piattaforma.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
          <p className="font-semibold">Ultimi eventi di invio</p>
          <div className="mt-2 space-y-1">
            {(diagnostics?.recentEvents || []).length === 0 ? <p>Nessun evento recente.</p> : null}
            {(diagnostics?.recentEvents || []).map((event, idx) => (
              <p key={`${event.createdAt}-${idx}`}>
                {new Date(event.createdAt).toLocaleString("it-IT")} - {event.eventType} - {event.status}
                {event.reasonCode ? ` (${event.reasonCode})` : ""}
              </p>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
