# AUDIT COMPLETO - Grooming Revolution

Data audit: 2026-03-27  
Auditor: Analisi tecnica completa su codebase workspace `c:\Users\aleco\Desktop\gestionale`

## 1) Panoramica generale del progetto
Grooming Revolution è un SaaS multi-tenant per saloni di toelettatura. Copre agenda operativa, clienti/cani, listino con regole prezzo, moduli consenso/anamnesi/feltri con firma, booking online pubblico, WhatsApp automation/campaigns, cassa, report, billing Paddle e area admin piattaforma.

Architettura prevalente: monolite Next.js App Router (UI + API server), PostgreSQL con Prisma.

## 2) Stack tecnologico rilevato
- Frontend: Next.js 16, React 19, TypeScript, Tailwind 4, componenti UI custom.
- Backend: API Routes Next.js (`app/api/**`), logica server in `lib/**`.
- Auth: NextAuth Credentials (JWT session strategy), bcryptjs.
- DB: PostgreSQL + Prisma ORM.
- Billing: Paddle API + webhook firmato.
- Messaging: WhatsApp Cloud API (Meta) + fallback manuale `wa.me`.
- Email: Resend.
- Rate limiting: Upstash Redis (con fallback in-memory).
- PDF: pdf-lib (export moduli firmati).
- Deploy target: Vercel (cron configurati in `vercel.json`).

## 3) Struttura directory e componenti principali
- `app/(protected)/*`: pagine operative autenticazione richiesta.
- `app/api/*`: endpoint backend (appointments, clients, settings, booking, cron, billing...).
- `components/*`: client UI (planner, settings, whatsapp, clients, booking pubblico, reports).
- `lib/*`: regole business, auth/session, rbac, pricing, booking engine, reminders, billing, sicurezza.
- `prisma/schema.prisma`: modello dati completo.
- `prisma/migrations/*`: storico migrazioni.
- `proxy.ts`: controllo accesso route pubbliche/private.

## 4) Funzionamento generale del sistema
1. Utente autenticato via NextAuth Credentials.
2. Sessione risolta con sede attiva (`active_salon_id` cookie) e controllo gruppo multi-sede.
3. Frontend chiama API interne per CRUD e azioni operative.
4. Planner crea/aggiorna appuntamenti, incassi e invii WhatsApp.
5. Booking pubblico crea richieste (o auto-conferma trusted clients).
6. Cron inviano reminder WhatsApp automatici (giorno prima / 1h prima / compleanno cane).
7. Paddle webhook aggiorna stato abbonamento e pagamenti subscription.

## 5) Analisi backend
Punti forti:
- API abbastanza coerenti su tenant isolation (`salonId` in quasi tutte le query).
- Validazioni Zod su molte operazioni critiche (auth, pricing, moduli, appuntamenti).
- Uso transaction + isolation `Serializable` in flussi sensibili (incasso, booking approval).
- Fallback migration-safe in diversi endpoint (`P2021/P2022`).

Debolezze:
- Alcuni endpoint patch usano `updateMany` (ritornano count, non entità), con coerenza API non uniforme.
- Rate limit login/register/forgot è in-memory locale, non distribuito.
- Alcune logiche sono duplicate tra frontend e backend (template, mapping operatori/orari).

## 6) Analisi frontend
Punti forti:
- Planner molto ricco (sequenze, preview, overlap controlled, operatore per riga, note personali).
- UX business completa su moduli legali con firma tablet e storico PDF.
- Messaggi booking workflow strutturato (pending/approve/reject/update).

Debolezze:
- `planner-client.tsx` è un file molto grande (>100KB), alta complessità e alto rischio regressioni.
- Molto uso di `any` in componenti core (`settings-client`, dashboard, client detail, whatsapp client).
- Incoerenze testo business in UI/README (limite trial clienti).

## 7) Analisi database / modelli dati / file storage
- Modello dati ampio e ben normalizzato per dominio grooming.
- Soft delete su Client/Dog/Appointment.
- Tracciamento evidenze firma con hash + snapshot legale.
- Logging reminders e campagne WhatsApp con status/attempt.
- Nessuno storage file esterno: firma salvata come data URL in DB (costo storage DB potenzialmente alto nel lungo periodo).

## 8) Analisi autenticazione, sessioni, ruoli, permessi
- Ruoli: OWNER / MANAGER / STAFF.
- STAFF bloccato su molte aree (settings/billing/reports/branches).
- Multi-sede: OWNER o utenti con `canAccessGroupSalons` possono cambiare sede nel gruppo.
- Risoluzione sede attiva corretta via cookie + verifica gruppo.

Criticità importante:
- Login con email duplicate su sedi diverse non supportato: `authorize` richiede un solo match globale per email+password.

## 9) Analisi sicurezza
Controlli presenti:
- Security headers forti in `next.config.ts` (CSP, HSTS, XFO, ecc.).
- Verifica firma webhook Paddle + idempotenza anti-replay.
- Sanitizzazione CSV export contro formula injection.
- Validazione input diffusa.

Rischi:
- `.env.example` contiene credenziali Paddle live-like (esposizione segreti in repository).
- Cron route `whatsapp-hour-before` non è tra le public routes nel proxy (blocco funzionale/sicurezza di routing).
- Fallback rate-limit in-memory in ambiente serverless non affidabile.

## 10) Analisi performance
- Query principali indicizzate in schema Prisma.
- Alcuni endpoint fanno fetch molto ampi (es. planner week + include multipli, report aggregazioni in app-level).
- Report avanzati calcolano parecchia logica in memoria dopo query bulk.
- Planner carica e ricalcola molti state locali; potenziale degrado su dataset grandi.

## 11) Analisi scalabilità
Limiti attuali:
- Monolite con logica intensa lato API route.
- Alcuni workload batch (campaign dispatch/reminders) sincroni, senza coda job.
- Nessuna shard/queue/event bus; crescita multi-salone può impattare latenza cron/report.

## 12) Analisi qualità del codice
- Buona separazione `lib` vs route/component in vari moduli.
- Complessità elevata in alcuni file chiave (planner/settings/reports).
- Type safety non omogenea (`any` diffusi).
- Alcuni testi con encoding rotto (accenti visualizzati male in output server/build log).

## 13) Bug trovati (con impatto)

### Bug 1 - Segreti sensibili in `.env.example`
- File coinvolti: `.env.example`
- Problema: presenti valori Paddle con formato live/sandbox reale.
- Rischio reale: fuga credenziali, abuso API billing, rischio economico/compliance.
- Gravità: **Alta**
- Soluzione: sostituire con placeholder fittizi, ruotare subito tutte le chiavi esposte.

### Bug 2 - Cron 1h prima non whitelisted dal proxy
- File coinvolti: `proxy.ts`, `app/api/cron/whatsapp-hour-before/route.ts`
- Problema: `publicRoutes` include solo `/api/cron/whatsapp-reminders`, non `/api/cron/whatsapp-hour-before`.
- Rischio reale: job reminder 1h può essere rediretto a login e non eseguito.
- Gravità: **Alta**
- Soluzione: aggiungere route cron mancante in `publicRoutes`.

### Bug 3 - Login bloccato con email duplicata su più sedi
- File coinvolti: `lib/auth.ts`, `prisma/schema.prisma`
- Problema: query `findMany` su email, login valido solo se match count === 1.
- Rischio reale: utenti con stessa email su più salon non possono accedere.
- Gravità: **Alta**
- Soluzione: rendere email globalmente unica oppure introdurre login con selezione sede + vincolo coerente.

### Bug 4 - Rate limiting auth non distribuito
- File coinvolti: `lib/rate-limit.ts`, `lib/auth.ts`, `app/api/auth/forgot-password/route.ts`, `app/api/register/route.ts`
- Problema: limiter in-memory per login/register/forgot.
- Rischio reale: bypass su istanze multiple/serverless cold-start.
- Gravità: **Alta**
- Soluzione: usare Upstash/Redis anche per auth limiter.

### Bug 5 - Reminder orario non timezone-safe
- File coinvolti: `lib/reminders.ts`, `app/api/cron/whatsapp-reminders/route.ts`, `app/api/cron/whatsapp-hour-before/route.ts`
- Problema: `date-fns format` usa timezone runtime, non timezone salone.
- Rischio reale: ora/data in messaggio non coerente con sede.
- Gravità: **Media**
- Soluzione: formattazione timezone-aware (`Intl.DateTimeFormat` con timeZone salone).

### Bug 6 - Incoerenza trial clienti (50 vs 100)
- File coinvolti: `README.md`, `lib/business-rules.ts`, `app/api/clients/route.ts`, `app/(protected)/billing/page.tsx`
- Problema: documentazione e UI non allineate alla regola effettiva (`50`).
- Rischio reale: confusione commerciale, contestazioni clienti.
- Gravità: **Media**
- Soluzione: uniformare copy e logica in un’unica costante centralizzata.

### Bug 7 - Aggiornamenti PATCH non uniformi (ritorno `count`)
- File coinvolti: `app/api/clients/[id]/route.ts`, `app/api/dogs/[id]/route.ts`
- Problema: `updateMany` restituisce count, non record aggiornato.
- Rischio reale: bug UI/integrazione, comportamento API poco prevedibile.
- Gravità: **Media**
- Soluzione: usare `update` quando possibile o standardizzare response shape.

### Bug 8 - Booking pubblico non normalizza bene telefono
- File coinvolti: `app/api/public/booking/[slug]/request/route.ts`
- Problema: `normalizePhone` rimuove solo spazi; no normalizzazione internazionale robusta.
- Rischio reale: duplicati cliente e matching trust flag errato.
- Gravità: **Media**
- Soluzione: usare normalizzazione comune (`lib/reminders.normalizePhone` o E.164 dedicato).

### Bug 9 - Report con valori monetari hardcoded EUR in alcune metriche
- File coinvolti: `app/(protected)/reports/page.tsx`, `app/(protected)/operator-reports/page.tsx`
- Problema: alcune card usano stringhe `EUR` anche in contesto multi-valuta.
- Rischio reale: lettura KPI falsata.
- Gravità: **Media**
- Soluzione: renderizzare sempre per currency aggregata (come fatto in dashboard/payments).

### Bug 10 - Complessità estrema `planner-client.tsx`
- File coinvolti: `components/planner/planner-client.tsx`
- Problema: file monolitico con troppe responsabilità.
- Rischio reale: regressioni, manutenzione lenta, bug difficili da isolare.
- Gravità: **Media**
- Soluzione: estrarre moduli (slot logic, modal, sequence, rendering agenda, reminders).

### Bug 11 - Nessun controllo upload dimensione file import CSV/VCF
- File coinvolti: `app/api/clients/import/route.ts`
- Problema: file letto in memoria senza limite esplicito.
- Rischio reale: consumo memoria/DoS applicativo.
- Gravità: **Media**
- Soluzione: limite size lato request e parser stream.

### Bug 12 - Fallback analytics salt debole
- File coinvolti: `app/api/public/analytics/track/route.ts`
- Problema: se manca `ANALYTICS_SALT` e `NEXTAUTH_SECRET`, usa salt statico default.
- Rischio reale: hash IP meno robusto e prevedibile.
- Gravità: **Bassa**
- Soluzione: rendere salt obbligatorio in produzione.

## 14) Funzioni incomplete o dubbie
- `PaymentsClient`: uscite sempre `0.00 (struttura pronta MVP)` -> modulo parziale.
- `Billing` pagina: sezione invoice/receipt dichiarata MVP non implementata.
- `public booking` richiede piano non FREE: coerente business, ma limitante onboarding demo.
- In alcune aree presenti fallback legacy migration; utile ma aumenta complessità e rami poco testati.

## 15) Dipendenze critiche
- `next`, `react`, `@prisma/client`, `prisma`, `next-auth`, `@upstash/*`, `resend`, `pdf-lib`, `date-fns`.
- Nota: Prisma 6.19.2 con avviso upgrade major a v7 (da gestire con piano migrazione dedicato).

## 16) Rischi tecnici e business-critical
- Rischio operativo reminder (cron route non pubblica).
- Rischio sicurezza segreti esposti.
- Rischio auth multi-sede con email duplicate.
- Rischio KPI errati multi-valuta.
- Rischio regressioni per complessità frontend planner.

## 17) Priorità (Alta / Media / Bassa)
Alta:
1. Rimuovere/ruotare segreti da `.env.example`.
2. Fix whitelist cron `/api/cron/whatsapp-hour-before`.
3. Correggere modello login multi-sede/email.
4. Spostare rate-limit auth su Redis distribuito.

Media:
5. Timezone-safe nei template reminder.
6. Uniformare regola trial (50 vs 100).
7. Standardizzare response PATCH su update singolo.
8. Normalizzazione telefono robusta in booking pubblico.
9. Correzione KPI multi-valuta report.
10. Refactor modulare planner-client.
11. Limiti upload import.

Bassa:
12. Rendere salt analytics obbligatorio in prod.
13. Ridurre `any` e migliorare tipizzazione.

## 18) Azioni consigliate finali
1. Security hotfix immediato: segreti, cron whitelist, hardening env obbligatorie.
2. Stabilità auth: ridefinire policy email (globale unica o user-sede esplicito).
3. Reliability reminder: test end-to-end cron in production (giorno prima + 1h + compleanni).
4. Data quality: normalizzazione telefono centralizzata e dedup clienti.
5. Reporting correctness: multi-currency unificata su tutte le metriche.
6. Refactor tecnico: spezzare planner/settings in moduli e ridurre `any`.
7. Operatività: introdurre queue/job runner per campagne WhatsApp e cron pesanti.
8. Compliance: review legale testi statici e flussi consenso per paese.

## Aggiornamento 2026-03-27 - Stato Bug 1 (.env.example)
- Corretto: i valori sensibili presenti in .env.example sono stati sostituiti con placeholder sicuri.
- Rischio residuo: ruotare le chiavi eventualmente gia esposte nei provider esterni (es. Paddle).


## Aggiornamento 2026-03-27 - Stato Bug 2 (cron 1 ora prima)
- Corretto: aggiunta la route /api/cron/whatsapp-hour-before tra le public routes in proxy.ts.
- Verifica: ercel.json include gia il cron, quindi ora whitelist proxy e scheduler sono allineati.


## Aggiornamento 2026-03-27 - Stato Bug 5 (reminder timezone)
- Corretto: eminderVariables in lib/reminders.ts ora formatta data/ora in base alla timezone del salone con Intl.DateTimeFormat.
- Corretto: i cron whatsapp-reminders e whatsapp-hour-before passano esplicitamente salon.timezone al render dei template reminder.
- Allineamento fallback: timezone di default unificata a Europe/Zurich.


## Aggiornamento 2026-03-27 - Stato Bug 3 (login email duplicate multi-sede)
- Corretto: introdotta unicita globale su User.email nel modello Prisma (email @unique) e rimossa unicita composta @@unique([salonId, email]).
- Corretto: login (lib/auth.ts) ora usa lookup univoco per email (indUnique) + verifica password singolo utente.
- Corretto: forgot-password (pp/api/auth/forgot-password/route.ts) ora usa lookup univoco per email (indUnique).
- Allineamento: register/settings e seed aggiornati per coerenza con unicita globale email.


## Aggiornamento 2026-03-27 - Stato Bug 4 (rate limiting auth non distribuito)
- Corretto: login/register/forgot-password usano rate limiting distribuito Redis (Upstash) con chiavi dedicate auth.
- Corretto: login mantiene logica failed-only counters (ip+email e email) con reset su login riuscito.
- Corretto: aggiunto pre-check request-level per IP su login e limiter distribuito IP+email su register/forgot-password.
- Fallback: mantenuto fallback tecnico in-memory con log espliciti di stato degradato in produzione.


## Aggiornamento 2026-03-27 - Stato Bug 8 (normalizzazione telefono booking pubblico)
- Corretto: introdotta utility centralizzata lib/phone.ts per normalizzazione telefono canonica e matching compatibile legacy.
- Corretto: pp/api/public/booking/[slug]/request/route.ts ora usa normalizzazione robusta e candidate matching temporaneo per anti-spam/matching/trust flag.
- Corretto: pp/api/booking-requests/route.ts allinea la creazione cliente in approvazione usando numero canonico.
- Allineamento: lib/reminders.ts ora delega la normalizzazione telefono alla utility centralizzata.


## Aggiornamento 2026-03-27 - Stato Bug 6 (incoerenza trial clienti 50 vs 100)
- Corretto: introdotta single source of truth FREE_PLAN_MAX_CLIENTS = 50 in lib/plan-limits.ts.
- Corretto: backend allineato (lib/business-rules.ts, pp/api/clients/route.ts, pp/api/clients/import/route.ts).
- Corretto: UI e documentazione allineate al valore 50 (illing, landing, egister, homepage FAQ schema, README.md).


## Aggiornamento 2026-03-27 - Stato Bug 13 (bypass limite FREE su client tecnico agenda)
- Corretto: il conteggio limite FREE ora esclude il client tecnico usato per le note personali agenda (`telefono = "__NOTE__"`).
- Corretto: allineato anche il conteggio preliminare dell'import clienti FREE, con la stessa esclusione del client tecnico.
- Impatto: la creazione nota personale non consuma più uno slot cliente reale; il limite commerciale resta 50 clienti reali.

## Aggiornamento 2026-03-27 - UX limite Free (50 clienti)
- Migliorata UX frontend su blocco limite Free nei flussi principali: pagina clienti, planner (nuovo cliente e cliente di passaggio) e import clienti.
- Quando il backend restituisce errore di limite raggiunto, ora viene mostrato un banner contestuale con spiegazione chiara e CTA a /billing.
- Nota: la logica backend non è stata modificata; intervento solo UX lato frontend.

## Aggiornamento 2026-03-27 - Stato Bug 9 (KPI/report multi-valuta)
- Corretto: rimosse visualizzazioni monetarie hardcoded in EUR nelle pagine report principali (`/reports`, `/operator-reports`).
- Corretto: le metriche monetarie principali ora usano aggregazione e rendering per valuta (`aggregateByCurrency` + `formatCurrencyTotals`).
- Nota: restano alcuni hardcode EUR in moduli non-report (cash/detail) da uniformare in step dedicato.

## Aggiornamento 2026-03-27 - Stato Bug 7 (PATCH non uniformi client/cani)
- Corretto: `app/api/clients/[id]/route.ts` PATCH non usa più `updateMany` con ritorno `count`; ora effettua tenant check esplicito e restituisce il record `Client` aggiornato.
- Corretto: `app/api/dogs/[id]/route.ts` PATCH non usa più `updateMany` con ritorno `count`; ora effettua tenant check esplicito e restituisce il record `Dog` aggiornato (con `cliente` e `tagRapidi.quickTag`).
- Coerenza: entrambe le route ora rispondono 404 quando il record non esiste/non appartiene alla sede/non è attivo.

## Aggiornamento 2026-03-27 - DELETE uniformi client/cani
- Corretto: `app/api/clients/[id]/route.ts` DELETE allineata al pattern tenant-safe con pre-check, 404 su record non trovato/non accessibile e risposta uniforme con `ok`, `id`, `deletedAt`.
- Corretto: `app/api/dogs/[id]/route.ts` DELETE allineata allo stesso pattern (pre-check, 404 coerente, risposta uniforme con metadati soft delete).
- Coerenza: PATCH e DELETE su client/cani ora condividono semantica not-found prevedibile e controllo tenant esplicito.

## Aggiornamento 2026-03-27 - Performance homepage (mobile-first)
- Corretto: eliminato re-render continuo causato dal listener `mousemove` con state update ad alta frequenza; ora aggiornamento glow via `requestAnimationFrame` su ref DOM.
- Corretto: introdotta modalità low-motion su mobile / `prefers-reduced-motion` per ridurre animazioni decorative costose (particelle, loop infiniti background, parallax hero), senza cambiare layout percepito.
- Corretto: ottimizzato scheduling immagini home (`sizes` aggiunti; rimossa priorità non necessaria sulla hero screenshot, mantenuta priorità logo header).
- Corretto: alleggeriti listener scroll/counter per ridurre lavoro main-thread e migliorare TBT/INP/LCP su dispositivi mobili.

## Aggiornamento 2026-03-28 - WhatsApp Embedded Signup (popup non avviato / stato bloccato)
- Corretto: il callback passato a `FB.login` e ora una funzione normale (non `async`), con gestione asincrona interna controllata.
- Corretto: il flow di click non fa piu bootstrap critico in ritardo; sessione/signup SDK vengono pre-inizializzati e il bottone resta disabilitato finche non pronto.
- Corretto: gestione UX dello stato con reset garantito (`finish` + timeout guard + cleanup listener), evitando blocchi su "Collegamento in corso...".
- Corretto: env server-side per Meta allineata con supporto `META_APP_ID` (fallback `NEXT_PUBLIC_META_APP_ID`).
- Corretto: CSP allineata ai domini Meta necessari (`connect.facebook.net`, `graph.facebook.com`, frame/form Facebook).

## Aggiornamento 2026-03-29 - Refactor WhatsApp mission-critical (queue + transport + backend automation)
- Corretto: introdotto transport layer provider-agnostic (`lib/whatsapp-transport.ts`) con adapter `LINKED_SESSION` e `LEGACY_META` (temporaneo).
- Corretto: introdotta outbound queue persistente con lock, dedup key, retry con backoff+jitter, eventi delivery e health update connessione (`lib/whatsapp-queue.ts`).
- Corretto: booking confirmation ora viene enqueued server-side alla creazione appuntamento (route appuntamenti standard, bulk e approvazione booking request), non dipende piÃ¹ da trigger frontend manuale.
- Corretto: cron reminder giorno prima, reminder 1h e compleanni convertiti da invio diretto a enqueue + worker drain (`/api/cron/whatsapp-reminders`, `/api/cron/whatsapp-hour-before`).
- Corretto: aggiunta route cron dedicata al drain coda (`/api/cron/whatsapp-queue-dispatch`) e relativo schedule Vercel/whitelist proxy.
- Corretto: campagne WhatsApp migrate su enqueue (no invio diretto provider nella route dispatch), con sincronizzazione stato recipient/campagna dal worker.
- Corretto: endpoint `/api/whatsapp/send` ora accoda sempre in coda persistente; fallback manuale solo se canale non operativo.
- Corretto: introdotto modello operativo connessione WhatsApp via linked session con endpoint provider-agnostico (`/api/whatsapp/connection`) e diagnostica reale coda/errori.
- Corretto: UI WhatsApp aggiornata a stato connessione reale + pairing code/QR payload + diagnostica + automazioni; copy Meta-centrica rimossa.
- Corretto: endpoint Embedded Signup Meta marcati deprecati (HTTP 410), CSP Meta rimossa e variabili env linked gateway aggiunte in `.env.example`.

## Aggiornamento 2026-03-29 - Diagnostics/Admin + Hardening operativo WhatsApp
- Corretto: introdotto endpoint diagnostico aggregato `/api/whatsapp/diagnostics` con metriche per sede/gruppo (queue backlog, accepted/failure 24h, ultimo evento/successo/errore, kill-switch status, heartbeat).
- Corretto: UI WhatsApp aggiornata con pannello diagnostics operativo (badge stato, avvisi backlog anomalo/failure ratio, stato automazioni, errore utile recente, indicatori kill-switch).
- Corretto: introdotto controllo kill-switch manuale via `/api/whatsapp/connection` (`PATCH` enable/disable).
- Corretto: auto-protezione worker migliorata con passaggio a `DISABLED` su burst errori consecutivi (kill-switch automatico).
- Corretto: hardening reminder su appuntamenti modificati: cancellazione invii in coda su appointment cancellato e reset ledger reminder su cambio orario, con nuova conferma booking backend coerente.
- Corretto: prevenzione reminder obsoleti dopo cambio orario mediante verifica `appointmentStartAtIso` metadata prima dell'invio.

## Aggiornamento 2026-03-29 - Integrazione reale gateway VPS multi-sessione (per salone)
- Corretto: introdotto client server-side robusto verso gateway (`lib/whatsapp-gateway.ts`) con timeout, x-api-key server-side, reason codes coerenti, mapping retryable/non-retryable.
- Corretto: adapter `LINKED_SESSION` ora usa endpoint gateway per-salone (`/session/:salonId/send`) con isolamento multi-tenant garantito dal backend.
- Corretto: sostituita logica pairing fake locale con sync reale gateway in `lib/whatsapp-connection.ts` (init/status/qr/disconnect + sincronizzazione stato DB).
- Corretto: endpoint `/api/whatsapp/connection` ora governa init/sync/qr/disconnect usando il `salonId` della sessione autenticata (no input client arbitrario).
- Corretto: diagnostics aggregati per sede/gruppo estesi con stato gateway reale (`rawStatus`, `reachable`, `qrAvailable`, error code/message gateway).
- Corretto: UI WhatsApp aggiornata per flusso reale QR linked-session (avvio sessione, refresh QR, refresh stato, warning gateway down, badge stato chiari).
- Corretto: queue worker hardening aggiuntivo con sync status gateway prima del send per provider linked-session.
- Corretto: env canale operativo allineate a `WHATSAPP_LINKED_GATEWAY_URL` + `WHATSAPP_GATEWAY_API_KEY`.
- Corretto: runtime operativo non usa piÃ¹ Meta come canale attivo; campi `whatsappApi*` restano solo legacy transitorio.
