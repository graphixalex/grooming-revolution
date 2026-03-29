# WHATSAPP_DEPLOY_POST_RELEASE_CHECKLIST

## 1) Prerequisiti env
- `DATABASE_URL` e `DIRECT_URL` validi.
- `CRON_SECRET` impostato e uguale tra scheduler e route.
- `WHATSAPP_LINKED_GATEWAY_URL` impostata (obbligatoria per provider linked).
- `WHATSAPP_GATEWAY_API_KEY` impostata se richiesta dal gateway.
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` validi (rate limit auth, opzionale ma consigliato).

## 2) Migration DB
- Eseguire `npx prisma migrate deploy` in produzione.
- Verificare presenza tabelle:
  - `WhatsAppConnection`
  - `WhatsAppSession`
  - `WhatsAppOutboundMessage`
  - `WhatsAppDeliveryEvent`
- Verificare indici su status/nextAttemptAt/dedup key.

## 3) Cron attivi
- Verificare in Vercel:
  - `/api/cron/whatsapp-reminders` (giornaliero)
  - `/api/cron/whatsapp-hour-before` (ogni 15 min)
  - `/api/cron/whatsapp-queue-dispatch` (ogni 2 min)
- Verificare che ogni cron risponda `200` con `CRON_SECRET` corretto.

## 4) Proxy/route
- Verificare whitelist cron in `proxy.ts`:
  - `/api/cron/whatsapp-reminders`
  - `/api/cron/whatsapp-hour-before`
  - `/api/cron/whatsapp-queue-dispatch`
- Verificare che `/api/whatsapp/connection` e `/api/whatsapp/diagnostics` siano accessibili solo utenti autenticati autorizzati.

## 5) Build e smoke check
- `npm run lint` (warning noti non bloccanti ammessi solo se già noti).
- `npm run build` deve passare.
- Smoke API:
  - GET `/api/whatsapp/connection`
  - GET `/api/whatsapp/diagnostics`
  - GET cron queue dispatch con secret

## 6) Verifiche funzionali obbligatorie
- Creazione appointment: conferma prenotazione viene accodata automaticamente.
- Reminder 24h: cron accoda e worker drena.
- Reminder 1h: cron accoda e worker drena.
- Compleanno: accodamento rispettando toggle e dedup annuale.
- Cancellazione appointment: messaggi in coda collegati vengono `CANCELLED`.
- Spostamento appointment: reminder storici resettati e nuovi invii coerenti al nuovo orario.

## 7) Test failure mode
- Provider down / gateway URL mancante:
  - messaggi non spariscono
  - eventi failure loggati
  - status connessione degrada/kill-switch se error burst
- Test backlog:
  - backlog cresce quando provider down
  - backlog decresce quando provider torna operativo
- Test kill-switch:
  - attivazione manuale blocca invii
  - riabilitazione consente nuovo pairing/operatività

## 8) Osservabilità 24h / 48h
- Monitorare per ogni salone:
  - backlog (`QUEUED + LOCKED + RETRY_SCHEDULED`)
  - accepted/failure ultime 24h
  - failureCount connessione
  - eventuale `DISABLED` con `disabledReason`
- Alert manuali consigliati:
  - backlog > 40 per > 30 min
  - failure 24h > accepted 24h
  - kill-switch attivo

## 9) Segnali di regressione
- Nessun popup/manual trigger dal planner per conferma prenotazione.
- Nessun invio diretto cron/campagne bypassando queue.
- Nessun reminder duplicato su cron concorrenti.
- Nessun reminder errato dopo modifica/cancellazione appuntamento.

## 10) Rollback operativo
- Se degrado grave:
  1. Attivare kill-switch per saloni impattati.
  2. Bloccare temporaneamente cron queue-dispatch.
  3. Analizzare `WhatsAppDeliveryEvent` per reason code principali.
  4. Riattivare progressivamente dopo fix gateway/provider.
