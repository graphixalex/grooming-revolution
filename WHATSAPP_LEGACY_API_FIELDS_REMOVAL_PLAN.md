# WHATSAPP_LEGACY_API_FIELDS_REMOVAL_PLAN

## Obiettivo
Rimuovere in sicurezza i campi legacy `whatsappApi*` dopo stabilizzazione del nuovo sottosistema queue/transport linked-session.

## Campi legacy interessati (model `Salon`)
- `whatsappApiEnabled`
- `whatsappApiPhoneNumberId`
- `whatsappApiAccessToken`
- `whatsappApiVersion`
- `whatsappApiBusinessAccountId`
- `whatsappApiDisplayPhoneNumber`
- `whatsappApiConnectedAt`

## Dove sono ancora letti/usati
- `lib/whatsapp.ts` (adapter legacy Meta)
- `lib/whatsapp-queue.ts` (bootstrap connessione legacy se config Meta presente)
- `app/api/cron/whatsapp-reminders/route.ts` (query fallback con `whatsappApiEnabled`)
- `app/api/cron/whatsapp-hour-before/route.ts` (query fallback con `whatsappApiEnabled`)
- `app/api/settings/route.ts` (sezione templates: update condizionale campi legacy)
- `app/(protected)/whatsapp/page.tsx` (initial props legacy ancora presenti per compatibilità)

## Strategia di rimozione finale (step-by-step)

### Step 1 - Freeze legacy (già parziale)
- Embedded Signup Meta deprecato (`410`).
- UI principale orientata a linked-session.
- Nessun nuovo onboarding Meta.

### Step 2 - Cut traffic legacy
- Disabilitare `LEGACY_META` come provider selezionabile in produzione.
- In `getOrCreateWhatsAppConnection`, smettere di inferire provider da `whatsappApiEnabled`.
- Tenere monitoraggio 7-14 giorni su saloni attivi per verificare assenza dipendenza residua.

### Step 3 - Cleanup codice applicativo
- Rimuovere `lib/whatsapp.ts` e dipendenze da Graph API.
- Eliminare fallback `whatsappApiEnabled` dalle query cron.
- Rimuovere update/lettura campi legacy in settings/whatsapp page.
- Rimuovere env Meta non usate (`NEXT_PUBLIC_META_APP_ID`, `META_APP_ID`, `META_APP_SECRET`, `META_EMBEDDED_SIGNUP_CONFIGURATION_ID`, `META_GRAPH_API_VERSION`).
- Pulire CSP da domini Meta (già fatto, verificare nessuna regressione).

### Step 4 - Migration DB finale
- Nuova migration Prisma:
  - drop colonne `whatsappApi*` da `Salon`.
- Prima del deploy:
  - snapshot DB
  - verifica assenza query runtime che referenziano colonne legacy.

### Step 5 - Verifica post-migration
- `npm run build` e smoke test API WhatsApp.
- cron day-before/hour-before/queue-dispatch operativi.
- diagnostica mostra solo connection/provider moderni.

## Rischi regressione principali
- Saloni ancora su provider Meta non migrati al linked gateway.
- Route/cron che usano fallback legacy non completamente rimossi.
- Script/seed/documentazione che referenziano ancora campi `whatsappApi*`.

## Mitigazioni consigliate
- Feature flag di cutover (`WHATSAPP_LEGACY_META_ENABLED=false`).
- Report pre-cutover dei saloni con `providerType = LEGACY_META`.
- Finestra di dual-read breve solo in staging, non in produzione a lungo.

## Criteri go/no-go rimozione
- 0 saloni operativi con `providerType=LEGACY_META` per almeno 7 giorni.
- Failure ratio stabile e backlog sotto soglia sui saloni linked.
- Nessun errore runtime su colonne legacy in log produzione.
