# Grooming Revolution

SaaS gestionale multi-tenant per toelettatura (UI solo in italiano), basato su Next.js + Prisma + PostgreSQL.

## Stack implementato

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS + componenti stile shadcn/ui
- PostgreSQL + Prisma
- NextAuth Credentials + password hash `argon2`
- Multi-tenant (`salonId` in ogni query)
- Stripe (webhook endpoint e base billing page)
- Zod validation
- Security headers + proxy auth guard + login rate limit in-memory
- Audit log base

## Funzionalita principali coperte

- Auth: `/login`, `/register`
- Dashboard KPI: `/dashboard`
- Agenda FullCalendar: `/planner`
  - Click slot => flow nuovo cliente/esistente
  - Durata 15-300 min
  - Trattamenti multi-select
  - Note appuntamento visibili nella card evento
  - Modifica stato (completato/no-show/cancellato) e incasso rapido POS/CASH
- Clienti: `/clients`, `/clients/[id]`
  - note cliente
  - export CSV contatti
- Cani: `/dogs/[id]`
  - note cane + tag rapidi
  - storico completo paginato server-side
  - promemoria manuale WhatsApp (`wa.me`) e mailto
- Movimenti: `/payments`
  - filtri date + export CSV
- Import clienti: CSV e VCF (`.vcf`) da pagina `/clients`
- Impostazioni: `/settings`
  - dati attivita, orari/sovrapposizione, template messaggi, tag rapidi, trattamenti, staff
- Billing: `/billing`
- Legali: `/legal/privacy`, `/legal/terms`, `/legal/cookies`, `/legal/subprocessors`

## Regole business implementate

- Piano Free: max 100 clienti per tenant (`/api/clients` blocca oltre soglia)
- Max 4 cani per cliente (enforced server-side)
- Orari di lavoro e pause (JSON settings) validati in creazione/modifica appuntamento
- Sovrapposizioni appuntamenti bloccate di default (toggle in settings)
- Soft delete su cliente/cane/appuntamenti

## Modello dati Prisma

Definito in `prisma/schema.prisma` con entita:

- `Salon`, `User`
- `Client`, `Dog`, `QuickTag`, `DogQuickTag`
- `Treatment`, `Appointment`, `AppointmentTreatment`
- `Transaction`
- `AuditLog`

## Seed demo

`prisma/seed.ts` crea:

- salone demo
- owner + staff
- trattamenti default obbligatori
- quick tags demo
- clienti/cani/appuntamenti/transazioni demo

Credenziali demo:

- `owner@groomingrevolution.local`
- `Password123!`

## Env vars necessarie

Copia `.env.example` in `.env`.

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/grooming_revolution?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="cambia-questa-chiave-lunga"
STRIPE_SECRET_KEY="sk_test_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"
STRIPE_PRICE_ID_PRO="price_xxx"
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

## Comandi npm

Installazione:

```bash
npm install
```

Avvio DB locale con Docker:

```bash
docker compose up -d
```

Genera Prisma Client:

```bash
npm run prisma:generate
```

Applica migration su DB locale:

```bash
npx prisma migrate dev --name init
```

Seed demo:

```bash
npm run prisma:seed
```

Sviluppo:

```bash
npm run dev
```

Lint:

```bash
npm run lint
```

Build produzione:

```bash
npm run build
npm start
```

## Deploy Docker (base)

Esempio rapido:

```bash
docker compose up -d db
npm run prisma:generate
npx prisma migrate deploy
npm run build
npm start
```

Per produzione reale: usare immagine app dedicata, secrets manager e DB gestito.

## API principali

- `POST/GET /api/clients`
- `GET/PATCH/DELETE /api/clients/[id]`
- `GET /api/clients/export`
- `POST /api/clients/import` (CSV/VCF)
- `GET /api/clients/import-template`
- `POST/GET /api/dogs`
- `GET/PATCH/DELETE /api/dogs/[id]`
- `POST/GET/PATCH /api/appointments`
- `GET/PATCH /api/settings`
- `GET /api/payments/export`
- `POST /api/stripe/webhook`

## Checklist test manuale MVP

1. Registrazione nuovo tenant e login owner
2. Creazione cliente fino a 100 (101 deve fallire)
3. Creazione 5o cane su stesso cliente (deve fallire)
4. Creazione appuntamento da planner (nuovo cliente + cliente esistente)
5. Validazione fuori orario lavorativo (deve fallire)
6. Validazione sovrapposizione (deve fallire se overlap OFF)
7. Modifica appuntamento e cambio stato
8. Registrazione transazione POS/CASH su appuntamento completato
9. Export CSV clienti e movimenti
10. Reminder manuale WhatsApp e mailto dalla scheda cane
11. Verifica isolamento tenant con due account distinti
12. Verifica pagine legali e pagine protette da auth

## Nota legale

I testi legali inclusi sono placeholder ben formati ma **richiedono revisione legale professionale**.
