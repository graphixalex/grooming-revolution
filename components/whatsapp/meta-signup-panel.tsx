"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSignupAttempt } from "@/lib/meta-signup-attempt";
type Bootstrap = { appId: string; configurationId: string; graphVersion: string; state: string };
type Connection = { id: string; providerType: "LINKED_SESSION" | "LEGACY_META" | "META_EMBEDDED"; status: "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "DEGRADED" | "EXPIRED" | "DISABLED"; failureCount: number };
type Result = { salon: Record<string, unknown>; connection: Connection };
declare global {
  interface Window {
    FB?: { init(options: Record<string, unknown>): void; login(callback: (value: { authResponse?: { code?: string } }) => void, options: Record<string, unknown>): void };
    fbAsyncInit?: () => void;
  }
}
// Meta's message event carries no verified application attempt ID in the available contract.
// One launch per document prevents a previous popup's delayed FINISH from joining a new code.
let launchedInDocument = false;
async function loadSdk(config: Bootstrap) {
  if (!window.FB) await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("meta_sdk_timeout")), 15000);
    window.fbAsyncInit = () => { clearTimeout(timer); resolve(); };
    const existing = document.getElementById("facebook-jssdk");
    if (existing) return;
    const script = document.createElement("script");
    script.id = "facebook-jssdk"; script.async = true; script.defer = true;
    script.src = "https://connect.facebook.net/it_IT/sdk.js";
    script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error("meta_sdk_unavailable")); };
    document.body.appendChild(script);
  });
  if (!window.FB) throw new Error("meta_sdk_unavailable");
  window.FB.init({ appId: config.appId, version: config.graphVersion, xfbml: false, autoLogAppEvents: false });
}
async function post<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch("/api/whatsapp/embedded-signup/" + path, {
    method: "POST", headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(90000),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(typeof json.error === "string" ? json.error : "meta_request_failed");
  return json as T;
}
export function MetaSignupPanel({ connected, onConnected }: { connected: boolean; onConnected: (result: Result) => void }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [pin, setPin] = useState("");
  const active = useRef(false);
  const mounted = useRef(true);
  const cleanup = useRef<(() => void) | null>(null);
  const bootstrapRef = useRef<Bootstrap | null>(null);
  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    if (connected) {
      bootstrapRef.current = null;
      setReady(false);
      return () => { cancelled = true; mounted.current = false; cleanup.current?.(); };
    }
    async function prepare() {
      try {
        const bootstrap = await post<Bootstrap>("start");
        await loadSdk(bootstrap);
        if (!cancelled && mounted.current) {
          bootstrapRef.current = bootstrap;
          setReady(true);
        }
      } catch (error) {
        if (!cancelled && mounted.current) {
          const code = error instanceof Error ? error.message : "";
          setMessage(code === "meta_disconnect_current_provider_first"
            ? "Scollega prima il collegamento WhatsApp attuale, poi ricarica questa pagina per collegare Meta."
            : code === "meta_pending_messages"
              ? "Prima di cambiare provider completa o svuota i messaggi WhatsApp ancora in attesa."
              : "Meta non è pronto. Verificare la configurazione e ricaricare la pagina.");
        }
      }
    }
    void prepare();
    const refresh = window.setInterval(() => {
      if (!active.current && !launchedInDocument) {
        setReady(false);
        void prepare();
      }
    }, 10 * 60 * 1000);
    return () => {
      cancelled = true; mounted.current = false; window.clearInterval(refresh); cleanup.current?.();
    };
  }, [connected]);
  function start() {
    if (active.current || !ready) return;
    if (!/^\d{6}$/.test(pin)) {
      setMessage("Scegli un PIN Meta di 6 cifre prima di continuare.");
      return;
    }
    active.current = true; setBusy(true); setMessage("");
    const bootstrap = bootstrapRef.current;
    try {
      if (launchedInDocument) throw new Error("meta_reload_required");
      if (!bootstrap || !window.FB) throw new Error("meta_sdk_unavailable");
      // FB.login must stay in the synchronous user-click call stack or browsers may block its popup.
      launchedInDocument = true;
      const attempt = createSignupAttempt();
      let source: MessageEventSource | null = null;
      const listener = (event: MessageEvent) => {
        if (!["https://www.facebook.com", "https://web.facebook.com", "https://business.facebook.com"].includes(event.origin) || !event.source) return;
        let value: unknown = event.data;
        if (typeof value === "string") { try { value = JSON.parse(value); } catch { return; } }
        if (!value || typeof value !== "object" || (value as Record<string, unknown>).type !== "WA_EMBEDDED_SIGNUP") return;
        if (source && source !== event.source) return attempt.fail("meta_ambiguous_result");
        source = event.source; attempt.event(value);
      };
      window.addEventListener("message", listener);
      const timeout = setTimeout(() => attempt.fail("meta_signup_timeout"), 15 * 60 * 1000);
      cleanup.current = () => {
        window.removeEventListener("message", listener); clearTimeout(timeout);
        attempt.fail("meta_cancelled");
      };
      // config_id/code contract only. No guessed v4 or sessionInfoVersion extras.
      // The builder's session-v3 launch contract requires verification before a real test.
      try {
        window.FB.login(response => attempt.oauth(response.authResponse?.code), {
          config_id: bootstrap.configurationId, auth_type: "rerequest",
          response_type: "code", override_default_response_type: true,
        });
      } catch { attempt.fail("meta_sdk_unavailable"); }
      void attempt.result
        .then(async result => {
          cleanup.current?.(); cleanup.current = null;
          onConnected(await post<Result>("complete", { ...result, state: bootstrap.state, pin }));
          if (mounted.current) setMessage("Meta collegato. Sono supportati messaggi di testo nella finestra di assistenza; i template Meta non sono ancora disponibili.");
        })
        .catch(error => {
          if (!mounted.current) return;
          const code = error instanceof Error ? error.message : "";
          setMessage(code === "meta_cancelled" ? "Collegamento annullato. Ricaricare la pagina prima di riprovare." :
            code === "meta_phone_not_verified" ? "Il numero non risulta ancora verificato in Meta." :
            code === "meta_phone_registration_failed" ? "Meta non ha completato la registrazione del numero. Ricaricare la pagina e riprovare." :
            code === "meta_pending_messages" ? "Sono presenti messaggi in attesa. Completare gli invii prima di cambiare provider." :
            code === "meta_disconnect_current_provider_first" ? "Disconnettere il provider corrente prima di collegare Meta." :
            "Collegamento non completato. Verificare la configurazione e ricaricare la pagina prima di riprovare.");
        })
        .finally(() => {
          cleanup.current?.(); cleanup.current = null; active.current = false;
          if (mounted.current) { setPin(""); setBusy(false); }
        });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setMessage(code === "meta_reload_required" ? "Ricaricare la pagina prima di avviare un nuovo collegamento Meta." :
        "Collegamento non completato. Verificare la configurazione e ricaricare la pagina prima di riprovare.");
      active.current = false; setBusy(false);
    }
  }
  async function disconnect() {
    if (active.current || !confirm("Rimuovere le credenziali Meta da questa sede? Questa azione non revoca le autorizzazioni nell'account Meta.")) return;
    active.current = true; setBusy(true); setMessage("");
    try {
      onConnected(await post<Result>("disconnect"));
      setMessage("Credenziali rimosse dal gestionale. Il collegamento QR è disponibile.");
    } catch { setMessage("Disconnessione non completata. Verificare permessi e messaggi ancora in attesa."); }
    finally { active.current = false; setBusy(false); }
  }
  return <div className="space-y-2 rounded-md border border-emerald-200 p-3 text-sm">
    <p className="font-semibold">WhatsApp ufficiale Meta</p>
    <p>Il gestionale conserva gli identificativi del numero e un token cifrato per questa sede.</p>
    <p>Reminder e campagne fuori dalla finestra di assistenza richiedono template Meta, non disponibili in questa release.</p>
    {!connected ? <div className="max-w-xs space-y-1">
      <label className="text-xs font-medium" htmlFor="meta-two-step-pin">PIN Meta a 6 cifre</label>
      <Input id="meta-two-step-pin" type="password" inputMode="numeric" autoComplete="off" maxLength={6}
        value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="••••••" disabled={busy} />
      <p className="text-xs text-zinc-500">Scegli e conserva questo PIN: Meta lo usa per la verifica in due passaggi del numero. Grooming Revolution non lo salva.</p>
    </div> : null}
    <Button onClick={start} disabled={busy || connected || !ready || !/^\d{6}$/.test(pin)}>Collega Meta</Button>{" "}
    <Button variant="outline" onClick={disconnect} disabled={busy || !connected}>Scollega Meta</Button>
    {message ? <p role="status">{message}</p> : null}
  </div>;
}
